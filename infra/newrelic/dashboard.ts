// import * as fs from "node:fs/promises";
// import { infraConfigResources } from "./infra-config";

// console.log("======newrelic.ts start======");

// const json = await fs.readFile(
//   "./infra/newrelic/dashboard.json",
//   "utf8"
// );

// // エクスポートJSONをそのまま適用
// const dashboard = new newrelic.OneDashboardJson(
//   `${infraConfigResources.idPrefix}-dashboard-${$app.stage}`,
//   {
//     json, // ここに JSON 文字列を渡すだけ
//     // 必要なら明示: accountId: Number(process.env.NEW_RELIC_ACCOUNT_ID),
//   }
// );

// infra/newrelic.ts
import * as fs from "fs";
import * as path from "path";
import { infraConfigResources } from "../infra-config";
import { newrelicConfigResources } from "./config";

console.log("======dashboard.ts start======");

const STAGE: string = $app.stage

// --- 1) ダッシュボード JSON の読み込み（CI/ローカル共通で動くやり方）
const dashboardPath = path.resolve(process.cwd(), "infra", "newrelic", "dashboard.json");
if (!fs.existsSync(dashboardPath)) {
  throw new Error(`dashboard.json not found at: ${dashboardPath}`);
}
const raw = JSON.parse(fs.readFileSync(dashboardPath, "utf-8"));

// ステージ別のフロントエンド用ホスト名を返す
function resolveFrontHost(stage: string): string {
  return stage === "production"
    ? "ishizawa.workspace.com"
    : `ishizawa.workspace.sst-test-${stage}.com`;
}

function renderStringTemplates(s: string, stage: string): string {
  let out = s;
  out = out.replaceAll("${$app.stage}", stage);     // 名前等の置換
  out = out.replaceAll("{{SST_STAGE}}", stage);     // 予備

  // NRQL: `tags.sst:stage`='xxx' を実ステージへ
  out = out.replace(/(`tags\.sst:stage`\s*=\s*')([^']*)(')/g,
    (_m, p1, _val, p3) => `${p1}${stage}${p3}`);

  // もし ':stage' というプレースホルダを使った場合の置換
  out = out.replace(/(':stage')/g, `'${stage}'`);

  // フロント用ホスト名のプレースホルダ
  out = out.replaceAll("${FRONT_HOST}", resolveFrontHost(stage));
  return out;
}

// ADDED: `${APM_GUID}` を差し込むユーティリティ
function injectApmGuid(obj: any, guid: string): any {
  function walk(n: any): any {
    if (Array.isArray(n)) return n.map(walk);
    if (n && typeof n === "object") {
      const out: any = {};
      for (const [k, v] of Object.entries(n)) {
        out[k] = typeof v === "string" ? v.replaceAll("${APM_GUID}", guid) : walk(v);
      }
      return out;
    }
    return n;
  }
  return walk(obj);
}

// --- 2) JSON 正規化: accountId/accountIds の上書き + guid だけ除去（idは残す！）+ 文字列テンプレ反映
function massageWithId(obj: any, ACCOUNT_ID: number, stage: string): any {
  function walk(o: any): any {
    if (Array.isArray(o)) return o.map(walk);
    if (o && typeof o === "object") {
      const out: any = {};
      for (const [k, v] of Object.entries(o)) {
        // guid は除去、id は残す（visualization.id を壊さない）
        if (k === "guid") continue;

        if (k === "accountId") {
          out[k] = ACCOUNT_ID;
          continue;
        }
        if (k === "accountIds") {
          out[k] = [ACCOUNT_ID];
          continue;
        }

        // 文字列ならテンプレ置換（name や nrqlQueries[].query など）
        if (typeof v === "string") {
          out[k] = renderStringTemplates(v, stage);
          continue;
        }

        out[k] = walk(v);
      }
      return out;
    }
    return o;
  }

  const first = walk(obj);

  // variables[].nrqlQuery.accountIds / accountId の補正（あれば）
  if (Array.isArray(first.variables)) {
    for (const v of first.variables) {
      if (v?.nrqlQuery && typeof v.nrqlQuery === "object") {
        v.nrqlQuery.accountIds = [ACCOUNT_ID];
        if ("accountId" in v.nrqlQuery) v.nrqlQuery.accountId = ACCOUNT_ID;

        // 文字列クエリのテンプレ置換も念のため
        if (typeof v.nrqlQuery.query === "string") {
          v.nrqlQuery.query = renderStringTemplates(v.nrqlQuery.query, stage);
        }
      }
    }
  }

  // pages[].widgets[].rawConfiguration.nrqlQueries[].query の安全補正（念押し）
  if (Array.isArray(first.pages)) {
    for (const p of first.pages) {
      if (Array.isArray(p.widgets)) {
        for (const w of p.widgets) {
          const rc = w?.rawConfiguration;
          if (rc && Array.isArray(rc.nrqlQueries)) {
            for (const q of rc.nrqlQueries) {
              if (q && typeof q === "object") {
                q.accountIds = [ACCOUNT_ID];
                if (typeof q.query === "string") {
                  q.query = renderStringTemplates(q.query, stage);
                }
              }
            }
          }
        }
      }
    }
  }

  return first;
}

// --- 3) accountId の解決（SST Secret から Output<number> を使って安全に解決）
// const cleaned = infraConfigResources.newRelicAccountIdSecret.apply((id) => {
//   const idNum = parseInt(String(id).trim().replace(/^["']|["']$/g, ""), 10);
//   if (Number.isNaN(idNum)) throw new Error(`NEW_RELIC_ACCOUNT_ID must be a number. Got: ${id}`);
//   return massageWithId(raw, idNum, STAGE);
// });

// ✅ guid(Output<string>) だけを渡す
const cleaned = $util.all([
  infraConfigResources.newRelicAccountIdSecret,
  newrelicConfigResources.apmEntity.guid
]).apply(([id, apmGuid]) => {
  const idNum = parseInt(String(id).trim().replace(/^["']|["']$/g, ""), 10);
  if (Number.isNaN(idNum)) throw new Error(`NEW_RELIC_ACCOUNT_ID must be a number. Got: ${id}`);

  const normalized = massageWithId(raw, idNum, STAGE);
  return injectApmGuid(normalized, apmGuid); // ← string を渡せる
});

console.log("===cleaned===", cleaned);

// --- 4) OneDashboardJson の作成（provider は newrelic: true ＋ 環境変数で自動解決）
const dashboard = new newrelic.OneDashboardJson(
  `${infraConfigResources.idPrefix}-new-relic-dashboard-${$app.stage}`,
  { json: cleaned.apply((o) => JSON.stringify(o)) }
);

export const dashboardUrl = dashboard.permalink;
