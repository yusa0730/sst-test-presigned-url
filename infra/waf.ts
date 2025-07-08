import { infraConfigResources } from "./infra-config";
import { env } from "./env";

const wafRules: aws.types.input.wafv2.WebAclRule[] = [];

// prd環境のみL3からのipアドレスからの通信のみを受け付けるルールを追加する
if ($app.stage === "production") {
  const excludedPaths = [
    { type: "EXACTLY", path: "/api/webhooks/incoming/sns" },
    { type: "STARTS_WITH", path: "/api/v1/public-contacts/" },
    { type: "EXACTLY", path: "/api/v1/contacts/unsubscribe" },
  ];

  const excludedStatements = excludedPaths.map((item) => (
    {
      byteMatchStatement: {
        fieldToMatch: { uriPath: {} },
        positionalConstraint: item.type,
        searchString: item.path,
        textTransformations: [{ priority: 0, type: "NONE" }],
      }
    }
  ));

  wafRules.push({
    name: `AllowExcludedPath`,
    priority: 0,
    action: { allow: {} },
    statement: {
      orStatement: {
        statements: excludedStatements
      }
    },
    visibilityConfig: {
      cloudwatchMetricsEnabled: true,
      metricName: `AllowExcludedPath`,
      sampledRequestsEnabled: true,
    },
  });

  const allowedIpSet = new aws.wafv2.IpSet(
    `${infraConfigResources.idPrefix}-allowed-ip-set-${$app.stage}`,
    {
      name: `${infraConfigResources.idPrefix}-allowed-ip-set-${$app.stage}`,
      description: "allowed ip list in production envrionment",
      scope: "CLOUDFRONT",
      ipAddressVersion: "IPV4",
      addresses: env.l3IpAddress.slice()
    },
    {
      provider: infraConfigResources.awsUsEast1Provider,
    },
  );

  wafRules.push(
    {
      name: "AllowSpecificIPOnly",
      priority: 8,
      action: {
        allow: {},
      },
      statement: {
        ipSetReferenceStatement: {
          arn: allowedIpSet.arn
        }
      },
      visibilityConfig: {
        cloudwatchMetricsEnabled: true,
        metricName: "AllowSpecificIPOnly",
        sampledRequestsEnabled: true,
      },
    },
    {
      name: "DenyAllExceptAllowedIPs",
      priority: 9,
      action: {
        block: {},
      },
      statement: {
        notStatement: {
          statements: [
            {
              ipSetReferenceStatement: {
                arn: allowedIpSet.arn,
              },
            },
          ],
        },
      },
      visibilityConfig: {
        cloudwatchMetricsEnabled: true,
        metricName: "DenyAllExceptAllowedIPs",
        sampledRequestsEnabled: true,
      },
    }
  );
}

// Wafカスタムルールを作成
const presignedUrlCdnWafCustomRule = new aws.wafv2.RuleGroup(
  `${infraConfigResources.idPrefix}-cdn-waf-custom-rule-${$app.stage}`,
  {
    name: `${infraConfigResources.idPrefix}-cdn-waf-custom-rule-${$app.stage}`,
    description: "Waf custom rule for presigned url cdn",
    capacity: 1,
    scope: "CLOUDFRONT",
    visibilityConfig: {
      cloudwatchMetricsEnabled: true,
      metricName: `${infraConfigResources.idPrefix}-waf-custom-rule-${$app.stage}`,
      sampledRequestsEnabled: true,
    },
    rules: [
      {
        name: "LimitPayloadTo10MB",
        priority: 0,
        action: {
          block: {}, // 10MBを超える場合はブロック
        },
        statement: {
          sizeConstraintStatement: {
            fieldToMatch: {
              body: {
                oversizeHandling: "CONTINUE",
              },
            },
            comparisonOperator: "GT",
            size: 10485760, // 10MB in bytes
            textTransformations: [
              {
                priority: 0,
                type: "NONE",
              },
            ],
          },
        },
        visibilityConfig: {
          cloudwatchMetricsEnabled: true,
          metricName: "LimitPayloadTo10MB",
          sampledRequestsEnabled: true,
        },
      },
    ],
  },
  {
    provider: infraConfigResources.awsUsEast1Provider,
  },
);

wafRules.push(
  {
    name: "LimitPayloadSize",
    priority: 10,
    overrideAction: {
      none: {},
    },
    statement: {
      ruleGroupReferenceStatement: {
        arn: presignedUrlCdnWafCustomRule.arn,
      },
    },
    visibilityConfig: {
      cloudwatchMetricsEnabled: true,
      metricName: "LimitPayloadSize",
      sampledRequestsEnabled: true,
    },
  },
  // AWSManagedRulesAmazonIpReputationList
  {
    name: "AWS-AWSManagedRulesAmazonIpReputationList",
    priority: 20,
    statement: {
      managedRuleGroupStatement: {
        vendorName: "AWS",
        name: "AWSManagedRulesAmazonIpReputationList",
      },
    },
    overrideAction: { none: {} },
    visibilityConfig: {
      sampledRequestsEnabled: true,
      cloudwatchMetricsEnabled: true,
      metricName: "awsIpReputationList",
    },
  },
  // AWSManagedRulesAnonymousIpList
  {
    name: "AWS-AWSManagedRulesAnonymousIpList",
    priority: 30,
    statement: {
      managedRuleGroupStatement: {
        vendorName: "AWS",
        name: "AWSManagedRulesAnonymousIpList",
      },
    },
    overrideAction: { none: {} },
    visibilityConfig: {
      sampledRequestsEnabled: true,
      cloudwatchMetricsEnabled: true,
      metricName: "awsAnonymousIpList",
    },
  },
)

// Wafを作成
const presignedUrlCdnWaf = new aws.wafv2.WebAcl(
  `${infraConfigResources.idPrefix}-cdn-waf-${$app.stage}`,
  {
    name: `${infraConfigResources.idPrefix}-cdn-waf-${$app.stage}`,
    description: "Waf for presigned url cdn",
    defaultAction: {
      allow: {},
    },
    scope: "CLOUDFRONT",
    visibilityConfig: {
      cloudwatchMetricsEnabled: true,
      metricName: `${infraConfigResources.idPrefix}-cdn-waf-${$app.stage}`,
      sampledRequestsEnabled: true,
    },
    rules: wafRules,
  },
  {
    provider: infraConfigResources.awsUsEast1Provider,
    dependsOn: [presignedUrlCdnWafCustomRule],
  },
);

export const wafResources = {
  presignedUrlCdnWaf,
};
