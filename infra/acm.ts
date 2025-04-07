import { infraConfigResouces } from "./infra-config";

console.log("======alb acm.ts start======");

const albCertificate = new aws.acm.Certificate(
  `${infraConfigResouces.idPrefix}-alb-acm-${$app.stage}`,
  {
    domainName: infraConfigResouces.domainName,
    subjectAlternativeNames: [`*.alb.${infraConfigResouces.domainName}`],
    validationMethod: "DNS",
    tags: {
      Name: `${infraConfigResouces.idPrefix}-alb-acm-${$app.stage}`,
    }
  }
)

const records: aws.route53.Record[] = [];
albCertificate.domainValidationOptions.apply((domainValidationOptions) => {
  for (const dvo of domainValidationOptions) {
    console.log("=====dvo======", dvo);
    records.push(
      new aws.route53.Record(
        `${infraConfigResouces.idPrefix}-cname-record-${dvo.domainName}-${$app.stage}`,
        {
          allowOverwrite: true,
          name: dvo.resourceRecordName,
          records: [dvo.resourceRecordValue],
          ttl: 60,
          type: dvo.resourceRecordType,
          zoneId: infraConfigResouces.hostedZone.zoneId
        },
      ),
    );
  }
});

new aws.acm.CertificateValidation(
  `${infraConfigResouces.idPrefix}-alb-certificate-validation-${$app.stage}`,
  {
    certificateArn: albCertificate.arn,
    validationRecordFqdns: records.map((record) => record.fqdn)
  }
);

const cloudfrontCertificate = new aws.acm.Certificate(`${infraConfigResouces.idPrefix}-cloudfront-${$app.stage}`, {
  domainName: infraConfigResouces.domainName,
  subjectAlternativeNames: [`*.${infraConfigResouces.domainName}`],
  validationMethod: "DNS",
  tags: {
    Name: `${infraConfigResouces.idPrefix}-${$app.stage}`,
  },
}, {
    provider: infraConfigResouces.awsUsEast1Provider,
  },
);

// Route53にレコード追加
const cloudfrontRecord: aws.route53.Record[] = [];
cloudfrontCertificate.domainValidationOptions.apply((domainValidationOptions) => {
  for (const dvo of domainValidationOptions) {
    cloudfrontRecord.push(
      new aws.route53.Record(
        `${infraConfigResouces.idPrefix}-cloudfront-cname-record-${dvo.domainName}-${$app.stage}`,
        {
          allowOverwrite: true,
          name: dvo.resourceRecordName,
          records: [dvo.resourceRecordValue],
          ttl: 60,
          type: dvo.resourceRecordType,
          zoneId: infraConfigResouces.hostedZone.zoneId
        },
      ),
    );
  }
});

// ACM検証
new aws.acm.CertificateValidation(`${infraConfigResouces.idPrefix}-validation-cloudfront-${$app.stage}`, {
  certificateArn: cloudfrontCertificate.arn,
  validationRecordFqdns: cloudfrontRecord.map((r) => r.fqdn),
}, {
  provider: infraConfigResouces.awsUsEast1Provider,
});

export const acmResouces = {
  albCertificate,
  cloudfrontCertificate,
  records
};