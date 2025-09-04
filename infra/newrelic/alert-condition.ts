import { alertPolicyResources } from "./alert-policy";
import { infraConfigResources } from "../infra-config";

console.log("======alert-condition.ts start======");

const idPrefix = `${infraConfigResources.idPrefix}`;

/**
 * 1) ALB 500エラー（ELB由来）
 * Terraform:
 * - operator = "above_or_equals", threshold = 1
 * - aggregation_method = "event_timer", aggregation_window = 300, aggregation_timer = 300, slide_by = 60
 * - fill_option = "none"
 */
export const albElb5xxCondition = new newrelic.NrqlAlertCondition(
  `${idPrefix}-alb-500-alert-condition-${$app.stage}`,
  {
    accountId: $interpolate`${infraConfigResources.newRelicAccountIdSecret}`,
    policyId: alertPolicyResources.albErrorPolicy.id,
    name: "ALB 500エラー",
    type: "static",
    enabled: true,
    violationTimeLimitSeconds: 259200, // = 3日
    nrql: {
      query: 'FROM Metric SELECT sum(aws.applicationelb.HTTPCode_ELB_5XX_Count) FACET aws.applicationelb.LoadBalancer',
      dataAccountId: $interpolate`${infraConfigResources.newRelicAccountIdSecret}`,
      // evaluationOffset はTerraform例に無いので未指定
    },
    // Terraformの critical ブロックに対応
    critical: {
      operator: "above_or_equals",
      threshold: 1,
      thresholdDuration: 300,          // 秒 (= 5分)
      thresholdOccurrences: "ALL",     // = "all"
    },
    // Signal（集計）まわり
    fillOption: "none",
    aggregationWindow: 300,            // 秒
    aggregationMethod: "event_timer",
    aggregationTimer: 300,             // 秒
    slideBy: 60,                       // 秒
  },
  { dependsOn: [alertPolicyResources.albErrorPolicy] }
);

/**
 * 2) ALB Targetが500を10回（アプリ由来）
 * Terraform:
 * - operator = "above_or_equals", threshold = 10
 * - aggregation_* / fill_option 同様
 */
export const albTarget5xx10Condition = new newrelic.NrqlAlertCondition(
  `${idPrefix}-alb-target-5xx-10-alert-condition-${$app.stage}`,
  {
    accountId: $interpolate`${infraConfigResources.newRelicAccountIdSecret}`,
    policyId: alertPolicyResources.albErrorPolicy.id,
    name: "ALB Targetが500エラーを10回起こした場合アラート",
    type: "static",
    enabled: true,
    violationTimeLimitSeconds: 259200,
    nrql: {
      query: 'FROM Metric SELECT sum(aws.applicationelb.HTTPCode_Target_5XX_Count) FACET aws.applicationelb.LoadBalancer',
      dataAccountId: $interpolate`${infraConfigResources.newRelicAccountIdSecret}`,
    },
    critical: {
      operator: "above_or_equals",
      threshold: 10,
      thresholdDuration: 300,
      thresholdOccurrences: "ALL",
    },
    fillOption: "none",
    aggregationWindow: 300,
    aggregationMethod: "event_timer",
    aggregationTimer: 300,
    slideBy: 60,
  },
  { dependsOn: [alertPolicyResources.albErrorPolicy] }
);
