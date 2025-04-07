import { infraConfigResources } from "./infra-config";
import { iamResources } from "./iam";

// Lambda@edgeの関数
const basicAuthLambdaEdge = new sst.aws.Function(
  `${infraConfigResources.idPrefix}-presigned-url-cdn-basic-auth-lambda-edge-${$app.stage}`,
  {
    handler: "functions/handler.handler",
    name: `${infraConfigResources.idPrefix}-presigned-url-cdn-basic-auth-lambda-edge-${$app.stage}`,
    runtime: "nodejs20.x",
    memory: "128 MB",
    timeout: "5 seconds",
    versioning: true,
    role: iamResources.edgeFunctionRole.arn,
    transform: {
      function: {
        environment: undefined,
      },
    },
  },
  {
    provider: infraConfigResources.awsUsEast1Provider,
  },
);

export const lambdaResources = {
  basicAuthLambdaEdge
};