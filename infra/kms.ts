import { infraConfigResources } from "./infra-config";

// KMSキー
const presignedUrlCdnBucketKms = new aws.kms.Key(
  `${infraConfigResources.idPrefix}-cdn-bucket-kms-key-${$app.stage}`,
  {
    description: `${infraConfigResources.idPrefix} presigned url cdn bucket kms key for ${$app.stage}`,
    policy: $jsonStringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["kms:*"],
          Resource: ["*"],
          Principal: {
            AWS: [
              `arn:aws:iam::${infraConfigResources.awsAccountId}:root`,
              `arn:aws:iam::${infraConfigResources.awsAccountId}:role/service-role/codebuild-sst-test-hono-docker-service-role`,
            ]
          },
        },
      ],
    }),
  },
);

//KMSキーエイリアス
const presignedUrlCdnBucketKmsAlias = new aws.kms.Alias(
  `${infraConfigResources.idPrefix}-cdn-bucket-kms-key-alias-${$app.stage}`,
  {
    name: `alias/${infraConfigResources.idPrefix}-cdn-bucket-kms-key-${$app.stage}`,
    targetKeyId: presignedUrlCdnBucketKms.id,
  },
);

export const kmsResources = {
  presignedUrlCdnBucketKms,
  presignedUrlCdnBucketKmsAlias,
};