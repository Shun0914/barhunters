# barhunters frontend

Next.js（App Router）の本番向け UI です。

## 前提

- Node.js **20 以上推奨**
- バックエンド API が起動していること（トップページはサーバー側で API を取得します）

## セットアップ

```bash
cp .env.example .env.local   # 初回。API の URL を変える場合は編集
npm install
npm run dev
```

Windows（PowerShell）では `Copy-Item .env.example .env.local` を使ってください。詳細は [docs/setup/setup.md](../docs/setup/setup.md) の §3.2 を参照してください。

[http://localhost:3000](http://localhost:3000) を開いてください。

## 環境変数

| 変数 | 説明 |
|------|------|
| `NEXT_PUBLIC_API_URL` | バックエンドのベース URL（既定 `http://127.0.0.1:8000`、末尾スラッシュなし） |

リポジトリ全体の手順は [docs/setup/setup.md](../docs/setup/setup.md) の §3.2 を参照してください。

## スクリプト

| コマンド | 用途 |
|----------|------|
| `npm run dev` | 開発サーバ（Turbopack） |
| `npm run build` | 本番ビルド |
| `npm run lint` | ESLint |
| `npm run format` | Prettier で整形 |
