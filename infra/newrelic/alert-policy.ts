import { infraConfigResources } from "../infra-config";
import { newrelicConfigResources } from "./config";

console.log("======alert-policy.ts start======");

const idPrefix = `${infraConfigResources.idPrefix}`;

const testPolicy = new newrelic.AlertPolicy(
  `${infraConfigResources.idPrefix}-nr-test-policy-${$app.stage}`,
  {
    name: `${infraConfigResources.idPrefix}-nr-test-policy-${$app.stage}`,
    incidentPreference: "PER_POLICY",
  }
);

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
    // mutingRulesHandling: "DONT_NOTIFY_FULLY_MUTED_ISSUES",
    mutingRulesHandling: "NOTIFY_ALL_ISSUES",
    issuesFilter: {
      name: "workflow_filter",
      type: "FILTER",
      predicates: [
        {
          attribute: "labels.policyIds",
          operator: "EXACTLY_MATCHES",
          values: [
            testPolicy.id,
						albErrorPolicy.id
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
  {
    dependsOn: [
      newrelicConfigResources.slackChannel,
      testPolicy,
      albErrorPolicy
    ]
  }
);

export const alertPolicyResources = {
  testPolicy,
	albErrorPolicy,
	slackAlertWorkflow
};