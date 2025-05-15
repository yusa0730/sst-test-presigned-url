import { infraConfigResources } from "./infra-config";

console.log("======ecr.ts start======");

const repository = new aws.ecr.Repository(`${infraConfigResources.idPrefix}-ecr-repository-${$app.stage}`, {
  name: `${infraConfigResources.idPrefix}-ecr-repository-${$app.stage}`,
  forceDelete: true,
  imageScanningConfiguration: {
    scanOnPush: true
  },
  imageTagMutability: "MUTABLE",
});

new aws.ecr.LifecyclePolicy(
  `${infraConfigResources.idPrefix}-lifecycle-policy-${$app.stage}`,
  {
    repository: repository.name,
    policy: $jsonStringify({
      rules: [
        {
          rulePriority: 1,
          description: "Keep 14 days",
          selection: {
            tagStatus: "untagged",
            countType: "sinceImagePushed",
            countUnit: "days",
            countNumber: 14,
          },
          action: {
            type: "expire",
          },
        },
      ],
    }),
  }
);

export const ecrResources = {
  repository,
};