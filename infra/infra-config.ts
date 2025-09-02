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

const privateKey = new sst.Secret("ENCODED_PRIVATE_KEY");
$resolve(privateKey.value).apply((value) => {
  console.log("======privateKey=======");
  console.log(value)
  console.log("======privateKey=======");
});

const publicKey = new sst.Secret("ENCODED_PUBLIC_KEY");
$resolve(publicKey.value).apply((value) => {
  console.log("======publicKey=======");
  console.log(value)
  console.log("======publicKey=======");
});

const newRelicAccountId = await aws.ssm.getParameter({
  name: "/newrelic/accountId", // 取得したいパラメータ名
  withDecryption: true, // 暗号化されている場合は復号化
}).then(param => param.value);

const newRelicLicenseKey = await aws.ssm.getParameter({
  name: "/newrelic/passkey/license", // 取得したいパラメータ名
  withDecryption: true, // 暗号化されている場合は復号化
}).then(param => param.value);

const newRelicAccountIdSecret = new sst.Secret("NEW_RELIC_ACCOUNT_ID").value;
$resolve(newRelicAccountIdSecret).apply((value) => {
  console.log("======newRelicAccountIdSecret=======");
  console.log(value)
  console.log("======newRelicAccountIdSecret=======");
});

const newRelicSlackDestinationId = new sst.Secret("NEW_RELIC_SLACK_DESTINATION_ID").value;
$resolve(newRelicSlackDestinationId).apply((value) => {
  console.log("======newRelicSlackDestinationId=======");
  console.log(value)
  console.log("======newRelicSlackDestinationId=======");
});

const newRelicSlackChannelId = new sst.Secret("NEW_RELIC_SLACK_CHANNEL_ID").value;
$resolve(newRelicSlackChannelId).apply((value) => {
  console.log("======newRelicSlackChannelId=======");
  console.log(value)
  console.log("======newRelicSlackChannelId=======");
});

export const infraConfigResources = {
  idPrefix,
  mainRegion,
  domainName,
  hostedZone,
  awsUsEast1Provider,
  awsAccountId,
  privateKey,
  publicKey,
  newRelicAccountId,
  newRelicLicenseKey,
  newRelicAccountIdSecret,
  newRelicSlackDestinationId,
  newRelicSlackChannelId
};