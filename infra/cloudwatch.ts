import { infraConfigResources } from "./infra-config";

console.log("======cloudwatch.ts start======");

const vpcFlowLog = new aws.cloudwatch.LogGroup(
  `${infraConfigResources.idPrefix}-flow-log-group-${$app.stage}`,
  {
    name: `/vpc/${infraConfigResources.idPrefix}-flow-log-group-${$app.stage}`,
    retentionInDays: 7
  },
  {
    retainOnDelete: true,
  }
);

// Fargate用ロググループ
const ecsLog = new aws.cloudwatch.LogGroup(
  `${infraConfigResources.idPrefix}-ecs-log-group-${$app.stage}`,
  {
    name: `/aws/ecs/service/${infraConfigResources.idPrefix}-${$app.stage}`,
    retentionInDays: 7,
  },
  {
    retainOnDelete: true,     // Pulumiのスタック削除時にリソースも削除
  }
);

export const cloudwatchResources = {
  vpcFlowLog,
  ecsLog
};