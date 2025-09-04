import { infraConfigResources } from "../infra-config";
// import { env } from "./env";

console.log("======newrelic-config.ts start======");

console.log(process.env.NEW_RELIC_SLACK_DESTINATION_ID);
console.log(process.env.NEW_RELIC_SLACK_CHANNEL_ID);

console.log("======newrelic-config.ts start======");

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

export const newrelicConfigResources = {
  slackWebhookDest,
  slackChannel
};