import { infraConfigResources } from "./infra-config";
import { wafResources } from "./waf";

// ログバケット
const presignedUrlCdnLogBucket = new sst.aws.Bucket(
  `${infraConfigResources.idPrefix}-cdn-log-bucket-${$app.stage}`,
  {
    transform: {
      bucket: {
        bucket: `${infraConfigResources.idPrefix}-cdn-log-bucket-${$app.stage}`,
        forceDestroy: true
      },
    },
  },
);

// aclの設定
new aws.s3.BucketOwnershipControls(
  `${infraConfigResources.idPrefix}-cdn-log-bucket-ownership-controls-${$app.stage}`,
  {
    bucket: presignedUrlCdnLogBucket.nodes.bucket.id,
    rule: {
      objectOwnership: "BucketOwnerPreferred",
    },
  },
);

const presignedUrlCdnBucket = new aws.s3.BucketV2(
  `${infraConfigResources.idPrefix}-cdn-bucket-${$app.stage}`,
  {
    bucket: `${infraConfigResources.idPrefix}-cdn-bucket-${$app.stage}`,
    forceDestroy: true
  },
);

new aws.s3.BucketCorsConfigurationV2(
  `${infraConfigResources.idPrefix}-cdn-bucket-cors-config-${$app.stage}`,
  {
    bucket: presignedUrlCdnBucket.id,
    corsRules: [
      {
          allowedOrigins: ["*"],
          allowedMethods: ["GET", "PUT", "POST", "HEAD"],
          allowedHeaders: ["*"],
          exposeHeaders: [],
          maxAgeSeconds: 0,
      }
    ],
  }
);

// オリジンアクセスコントロールS3
const presignedUrlCdnOriginAccessControl =
  new aws.cloudfront.OriginAccessControl(
    `${infraConfigResources.idPrefix}-cdn-origin-access-control-${$app.stage}`,
    {
      name: `${infraConfigResources.idPrefix}-cdn-origin-access-control-${$app.stage}`,
      description: `${infraConfigResources.idPrefix} presigned url cdn origin access control for ${$app.stage}`,
      originAccessControlOriginType: "s3",
      signingBehavior: "always",
      signingProtocol: "sigv4",
    },
    {
      dependsOn: [wafResources.presignedUrlCdnWaf],
    },
  );

export const s3Resources = {
  presignedUrlCdnBucket,
  presignedUrlCdnLogBucket,
  presignedUrlCdnOriginAccessControl,
};
