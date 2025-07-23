import { infraConfigResources } from "./infra-config";

console.log("======iam.ts start======");
const vpcFlowLogRole = new aws.iam.Role(
  `${infraConfigResources.idPrefix}-flow-log-role-${$app.stage}`,
  {
    name: `${infraConfigResources.idPrefix}-flow-log-iar-${$app.stage}`,
    assumeRolePolicy: $jsonStringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "sts:AssumeRole",
          Principal: {
            Service: "vpc-flow-logs.amazonaws.com",
          },
        },
      ],
    }),
    inlinePolicies: [
      {
        name: `${infraConfigResources.idPrefix}-flow-log-iap-${$app.stage}`,
        policy: $jsonStringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams",
              ],
              Resource: ["*"],
            }
          ],
        }),
      },
    ],
  },
);

// タスク実行ロール
const taskExecutionRole = new aws.iam.Role(
  `${infraConfigResources.idPrefix}-task-execution-role-${$app.stage}`,
  {
    name: `${infraConfigResources.idPrefix}-task-execution-role-${$app.stage}`,
    assumeRolePolicy: $jsonStringify({
      Version: "2012-10-17",
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "ecs-tasks.amazonaws.com",
          },
        },
      ],
    }),
    managedPolicyArns: [
      "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    ],
    inlinePolicies: [
      {
        name: `${infraConfigResources.idPrefix}-task-execution-iap-${$app.stage}`,
        policy: $jsonStringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams",
                "ssm:GetParameters",
                "ssm:GetParameter",
              ],
              Resource: ["*"],
            }
          ],
        }),
      },
    ],
    tags: {
      Name: `${infraConfigResources.idPrefix}-task-execution-role-${$app.stage}`,
    },
  },
);

// Lambda@edgeのIAM Role
const edgeFunctionRole = new aws.iam.Role(
  `${infraConfigResources.idPrefix}-basic-lambda-iar-${$app.stage}`,
  {
    name: `${infraConfigResources.idPrefix}-auth-lambda-edge-iar-${$app.stage}`,
    managedPolicyArns: [
      "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    ],
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            Service: "lambda.amazonaws.com",
          },
          Action: "sts:AssumeRole",
        },
        {
          Effect: "Allow",
          Principal: {
            Service: "edgelambda.amazonaws.com",
          },
          Action: "sts:AssumeRole",
        },
      ],
    }),
  },
  {
    provider: infraConfigResources.awsUsEast1Provider,
  },
);

const testLambdaFunctionRole = new aws.iam.Role(
  `${infraConfigResources.idPrefix}-test-lambda-iar-${$app.stage}`,
  {
    name: `${infraConfigResources.idPrefix}-test-lambda-iar-${$app.stage}`,
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            Service: "lambda.amazonaws.com",
          },
          Action: "sts:AssumeRole",
        }
      ],
    }),
    managedPolicyArns: [
      "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    ],
    inlinePolicies: [
      {
        name: `${infraConfigResources.idPrefix}-test-lambda-iap-${$app.stage}`,
        policy: $jsonStringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams",
                "ssm:GetParameters",
                "ssm:GetParameter",
              ],
              Resource: ["*"],
            }
          ],
        }),
      },
    ],
    tags: {
      Name: `${infraConfigResources.idPrefix}-test-lambda-iar-${$app.stage}`,
    },
  }
);

export const iamResources = {
  vpcFlowLogRole,
  taskExecutionRole,
  edgeFunctionRole,
  testLambdaFunctionRole
};