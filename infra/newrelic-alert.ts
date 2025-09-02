import { infraConfigResources } from "./infra-config";
// import { env } from "./env";

console.log("======newrelic-alert.ts start======");

const slackWebhookDest = new newrelic.NotificationDestination(
  `${infraConfigResources.idPrefix}-slack-webhook-destination-${$app.stage}`,
  {
    // accountId: env.newRelicAccountId,
    accountId: infraConfigResources.newRelicAccountIdSecret.apply(value => value),
    name: "newrelicアラート",
    type: "SLACK",
    properties: [],
  },
  {
    // import: env.slackDestinationId,
    import: process.env.NEW_RELIC_SLACK_DESTINATION_ID,
    ignoreChanges: ["*"],
    retainOnDelete: true,
  }
);

// 2) Channel（テンプレート）を作成（product: IINT = Workflows）
const slackChannel = new newrelic.NotificationChannel(
  `${infraConfigResources.idPrefix}-slack-channel-${$app.stage}`,
  {
    name: "slack-webhook-channel",
    type: "SLACK",                  // ← WEBHOOKではなくSLACK
    product: "IINT",                // Workflows 用。値は IINT でOK
    destinationId: slackWebhookDest.id, // 既存の Slack Destination の id
    properties: [
      {
        key: "channelId",
        // value: env.slackChannelId,
        value: infraConfigResources.newRelicSlackChannelId.apply(value => value),
        label: "Slack Channel",
        displayValue: "#alert"
      },
      // 例: "C0123456789"（SlackのチャンネルID）
    ],
  }
);

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
        channelId: slackChannel.id, 
        // updateOriginalMessage: true, // ← これで型エラーになる場合はいったんコメントアウト
      },
    ],
  },
  { dependsOn: [slackChannel, testPolicy] }
);
