import { infraConfigResources } from "./infra-config";

console.log("======iam.ts start======");

// Lambda@edgeのIAM Role
const edgeFunctionRole = new aws.iam.Role(
  `${infraConfigResources.idPrefix}-basic-auth-lambda-edge-role-${$app.stage}`,
  {
    name: `${infraConfigResources.idPrefix}-presigned-url-cdn-basic-auth-lambda-edge-role-${$app.stage}`,
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

export const iamResources = {
  edgeFunctionRole
};