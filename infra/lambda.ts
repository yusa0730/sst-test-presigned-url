import { infraConfigResources } from "./infra-config";
import { iamResources } from "./iam";

// Lambda@edgeの関数
// const basicAuthLambdaEdge = new sst.aws.Function(
//   `${infraConfigResources.idPrefix}-cdn-basic-auth-lambda-edge-${$app.stage}`,
//   {
//     handler: "functions/handler.handler",
//     name: `${infraConfigResources.idPrefix}-cdn-basic-auth-lambda-edge-${$app.stage}`,
//     runtime: "nodejs20.x",
//     memory: "128 MB",
//     timeout: "5 seconds",
//     versioning: true,
//     role: iamResources.edgeFunctionRole.arn,
//     transform: {
//       function: {
//         environment: undefined,
//       },
//     },
//   },
//   {
//     provider: infraConfigResources.awsUsEast1Provider,
//   },
// );

const testLambda = new sst.aws.Function(
  `${infraConfigResources.idPrefix}-cdn-test-lambda-${$app.stage}`,
  {
    handler: "functions/test.handler",
    name: `${infraConfigResources.idPrefix}-test-lambda-${$app.stage}`,
    runtime: "nodejs20.x",
    memory: "128 MB",
    timeout: "5 seconds",
    versioning: false,
    role: iamResources.testLambdaFunctionRole.arn,
    layers: [
      "arn:aws:lambda:ap-northeast-1:451483290750:layer:NewRelicNodeJS22X:31",
    ],
    environment: {
      NEW_RELIC_LAMBDA_HANDLER: "bundle.handler",
      NEW_RELIC_ACCOUNT_ID: infraConfigResources.newRelicAccountId,
      NEW_RELIC_LICENSE_KEY: infraConfigResources.newRelicLicenseKey,
      NEW_RELIC_APP_NAME: "sst-test-presigned-url-production",
      NEW_RELIC_LAMBDA_EXTENSION_ENABLED: "true",
      NEW_RELIC_AI_MONITORING_ENABLED: "true",
      NEW_RELIC_USE_ESM: "true",
      PRIVATE_KEY: $resolve(infraConfigResources.privateKey.value).apply(value => value)
    },
  }
);

export const lambdaResources = {
  // basicAuthLambdaEdge,
  testLambda
};