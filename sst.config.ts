/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "sst-test-presigned-url",
      home: "aws",
      providers: {
        aws: true,
        // New Relic: 環境変数から認証するなら true でOK
        // （NEW_RELIC_API_KEY / NEW_RELIC_ACCOUNT_ID / NEW_RELIC_REGION）
        // newrelic: true,
        // もしくはバージョン固定: { version: "5.49.0" }
        // or 明示設定: { accountId: 12345678, region: "US" } など
        newrelic: {
          accountId: process.env.NEW_RELIC_ACCOUNT_ID,
          apiKey: process.env.NEW_RELIC_API_KEY,
          region: process.env.NEW_RELIC_REGION,
        }
      },
    };
  },
  async run() {
    await import('./infra/infra-config');
    await import('./infra/iam');
    await import('./infra/cloudwatch');
    await import('./infra/vpc');
    await import('./infra/security-group');
    await import('./infra/acm');
    await import('./infra/waf');
    await import('./infra/s3');
    await import('./infra/guardduty');
    await import('./infra/lambda');
    await import('./infra/alb');
    await import('./infra/ecr');
    await import('./infra/ecs');
    await import('./infra/cloudfront');
    await import('./infra/newrelic');
  }
});
