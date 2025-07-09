import { infraConfigResources } from "./infra-config";
import { vpcResources } from "./vpc";
import { cloudwatchResources } from "./cloudwatch";
import { iamResources } from "./iam";
import { securityGroupResources } from "./security-group";
import { albResources } from "./alb";
import { ecrResources } from "./ecr";

console.log("======ecs.ts start======");

// ECS Cluster
const cluster = new sst.aws.Cluster.v1(
	`${infraConfigResources.idPrefix}-cluster-${$app.stage}`,
	{
		vpc: {
			id: vpcResources.vpc.id,
			publicSubnets: vpcResources.privateSubnets.map((subnet) => subnet.id),
			privateSubnets: vpcResources.protectedSubnets.map((subnet) => subnet.id),
			securityGroups: [securityGroupResources.ecsSecurityGroup.id],
		},
		transform: {
			cluster: {
				name: `${infraConfigResources.idPrefix}-cluster-${$app.stage}`,
				settings: [
					{
							name: "containerInsights",
							value: "enhanced",
					},
				],
			},
		},
	}
);

ecrResources.repository.repositoryUrl.apply((url) => {
  // ECS Service
  cluster.addService(`${infraConfigResources.idPrefix}-service-${$app.stage}`, {
      cpu: "0.25 vCPU",
      memory: "0.5 GB",
      storage: "21 GB",
      architecture: "x86_64",
      scaling: {
        min: 2,
        max: 2,
        cpuUtilization: 70,
        memoryUtilization: 70,
      },
      transform: {
        image: {
          push: true,
          tags: [`${url}:latest`],
          // registries: [registryInfo],
          dockerfile: {
              location: "../../hono-app/Dockerfile", // Path to Dockerfile
          },
          context: {
              location: "../../hono-app", // Path to application source code
          },
        },
        service: {
          name: `${infraConfigResources.idPrefix}-service-${$app.stage}`,
          enableExecuteCommand: true,
          healthCheckGracePeriodSeconds: 180,
          forceNewDeployment: true,
          loadBalancers: [
            {
              containerName: `${infraConfigResources.idPrefix}-hono-app-${$app.stage}`,
              containerPort: 3000,
              targetGroupArn: albResources.targetGroup.arn,
            },
          ],
        },
        taskDefinition: {
          executionRoleArn: iamResources.taskExecutionRole.arn,
          containerDefinitions: $jsonStringify([
            {
              name: `${infraConfigResources.idPrefix}-hono-app-${$app.stage}`,
              image: `${infraConfigResources.awsAccountId}.dkr.ecr.${infraConfigResources.mainRegion}.amazonaws.com/${infraConfigResources.idPrefix}-ecr-repository-${$app.stage}:latest`,
              portMappings: [
                {
                  containerPort: 3000,
                  protocol: "tcp",
                },
              ],
              logConfiguration: {
                logDriver: "awslogs",
                options: {
                  "awslogs-region": infraConfigResources.mainRegion,
                  "awslogs-group": cloudwatchResources.ecsLog.id,
                  "awslogs-stream-prefix": "hono-app",
                },
              },
              environment: [
                {
                  name: "MODE",
                  value: $app.stage,
                },
                {
                  name: "PRIVATE_KEY",
                  value: $resolve(infraConfigResources.privateKey.value).apply(value => value),
                },
                {
                  name: "NEW_RELIC_HOST",
                  value: "collector.newrelic.com"
                },
                {
                  name: "NEW_RELIC_APP_NAME",
                  value: "sst-test-presigned-url-production"
                },
                {
                  name: "NEW_RELIC_LOG",
                  value: "stdout"
                },
              ],
              secrets: [
                {
                  name: "NEW_RELIC_LICENSE_KEY",
                  valueFrom: "arn:aws:ssm:ap-northeast-1:218317313594:parameter/newrelic/passkey/license"
                }
              ],
            },
            {
              name: `${infraConfigResources.idPrefix}-new-relic-container-${$app.stage}`,
              image: "newrelic/nri-ecs:1.12.18",
              logConfiguration: {
                logDriver: "awslogs",
                options: {
                  "awslogs-region": infraConfigResources.mainRegion,
                  "awslogs-group": cloudwatchResources.ecsTaskSideCarLog.id,
                  "awslogs-stream-prefix": "hono-app"
                }
              },
              environment: [
                {
                  name: "FARGATE",
                  value: "true"
                },
                {
                  name: "NRIA_IS_FORWARD_ONLY",
                  value: "true"
                },
                {
                  // アプリ側や他のコンテナのメタデータをそのまま受け渡す指定
                  name: "NRIA_PASSTHROUGH_ENVIRONMENT",
                  value: "ECS_CONTAINER_METADATA_URI,ECS_CONTAINER_METADATA_URI_V4,FARGATE"
                },
                {
                  // 独自属性（任意）：デプロイ手段などを付けたい時に利用
                  name: "NRIA_CUSTOM_ATTRIBUTES",
                  value: "{\"nrDeployMethod\":\"sst\"}"
                },
                {
                  name: "NRIA_OVERRIDE_HOST_ROOT",
                  value: ""
                },
              ],
              secrets: [
                {
                  name: "NRIA_LICENSE_KEY",
                  /* ライセンスキーを同じ SSM パラメータから参照 */
                  valueFrom: "arn:aws:ssm:ap-northeast-1:218317313594:parameter/newrelic/passkey/license"
                }
              ]
            }
          ]),
        }
      }
    });
  });

export const fargateResources = {
  cluster
};
