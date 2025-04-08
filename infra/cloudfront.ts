import { infraConfigResources } from "./infra-config";
import { kmsResources } from "./kms";
import { s3Resources } from "./s3";
import { wafResources } from "./waf";
import { lambdaResources } from "./lambda";

// レスポンスヘッダーポリシー
const presignedUrlCdnResponseHeadersPolicy =
  new aws.cloudfront.ResponseHeadersPolicy(
    `${infraConfigResources.idPrefix}-cdn-response-headers-policy-${$app.stage}`,
    {
      name: `${infraConfigResources.idPrefix}-cdn-response-headers-policy-${$app.stage}`,
      securityHeadersConfig: {
        strictTransportSecurity: {
          override: true,
          accessControlMaxAgeSec: 31536000,
          includeSubdomains: true,
        },
        frameOptions: {
          override: true,
          frameOption: "DENY",
        },
        xssProtection: {
          override: true,
          modeBlock: true,
          protection: true,
        },
        contentTypeOptions: {
          override: true,
        },
        referrerPolicy: {
          override: true,
          referrerPolicy: "strict-origin-when-cross-origin",
        },
      },
    },
  );

// const presignedUrlCdnBucket = await aws.s3.getBucket({
//   bucket: `${infraConfigResources.idPrefix}-cdn-bucket-${$app.stage}`,
// });

// const presignedUrlCdnBucket = $util
//   .all([s3Resources.presignedUrlCdnBucket.nodes.bucket.bucketDomainName])
//   .apply(async ([bucketDomainName]) => {
//     return await aws.s3.getBucket({ bucket: bucketDomainName });
//   });

// cloudfront publickey登録
// const encodedKey = new sst.Secret("ENCODED_PUBLIC_KEY");
// const encodedKey = await aws.ssm.getParameter({
//   name: "/sst-test/cloudfront/production/publicKey",
//   withDecryption: true
// })

const public_key_secret = await aws.secretsmanager.getSecret({
    name: "public_key",
});

const encodedKey = await aws.secretsmanager.getSecretVersion({
    secretId: public_key_secret.id
});

// const encodedPublicKey = await aws.ssm.getParameter({
//   name: `/${infraConfigResouces.idPrefix}/encodedPublicKey`,
//   withDecryption: true, // 暗号化されている場合は復号化
// }).then(param => param.value);
console.log("====encoded key=====");
console.log(encodedKey.secretString);
console.log("====encoded key=====");

const presignedUrlPublicKey = new aws.cloudfront.PublicKey(
  `${infraConfigResources.idPrefix}-cdn-public-key-${$app.stage}`,
  {
    name: `${infraConfigResources.idPrefix}-cdn-public-key-${$app.stage}`,
    comment: `${infraConfigResources.idPrefix} presigned url cdn public key for ${$app.stage}`,
    encodedKey: encodedKey.secretString,
  },
);

// キーグループ
const presignedUrlKeyGroup = new aws.cloudfront.KeyGroup(
  `${infraConfigResources.idPrefix}-cdn-key-group-${$app.stage}`,
  {
    name: `${infraConfigResources.idPrefix}-cdn-key-group-${$app.stage}`,
    comment: `${infraConfigResources.idPrefix} presigned url cdn key group for ${$app.stage}`,
    items: [presignedUrlPublicKey.id],
  },
);

const presignedUrlCdn = new sst.aws.Cdn(
  `${infraConfigResources.idPrefix}-cdn-${$app.stage}`,
  {
    domain: "update.ishizawa-test.xyz",
    origins: [
      {
        originId: `${infraConfigResources.idPrefix}-cdn-bucket-${$app.stage}`,
        originAccessControlId:
          s3Resources.presignedUrlCdnOriginAccessControl.id,
        domainName: s3Resources.presignedUrlCdnBucket.nodes.bucket.bucketDomainName,
      },
    ],
    defaultCacheBehavior: {
      allowedMethods: [
        "GET",
        "HEAD",
        "OPTIONS",
        "PUT",
        "POST",
        "PATCH",
        "DELETE",
      ],
      cachedMethods: ["GET", "HEAD"],
      defaultTtl: 0,
      maxTtl: 0,
      minTtl: 0,
      forwardedValues: {
        cookies: {
          forward: "none",
        },
        headers: ["X-Authorization"],
        queryString: true,
      },
      targetOriginId: `${infraConfigResources.idPrefix}-cdn-bucket-${$app.stage}`,
      viewerProtocolPolicy: "redirect-to-https",
      responseHeadersPolicyId: presignedUrlCdnResponseHeadersPolicy.id,
      lambdaFunctionAssociations: [
        {
          lambdaArn: $interpolate`${lambdaResources.basicAuthLambdaEdge.arn}:${lambdaResources.basicAuthLambdaEdge.nodes.function.version}`,
          eventType: "viewer-request",
        },
      ],
      trustedKeyGroups: [presignedUrlKeyGroup.id],
    },
    transform: {
      distribution: {
        webAclId: wafResources.presignedUrlCdnWaf.arn,
        loggingConfig: {
          bucket: s3Resources.presignedUrlCdnLogBucket.domain,
          prefix: `${infraConfigResources.idPrefix}-cdn-${$app.stage}`,
        },
      },
    },
  },
);

