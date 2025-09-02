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

console.log("======dashboard.ts start======");

// --- 1) ダッシュボード JSON の読み込み（CI/ローカル共通で動くやり方）
const dashboardPath = path.resolve(process.cwd(), "infra", "newrelic", "dashboard.json");
if (!fs.existsSync(dashboardPath)) {
  throw new Error(`dashboard.json not found at: ${dashboardPath}`);
}
const raw = JSON.parse(fs.readFileSync(dashboardPath, "utf-8"));

// --- 2) JSON 正規化: accountId/accountIds の上書き + guid だけ除去（idは残す！）
function massageWithId(obj: any, ACCOUNT_ID: number): any {
  function walk(o: any): any {
    if (Array.isArray(o)) return o.map(walk);
    if (o && typeof o === "object") {
      const out: any = {};
      for (const [k, v] of Object.entries(o)) {
        // ❌ 以前: (k === "guid" || k === "id") → visualization.id まで消えていた
        if (k === "guid") continue;                 // ← guid のみ除外
        if (k === "accountId") { out[k] = ACCOUNT_ID; continue; }
        if (k === "accountIds") { out[k] = [ACCOUNT_ID]; continue; }
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
      }
    }
  }
  return first;
}

// --- 3) accountId の解決（SST Secret から Output<number> を使って安全に解決）
const cleaned = infraConfigResources.newRelicAccountIdSecret.apply((id) => {
  const idNum = parseInt(String(id).trim().replace(/^["']|["']$/g, ""), 10);
  if (Number.isNaN(idNum)) throw new Error(`NEW_RELIC_ACCOUNT_ID must be a number. Got: ${id}`);
  return massageWithId(raw, idNum);
});

console.log("===cleaned===", cleaned);

// --- 4) OneDashboardJson の作成（provider は newrelic: true ＋ 環境変数で自動解決）
const dashboard = new newrelic.OneDashboardJson(
  "satto-workspace-dashboard",
  { json: cleaned.apply((o) => JSON.stringify(o)) }
);

export const dashboardUrl = dashboard.permalink;
