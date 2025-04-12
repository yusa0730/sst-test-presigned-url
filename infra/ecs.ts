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
              containerName: `${infraConfigResources.idPrefix}-service-${$app.stage}`,
              containerPort: 3000,
              targetGroupArn: albResources.targetGroup.arn,
            },
          ],
        },
        taskDefinition: {
          executionRoleArn: iamResources.taskExecutionRole.arn,
          containerDefinitions: $jsonStringify([
            {
              name: `${infraConfigResources.idPrefix}-service-${$app.stage}`,
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
                  "awslogs-stream-prefix": "backend",
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
                }
              ],
            },
          ]),
        }
      }
    });
  });

export const fargateResources = {
  cluster
};
