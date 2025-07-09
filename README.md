### CloudFront 署名付き URL のテスト

ここでは プライベートオブジェクトを CloudFront 経由で配信する ための署名付き URL を作成し、必要であれば同じキーにファイルを PUT アップロード する方法を示します。

❗ 注意CloudFront の署名付き URL は原則 GET / HEAD リクエストを想定しています。PUT でアップロードを行う場合は次の要件をすべて満たしてください。

1. キャッシュビヘイビアの Allowed Methods に PUT を含める。

2. OAC (Origin Access Control) もしくは OAI を使い、S3 バケットに s3:PutObject を許可する。
3. S3 バケットの CORS で PUT を許可する。

単純なアップロード用途なら S3 プリサインド URL (PUT) を利用するほうが手軽です。

1. ダウンロード用の署名付き URL を生成

aws cloudfront sign \ 
  --url https://<YOUR-DOMAIN>/upload/Cat03.jpg \     # オブジェクトの URL
  --key-pair-id <KEY_PAIR_ID> \                      # CloudFront キーペア ID
  --private-key file:///path/to/private_key.pem \    # 対応する秘密鍵 (PEM)
  --date-less-than "$(date -u -v+7d +%Y-%m-%dT%H:%M:%SZ)"  # 7 日後に失効

| オプション          | 説明                                         |
|--------------------|----------------------------------------------|
| `--url`            | 署名対象オブジェクトの完全 URL               |
| `--key-pair-id`    | CloudFront キーペア ID（コンソール → Security）|
| `--private-key`    | 上記キーペアに対応する **秘密鍵ファイル (PEM)**|
| `--date-less-than` | 有効期限（ISO-8601, UTC）                    |

出力例：

```
https://<YOUR-DOMAIN>/upload/Cat03.jpg?Expires=1752653507&Signature=...&Key-Pair-Id=K1SJ677WMNM57W
```

この URL は有効期限内に限りダウンロードが可能です。

2. (オプション) PUT アップロードを実行

前述の前提条件を満たしている場合のみ実行してください。

```
curl -X PUT -T "Cat03.jpg" \ 
  -H "Content-Type: image/jpeg" \ 
  "https://<YOUR-DOMAIN>/upload/Cat03.jpg?Expires=1752653507&Signature=...&Key-Pair-Id=K1SJ677WMNM57W"
```

| 引数                       | 意味                              |
|----------------------------|-----------------------------------|
| `-T "Cat03.jpg"`           | ローカルのアップロード対象ファイル |
| `-H "Content-Type: image/jpeg"` | 適切な MIME タイプを指定          |

HTTP 200 が返ればアップロード成功です。失敗する場合は CloudFront 設定やバケットポリシーを確認してください。