// presigned url bucketにオリジンアクセスの許可をする
new aws.s3.BucketPolicy(
  `${infraConfigResources.idPrefix}-cdn-bucket-policy-${$app.stage}`,
  {
    bucket: s3Resources.presignedUrlCdnBucket.nodes.bucket.id,
    policy: $jsonStringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Deny",
          Principal: "*",
          Action: "s3:*",
          Resource: [
            $interpolate`${s3Resources.presignedUrlCdnBucket.nodes.bucket.arn}`,
            $interpolate`${s3Resources.presignedUrlCdnBucket.nodes.bucket.arn}/*`,
          ],
          Condition: {
            Bool: {
              "aws:SecureTransport": "false",
            },
          },
        },
        {
          Effect: "Allow",
          Action: "s3:GetObject",
          Resource: $interpolate`${s3Resources.presignedUrlCdnBucket.nodes.bucket.arn}/*`,
          Principal: {
            Service: "cloudfront.amazonaws.com",
          },
          Condition: {
            StringEquals: {
              "AWS:SourceArn": presignedUrlCdn.nodes.distribution.arn,
            },
          },
        },
        {
          Effect: "Allow",
          Action: "s3:PutObject",
          Resource: $interpolate`${s3Resources.presignedUrlCdnBucket.nodes.bucket.arn}/*`,
          Principal: {
            Service: "cloudfront.amazonaws.com",
          },
          Condition: {
            StringEquals: {
              "AWS:SourceArn": presignedUrlCdn.nodes.distribution.arn,
            },
          },
        },
      ],
    }),
  },
  {
    dependsOn: [presignedUrlCdn],
  },
);

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
            AWS: `arn:aws:iam::${infraConfigResources.awsAccountId}:root`,
          },
        },
        {
          Action: ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey*"],
          Effect: "Allow",
          Principal: {
            AWS: `arn:aws:iam::${infraConfigResources.awsAccountId}:root`,
            Service: "cloudfront.amazonaws.com",
          },
          Resource: "*",
          Sid: "AllowCloudFrontServicePrincipalSSE-KMS",
          Condition: {
            StringEquals: {
              "AWS:SourceArn": presignedUrlCdn.nodes.distribution.arn,
            },
          },
        }
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

// new aws.kms.KeyPolicy(
//   `${infraConfigResources.idPrefix}-cdn-bucket-kms-key-policy-${$app.stage}`,
//   {
//     keyId: kmsResources.presignedUrlCdnBucketKms.id,
//     policy: JSON.stringify({
//       Id: `${infraConfigResources.idPrefix}-cdn-bucket-kms-key-policy-${$app.stage}`,
//       Statement: [
//         {
//           Action: ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey*"],
//           Effect: "Allow",
//           Principal: {
//             AWS: `arn:aws:iam::${infraConfigResources.awsAccountId}:root`,
//             Service: "cloudfront.amazonaws.com",
//           },
//           Resource: "*",
//           Sid: "AllowCloudFrontServicePrincipalSSE-KMS",
//           Condition: {
//             StringEquals: {
//               "AWS:SourceArn": presignedUrlCdn.nodes.distribution.arn,
//             },
//           },
//         },
//       ],
//       Version: "2012-10-17",
//     }),
//   },
// );

// ssm登録
new aws.ssm.Parameter(
  `${infraConfigResources.idPrefix}-cdn-publicKey-${$app.stage}`,
  {
    name: `/${infraConfigResources.idPrefix}-cdn/publicKey/${$app.stage}`,
    type: "String",
    value: presignedUrlPublicKey.id,
  },
);

export const cloudfrontResources = {
  presignedUrlPublicKey,
  presignedUrlKeyGroup,
  presignedUrlCdn,
};