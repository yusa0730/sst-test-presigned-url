import { infraConfigResources } from "./infra-config";
import { kmsResources } from "./kms";
import { wafResources } from "./waf";

// アップロード用のS3バケットを作成
// const presignedUrlCdnBucket = new sst.aws.Bucket(
//   `${infraConfigResources.idPrefix}-${$app.stage}`,
//   {
//     transform: {
//       bucket: {
//         bucket: `${infraConfigResources.idPrefix}-cdn-bucket-${$app.stage}`,
//         serverSideEncryptionConfigurations: [
//           {
//             rules: [
//               {
//                 applyServerSideEncryptionByDefaults: [
//                   {
//                     sseAlgorithm: "aws:kms",
//                     kmsMasterKeyId: kmsResources.presignedUrlCdnBucketKms.arn,
//                   },
//                 ],
//               },
//             ],
//           },
//         ],
//       },
//       cors: {
//         bucket: `${infraConfigResources.idPrefix}-cdn-bucket-${$app.stage}`,
//         corsRules: [
//           {
//             allowedOrigins: ["*"],
//             allowedMethods: ["GET", "PUT", "POST", "HEAD"],
//             allowedHeaders: ["*"],
//             exposeHeaders: [],
//             maxAgeSeconds: 0,
//           },
//         ],
//       },
//     },
//   },
// );

// ログバケット
const presignedUrlCdnLogBucket = new sst.aws.Bucket(
  `${infraConfigResources.idPrefix}-cdn-log-bucket-${$app.stage}`,
  {
    transform: {
      bucket: {
        bucket: `${infraConfigResources.idPrefix}-cdn-log-bucket-${$app.stage}`,
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
  },
);

new aws.s3.BucketServerSideEncryptionConfigurationV2("example", {
    bucket: presignedUrlCdnBucket.id,
    rules: [{
        applyServerSideEncryptionByDefault: {
            kmsMasterKeyId: kmsResources.presignedUrlCdnBucketKms.arn,
            sseAlgorithm: "aws:kms",
        },
    }],
});

new aws.s3.BucketCorsConfigurationV2("example", {
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
});

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
