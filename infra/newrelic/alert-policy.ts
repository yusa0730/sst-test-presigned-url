import { infraConfigResources } from "../infra-config";
import { newrelicConfigResources } from "./config";

console.log("======alert-policy.ts start======");

const idPrefix = `${infraConfigResources.idPrefix}`;

const albErrorPolicy = new newrelic.AlertPolicy(
  `${idPrefix}-alert-alb-error-policy-${$app.stage}`,
  {
    name: `${idPrefix}-alert-alb-error-policy-${$app.stage}`,
    incidentPreference: "PER_POLICY",
  }
);

// 3) Workflow（このポリシーのIssueだけをSlackへ）
const slackAlertWorkflow = new newrelic.Workflow(
  `${idPrefix}-slack-alert-workflow-${$app.stage}`,
  {
    name: `${idPrefix}-slack-alert-workflow-${$app.stage}`,
    mutingRulesHandling: "DONT_NOTIFY_FULLY_MUTED_ISSUES",
    issuesFilter: {
      name: "workflow_filter",
      type: "FILTER",
      predicates: [
        {
          attribute: "labels.policyIds",
          operator: "EXACTLY_MATCHES",
          values: [
						albErrorPolicy.name
					],
        },
      ],
    },
    destinations: [
      {
        // ✅ 'type' は指定しない
        channelId: newrelicConfigResources.slackChannel.id,
				notificationTriggers: ["ACKNOWLEDGED", "ACTIVATED", "CLOSED", "INVESTIGATING"],
        updateOriginalMessage: true,
      },
    ],
  },
  { dependsOn: [newrelicConfigResources.slackChannel, albErrorPolicy] }
);

export const alertPolicyResources = {
	albErrorPolicy,
	slackAlertWorkflow
};