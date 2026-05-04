# barhunters backend

FastAPI で実装する API サーバーです。

## 前提

- Python **3.10 以上**（[docs/setup/setup.md](../docs/setup/setup.md) と整合）
- **Windows** の場合は venv の有効化・ファイルコピー等が異なります。**[docs/setup/setup.md](../docs/setup/setup.md) の「Windows を使う場合」および §3.1 の Windows 例**を参照してください。

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

マイグレーション（**Alembic**）と開発ツールを使う場合は **`pip install -e ".[dev]"`** を実行してください。

## マイグレーション（Alembic）

**初回**またはリビジョンを取り込んだあと、`backend/` で次を実行します。

```bash
pip install -e ".[dev]"
alembic upgrade head
```

- **スキーマを作り直す（開発のみ）**: `local.db` を削除してから再度 `alembic upgrade head`（既存データは失われます）。
- **1 つ前に戻す**: `alembic downgrade -1`
- **テーブルと要件・Issue の対応**: [docs/schema_notes.md](docs/schema_notes.md)

PostgreSQL 等へ移行する際は、`UUID` 型への変更などを別リビジョンで扱う想定です（現状は SQLite 向けの型定義）。

## 起動

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API ドキュメント: <http://127.0.0.1:8000/docs>
- ヘルス: `GET /health`
- DB メタ（マイグレーション適用後）: `GET /api/db/meta` — Alembic リビジョンと主要テーブルの件数

## 開発用シード（任意）

```bash
cd backend
pip install -e ".[dev]"
alembic upgrade head
PYTHONPATH=. python scripts/seed_minimal.py
```

詳細は [scripts/seed_minimal.py](scripts/seed_minimal.py) を参照。

## Lint（任意）

```bash
pip install -e ".[dev]"
ruff check .
ruff format --check .
```
