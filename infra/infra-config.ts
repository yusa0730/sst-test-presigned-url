console.log("======infra-config.ts start======");

const idPrefix = "sst-test-presigned-url-bff"
const mainRegion = "ap-northeast-1" 
const domainName = "ishizawa-test.xyz";
const hostedZone = await aws.route53.getZone({
  name: `${domainName}.`,
});

// 北部バージニアプロバイダ
const awsUsEast1Provider = new aws.Provider(
  `${idPrefix}-aws-provider-${$app.stage}`,
  {
    region: "us-east-1",
  },
);

const awsAccountId = await aws.ssm.getParameter({
    name: "ACCOUNT_ID", // 取得したいパラメータ名
    withDecryption: true, // 暗号化されている場合は復号化
}).then(param => param.value);

console.log("====awsAccountId====", awsAccountId);

export const infraConfigResources = {
  idPrefix,
  mainRegion,
  domainName,
  hostedZone,
  awsUsEast1Provider,
  awsAccountId,
};