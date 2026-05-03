# 開発環境セットアップ手順

このドキュメントでは、`barhunters` リポジトリを手元で動かすための手順を説明します。

## 前提条件

- **Git** が使えること
- モック閲覧のみ: 追加ツール不要（Python 3 があれば下記 HTTP サーバが使えます）
- **`frontend/` / `backend/` を追加した後**: Node.js（フロント）、Python 3.10+ 推奨（バックエンド）、DB はスプリント計画・Issue に従う（ローカルは SQLite 等の想定あり）

---

## 1. リポジトリのクローン

```bash
git clone https://github.com/Shun0914/barhunters.git
cd barhunters
```

SSH を使う場合は GitHub の SSH URL に置き換えてください。

---

## 2. 現状できること: `dashboard/` モックの閲覧

本番実装は **`frontend/` / `backend/`** を主戦場とします。現時点でリポジトリに含まれる **`dashboard/`** は **静的モック**です（改修はプランニング上スコープ外の扱いで、参照・デザイン確認用）。

リポジトリルートで簡易サーバを立てます。

```bash
python3 -m http.server 8080
```

ブラウザで `http://localhost:8080/dashboard/` を開いてください。

JSX をそのままブラウザが解釈しないファイルがある場合は、ビルド手順は将来 `frontend/` 側に定義します。

---

## 3. `frontend/`・`backend/` 追加後（予定）

スプリント 1 の Issue（例: GitHub **#4** frontend 初期化、**#5** backend 初期化）でディレクトリが追加されたら、次を埋めます。

### 3.1 バックエンド（想定: FastAPI）

- `backend/` で仮想環境を作成し、`requirements.txt`（または `pyproject.toml`）をインストール
- `.env.example` を `.env` にコピーし、`DATABASE_URL` 等をローカル用に設定  
  - **DB の種類・接続先**は `docs/planning/開発プランニング_3スプリント.md` と **Issue #7** の方針に従う
- `uvicorn` 等で API を起動（正確なコマンドはその時点の README / `backend/` 内ドキュメント）

動作確認の例（実装後の目安）:

- `GET /health` などヘルスチェック
- `http://127.0.0.1:8000/docs`（OpenAPI）が開ける

### 3.2 フロントエンド（想定: Next.js）

- `frontend/` で `npm install`（または `pnpm install`）
- API のベース URL を `.env.local` 等で設定（例: `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`）
- `npm run dev` で開発サーバ

---

## トラブルシューティング（共通）

### `python3` が見つからない

- macOS では Homebrew 等で Python 3 を入れるか、`python` が Python 3 を指すか確認してください。

### ポートがすでに使われている

- `8080` の代わりに別ポート（例: `8081`）で `http.server` を起動してください。

### DB 接続エラー（backend 追加後）

- DB サーバが起動しているか、`.env` の `DATABASE_URL` が手元のユーザー・DB 名と一致しているか確認してください。方針は Issue / `docs/requirements/04_データ要件.md` と整合させます。

---

## 次のステップ

- [GitHub 開発ワークフロー](./github_workflow.md)
- [開発プランニング（3 スプリント）](../planning/開発プランニング_3スプリント.md)

---

## 参考リンク

- [FastAPI](https://fastapi.tiangolo.com/)
- [Next.js](https://nextjs.org/)
