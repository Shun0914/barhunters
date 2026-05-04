# barhunters backend

FastAPI で実装する API サーバーです。

## 前提

- Python **3.10 以上**（[docs/setup/setup.md](../docs/setup/setup.md) と整合）

## DB 方針（ローカル・スプリント1）

- **ローカル既定**: `DATABASE_URL` のデフォルトは **SQLite**（リポジトリ内の `backend/local.db` にファイルが作成されます）。追加インストール不要でスプリント1の疎通・最小スキーマ検証に使えます。
- **本番・共有環境**: Azure 上のマネージド DB 等へ移行する想定です。論理スキーマ・エンティティの正は [docs/requirements/04_データ要件.md](../docs/requirements/04_データ要件.md)。製品選定・接続文字列の運用は [docs/requirements/05_アーキテクチャ.md](../docs/requirements/05_アーキテクチャ.md) およびインフラ決定後のドキュメントに従います。
- **接続文字列の例**: PostgreSQL 等に切り替える場合は `.env` の `DATABASE_URL` を差し替え、`sqlalchemy` が解釈できる URL 形式にしてください。

## セットアップ

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e .
```

`.env.example` を `.env` にコピーし、必要に応じて値を変更します。

## 起動

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API ドキュメント: <http://127.0.0.1:8000/docs>
- ヘルス: `GET /health`

## Lint（任意）

```bash
pip install -e ".[dev]"
ruff check .
ruff format --check .
```
