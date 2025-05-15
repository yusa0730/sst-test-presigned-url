import { infraConfigResources } from "./infra-config";
import { vpcResources } from "./vpc";

console.log("======security-gourp.ts start======");

const cloudfrontPrefixListId = await aws.ec2.getManagedPrefixList({
  name: "com.amazonaws.global.cloudfront.origin-facing",
}).then((prefixList) => prefixList.id);

const albSecurityGroup = new aws.ec2.SecurityGroup(
  `${infraConfigResources.idPrefix}-alb-sg-${$app.stage}`,
  {
    name: `${infraConfigResources.idPrefix}-alb-sg-${$app.stage}`,
    vpcId: vpcResources.vpc.id,
    description: "alb security group",
    ingress: [
      {
        fromPort: 443,
        toPort: 443,
        protocol: aws.ec2.ProtocolType.TCP,
        prefixListIds: [cloudfrontPrefixListId],
        description: "From cloudfront to ALB",
      },
    ],
    egress: [
      {
        fromPort: 0,
        toPort: 0,
        protocol: "-1",
        cidrBlocks: ["0.0.0.0/0"],
      }
    ],
    tags: {
      Name: `${infraConfigResources.idPrefix}-alb-sg-${$app.stage}`,
    }
  },
)

// Fargate用セキュリティグループ
const ecsSecurityGroup = new aws.ec2.SecurityGroup(
  `${infraConfigResources.idPrefix}-ecs-sg-${$app.stage}`,
  {
    name: `${infraConfigResources.idPrefix}-ecs-sg-${$app.stage}`,
    vpcId: vpcResources.vpc.id,
    description: "bff fargate security group",
    ingress: [
      {
        fromPort: 3000,
        toPort: 3000,
        protocol: aws.ec2.ProtocolType.TCP,
        securityGroups: [albSecurityGroup.id],
        description: "From ALB to Fargate",
      },
    ],
    egress: [
      {
        fromPort: 0,
        toPort: 0,
        protocol: "-1",
        cidrBlocks: ["0.0.0.0/0"],
      }
    ],
    tags: {
      Name: `${infraConfigResources.idPrefix}-ecs-sg-${$app.stage}`,
    }
  },
);

export const securityGroupResources = {
  albSecurityGroup,
  ecsSecurityGroup,
}