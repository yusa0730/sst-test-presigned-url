import { infraConfigResources } from "../infra-config";
import { newrelicConfigResources } from "./config";

console.log("======alert.ts start======");

// このテストIDでイベントを1件投げるとアラートが鳴る
const testId = `smoke-${$app.stage}`;

// 1) テスト用Alert Policy
const testPolicyName = `${infraConfigResources.idPrefix}-nr-test-policy-${$app.stage}`;
const testPolicy = new newrelic.AlertPolicy(
  `${infraConfigResources.idPrefix}-nr-test-policy-${$app.stage}`,
  {
    name: testPolicyName,
    incidentPreference: "PER_POLICY",
  }
);

// ← ここが修正版：valueFunction を削除し、terms[] だけで定義
const testNrql = new newrelic.NrqlAlertCondition(
  `${infraConfigResources.idPrefix}-nrql-test-${$app.stage}`,
  {
    policyId: testPolicy.id,
    name: `Test NRQL: TestAlert WHERE testId='smoke-${$app.stage}'`,
    type: "static",
    enabled: true,
    nrql: {
      query: `FROM TestAlert SELECT count(*) WHERE testId = 'smoke-${$app.stage}'`,
      evaluationOffset: 2, // 0-3 の範囲でOK。2〜3が無難
    },
    violationTimeLimitSeconds: 3600,
    terms: [
      {
        priority: "critical",
        operator: "above",
        threshold: 0,        // > 0 で違反（= 1件でも来たら鳴る）
        duration: 1,         // 評価期間（分）
        timeFunction: "any", // = AT_LEAST_ONCE
      },
    ],
  },
  { dependsOn: [testPolicy] }
);

const reqCountByUri = new newrelic.NrqlAlertCondition(
  `${infraConfigResources.idPrefix}-nrql-reqcount-${$app.stage}`,
  {
    policyId: testPolicy.id,
    name: `Test NRQL: TestAlert request.uri ${$app.stage}`,
    type: "static",
    enabled: true,
    nrql: {
      query: "FROM Transaction SELECT count(*) FACET request.uri",
      evaluationOffset: 1,
    },
    violationTimeLimitSeconds: 3600,
    critical: {
      operator: "above",
      threshold: 1,
      thresholdDuration: 60,          // 60秒で評価
      thresholdOccurrences: "AT_LEAST_ONCE",    // (= any)
    },
  },
  { dependsOn: [testPolicy] }
);

// 3) Workflow（このポリシーのIssueだけをSlackへ）
const testWorkflow = new newrelic.Workflow(
  `${infraConfigResources.idPrefix}-workflow-nr-test-${$app.stage}`,
  {
    name: `${infraConfigResources.idPrefix}-workflow-nr-test-${$app.stage}`,
    mutingRulesHandling: "NOTIFY_ALL_ISSUES",
    issuesFilter: {
      name: "only-test-policy",
      type: "FILTER",
      predicates: [
        {
          attribute: "accumulations.policyName",
          operator: "EXACTLY_MATCHES",
          values: [testPolicyName],
        },
      ],
    },
    destinations: [
      {
        // ✅ 'type' は指定しない
        channelId: newrelicConfigResources.slackChannel.id,
        // updateOriginalMessage: true, // ← これで型エラーになる場合はいったんコメントアウト
      },
    ],
  },
  { dependsOn: [newrelicConfigResources.slackChannel, testPolicy] }
);
