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

// infra/newrelic/dashboard.ts
import * as fs from "fs";
import * as path from "path";
import { infraConfigResources } from "./infra-config";

// Provider: accountId も Output<number> のまま渡せます
const nr = new newrelic.Provider("nr", {
  accountId: infraConfigResources.newRelicAccountIdSecret.value,
  apiKey: infraConfigResources.newRelicLicenseKeySecret.value,
  region: "US",
});

console.log("=====env======");
console.log(process.env.NEW_RELIC_ACCOUNT_ID);
console.log(process.env.NEW_RELIC_API_KEY);
console.log("======env=====");

// リポジトリルート基準で JSON を読む（ここは同期OK）
// const dashboardPath = path.resolve(__dirname, "newrelic", "dashboard.json");
const dashboardPath = path.resolve(process.cwd(), "infra", "newrelic", "dashboard.json");
if (!fs.existsSync(dashboardPath)) {
  throw new Error(`dashboard.json not found at: ${dashboardPath}`);
}
const raw = JSON.parse(fs.readFileSync(dashboardPath, "utf-8"));

/** JSON 正規化ロジック（同期関数）。
 *  引数 ACCOUNT_ID を使って accountId(s) を上書きし、guid/id を除去します。
 */
function massageWithId(obj: any, ACCOUNT_ID: number): any {
	console.log("====ACCOUNT_ID===", ACCOUNT_ID);
  function walk(o: any): any {
    if (Array.isArray(o)) return o.map(walk);
    if (o && typeof o === "object") {
      const out: any = {};
      for (const [k, v] of Object.entries(o)) {
        if (k === "guid" || k === "id") continue; // 既存の識別子は削除
        if (k === "accountId") {
          out[k] = ACCOUNT_ID; // number
          continue;
        }
        if (k === "accountIds") {
          out[k] = [ACCOUNT_ID]; // widget 側は配列
          continue;
        }
        out[k] = walk(v);
      }
      return out;
    }
    return o;
  }

  const first = walk(obj);

  // variables[].nrqlQuery.accountIds は "単数 number" を要求するため矯正
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

// cleaned は Output<any> として作る（accountId の解決後に生成）
const cleaned = infraConfigResources.newRelicAccountIdSecret.value.apply((id) => {
  const idNum = parseInt(String(id).trim().replace(/^["']|["']$/g, ""), 10);
  if (Number.isNaN(idNum)) {
    throw new Error(`NEW_RELIC_ACCOUNT_ID must be a number. Got: ${id}`);
  }
  return massageWithId(raw, idNum);
});

// OneDashboardJson は Input<string> を受け取れるので、JSON 文字列化も apply 内で
// const dashboard = new newrelic.OneDashboardJson(
//   "satto-workspace-dashboard",
//   {
//     json: cleaned.apply((o) => JSON.stringify(o)),
//   },
//   { provider: nr }
// );

const dashboard = new newrelic.OneDashboardJson(
  "satto-workspace-dashboard",
  {
    json: cleaned.apply((o) => JSON.stringify(o)),
  }
);

export const dashboardUrl = dashboard.permalink;
