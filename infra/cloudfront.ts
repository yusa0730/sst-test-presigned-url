import { infraConfigResources } from "./infra-config";
import { s3Resources } from "./s3";
import { wafResources } from "./waf";
import { lambdaResources } from "./lambda";
import { acmResources } from "./acm";
import { albResources } from "./alb";

const vpcOriginForAlb = new aws.cloudfront.VpcOrigin(
  `${infraConfigResources.idPrefix}-vpc-origin-${$app.stage}`,
  {
    vpcOriginEndpointConfig: {
        arn: albResources.alb.arn,
        httpPort: 80,
        httpsPort: 443,
        name: `${infraConfigResources.idPrefix}-vpc-origin-${$app.stage}`,
        originProtocolPolicy: "https-only",
        originSslProtocols: {
            items: ["TLSv1.2"],
            quantity: 1,
        },
    },
    timeouts: {
      create: "300s",
      delete: "300s",
      update: "300s",
    },
    tags: {
        Name: `${infraConfigResources.idPrefix}-vpc-origin-${$app.stage}`,
    },
  }
);

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

const presignedUrlPublicKey = new aws.cloudfront.PublicKey(
  `${infraConfigResources.idPrefix}-cdn-public-key-${$app.stage}`,
  {
    name: `${infraConfigResources.idPrefix}-cdn-public-key-${$app.stage}`,
    comment: `${infraConfigResources.idPrefix} presigned url cdn public key for ${$app.stage}`,
    encodedKey: $resolve(infraConfigResources.publicKey.value).apply(value => value),
  },
);

const presignedUrlKeyGroup = new aws.cloudfront.KeyGroup(
  `${infraConfigResources.idPrefix}-cdn-key-group-${$app.stage}`,
  {
    name: `${infraConfigResources.idPrefix}-cdn-key-group-${$app.stage}`,
    comment: `${infraConfigResources.idPrefix} presigned url cdn key group for ${$app.stage}`,
    items: [presignedUrlPublicKey.id],
  }
);

const presignedUrlCdn = new sst.aws.Cdn(
  `${infraConfigResources.idPrefix}-cdn-${$app.stage}`,
  {
    // domain: "upload.ishizawa-test.xyz",
    domain: {
      name: infraConfigResources.domainName,
      dns: sst.aws.dns({
        zone: infraConfigResources.hostedZone.zoneId
      }),
      cert: acmResources.cloudfrontCertificate.arn
    },
    comment: `${infraConfigResources.idPrefix}-cdn-${$app.stage}`,
    origins: [
      {
        originId: `${infraConfigResources.idPrefix}-cdn-bucket-${$app.stage}`,
        originAccessControlId:
          s3Resources.presignedUrlCdnOriginAccessControl.id,
        domainName: s3Resources.presignedUrlCdnBucket.bucketDomainName,
      },
      {
        originId: albResources.alb.id,
        domainName: albResources.alb.dnsName,
        vpcOriginConfig: {
          vpcOriginId: vpcOriginForAlb.id,
          originKeepaliveTimeout: 10,
          originReadTimeout: 10,
        },
        customHeaders: [{
            name: "X-Custom-Header",
            value: `${infraConfigResources.idPrefix}-cloudfront`,
        }],
      }
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
      // lambdaFunctionAssociations: [
      //   {
      //     lambdaArn: $interpolate`${lambdaResources.basicAuthLambdaEdge.arn}:${lambdaResources.basicAuthLambdaEdge.nodes.function.version}`,
      //     eventType: "viewer-request",
      //   },
      // ],
      trustedKeyGroups: [presignedUrlKeyGroup.id],
    },
    orderedCacheBehaviors: [
      {
        allowedMethods: ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
        cachedMethods: ["GET", "HEAD"],
        minTtl: 0,
        defaultTtl: 3600,
        maxTtl: 86400,
        // AllViewerExceptHostHeader
        originRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac",
        // UseOriginCacheControlHeaders
        cachePolicyId: "83da9c7e-98b4-4e11-a168-04f0df8e2c65",
        responseHeadersPolicyId: presignedUrlCdnResponseHeadersPolicy.id,
        pathPattern: "/api/*",
        targetOriginId: albResources.alb.id,
        viewerProtocolPolicy: "https-only",
        compress: true,
      },
    ],
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
  `${infraConfigResources.idPrefix}-cdn-bucket-policy-test-${$app.stage}`,
  {
    bucket: s3Resources.presignedUrlCdnBucket.id,
    policy: $jsonStringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Deny",
          Principal: "*",
          Action: "s3:*",
          Resource: [
            $interpolate`${s3Resources.presignedUrlCdnBucket.arn}`,
            $interpolate`${s3Resources.presignedUrlCdnBucket.arn}/*`,
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
          Resource: $interpolate`${s3Resources.presignedUrlCdnBucket.arn}/*`,
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
          Resource: $interpolate`${s3Resources.presignedUrlCdnBucket.arn}/*`,
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

// // KMSキー
const presignedUrlCdnBucketKms = new aws.kms.Key(
  `${infraConfigResources.idPrefix}-cdn-bucket-kms-key-test-${$app.stage}`,
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

// //KMSキーエイリアス
const presignedUrlCdnBucketKmsAlias = new aws.kms.Alias(
  `${infraConfigResources.idPrefix}-cdn-bucket-kms-key-alias-${$app.stage}`,
  {
    name: `alias/${infraConfigResources.idPrefix}-cdn-bucket-kms-key-${$app.stage}`,
    targetKeyId: presignedUrlCdnBucketKms.id,
  },
);

new aws.s3.BucketServerSideEncryptionConfigurationV2(
  `${infraConfigResources.idPrefix}-cdn-bucket-server-side-encryption-${$app.stage}`,
  {
    bucket: s3Resources.presignedUrlCdnBucket.id,
    rules: [{
        applyServerSideEncryptionByDefault: {
            kmsMasterKeyId: presignedUrlCdnBucketKms.arn,
            sseAlgorithm: "aws:kms",
        },
        bucketKeyEnabled: true
    }],
  }
);

export const cloudfrontResources = {
  presignedUrlPublicKey,
  presignedUrlKeyGroup,
  presignedUrlCdn,
};