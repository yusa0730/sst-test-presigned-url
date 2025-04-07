/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "sst-test-presigned-url",
      home: "aws",
    };
  },
  async run() {
    await import('./infra/infra-config');
    await import('./infra/iam');
    // await import('./infra/acm');
    await import('./infra/kms');
    await import('./infra/waf');
    await import('./infra/s3');
    await import('./infra/guardduty');
    await import('./infra/lambda');
    await import('./infra/cloudfront');
  }
});
