// 環境変数をここに定義していく
const ENV = {
  production: {
    l3IpAddress: [
      "106.133.48.78/32",
      "221.110.31.44/32"
    ],
  },
} as const;

export const ENV_KEYS = Object.keys(ENV);

// 環境変数はこの変数から利用する
export const env: (typeof ENV)[keyof typeof ENV] =
  ENV[`${$app.stage}` as keyof typeof ENV];
