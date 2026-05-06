# 開発環境セットアップ手順

このドキュメントでは、`barhunters` リポジトリを手元で動かすための手順を説明します。

## 前提条件

- **Git** が使えること
- モック閲覧のみ: 追加ツール不要（Python 3 があれば下記 HTTP サーバが使えます）
- **`frontend/` / `backend/` を追加した後**: Node.js（フロント）、Python 3.10+ 推奨（バックエンド）、DB はスプリント計画・Issue に従う（ローカルは SQLite 等の想定あり）

### Windows を使う場合（要約）

- **シェル**: **PowerShell** または **コマンド プロンプト**でよいです（以降のコマンドは PowerShell 想定で併記します）。
- **Python**: PATH に `python3` が無いことが多いです。**[python.org](https://www.python.org/downloads/)** のインストーラ（「Add python.exe to PATH」にチェック）か **`winget install Python.Python.3.12`** 等で **3.10 以上**を入れてください。バージョン付き起動は **`py -3.12 -m venv .venv`**（[Python Launcher for Windows](https://docs.python.org/3/using/windows.html#python-launcher-for-windows)）が便利です。
- **仮想環境の有効化**（`backend` で venv 作成後）:
  - PowerShell: `.\.venv\Scripts\Activate.ps1`
  - コマンド プロンプト: `.\.venv\Scripts\activate.bat`
  - 初回 PowerShell で「スクリプトが実行できない」と出る場合は、ユーザー単位で `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` を検討してください（社内ポリシーに従うこと）。
- **ファイルコピー**: `cp` の代わりに `Copy-Item .env.example .env`（PowerShell）または `copy .env.example .env`（cmd）。
- **API の URL**: `127.0.0.1` と `localhost` のどちらでも可です。CORS の `ALLOW_ORIGINS` に、フロントが実際に開くオリジン（例: `http://localhost:3000`）が含まれているか確認してください。
- **動作確認**: Windows 10 以降では **`curl` が使える**ことが多いです。使えなければブラウザで `http://127.0.0.1:8000/docs` や `/health` を開いて確認してください。

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

（Windows では `python -m http.server 8080` のことが多いです。）

ブラウザで `http://localhost:8080/dashboard/` を開いてください。

JSX をそのままブラウザが解釈しないファイルがある場合は、ビルド手順は将来 `frontend/` 側に定義します。

---

## 3. `frontend/`・`backend/` のローカル開発

**前提**: Python **3.10 以上**（`backend/pyproject.toml` の `requires-python`）、Node.js **20 以上推奨**（Next.js 16 想定）。

### 3.0 環境変数

| 場所 | ファイル | 内容 |
|------|----------|------|
| バックエンド | `backend/.env.example` → `backend/.env` | `ALLOW_ORIGINS`（CORS）、`DATABASE_URL`（既定 SQLite） |
| フロント | `frontend/.env.example` → `frontend/.env.local` | `NEXT_PUBLIC_API_URL`（API のベース URL、末尾スラッシュなし） |

### 3.1 バックエンド（FastAPI）

リポジトリルートから:

**macOS / Linux**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -U pip setuptools wheel
pip install -e .
pip install -e ".[dev]"           # Alembic 用
cp .env.example .env             # 初回のみ
alembic upgrade head             # DB スキーマ適用（初回・マイグレーション更新後）
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**スキーマをクリーンに作り直す場合（開発）**: `backend/local.db` を削除してから `alembic upgrade head` を再実行してください。

**Windows（PowerShell の例）**

```powershell
cd backend
py -3.12 -m venv .venv             # または: python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip setuptools wheel
pip install -e .
pip install -e ".[dev]"
Copy-Item .env.example .env        # 初回のみ
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

動作確認:

- `curl -s http://127.0.0.1:8000/health`
- `curl -s http://127.0.0.1:8000/api/hello`（DB に `SELECT 1` を実行したうえで JSON を返す）
- `curl -s http://127.0.0.1:8000/api/db/meta`（マイグレーション後: Alembic バージョンとテーブル件数。`notifications` を含む）
- ブラウザで `http://127.0.0.1:8000/docs`（OpenAPI）

Lint（任意）: `pip install -e ".[dev]"` のあと `ruff check .`。

**DB 方針**のメモは `backend/README.md` を参照。論理モデルは `docs/requirements/04_データ要件.md`、スプリント計画は `docs/planning/開発プランニング_3スプリント.md` および GitHub Issue に従ってください。

### 3.2 フロントエンド（Next.js）

**別ターミナル**で、API（§3.1）が起動している状態が望ましいです。

**macOS / Linux**

```bash
cd frontend
cp .env.example .env.local         # 初回のみ（API URL を変える場合は編集）
npm install
npm run dev
```

**Windows（PowerShell）**

```powershell
cd frontend
Copy-Item .env.example .env.local  # 初回のみ
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開き、ページ内に `GET /api/hello` の JSON が表示されれば、サーバー側フェッチによる疎通は成功しています（トップはサーバーコンポーネントで API を呼び出しています）。

その他の npm スクリプト: `npm run build` / `npm run lint` / `npm run format`

---

## トラブルシューティング（共通）

### `python3` が見つからない

- **macOS / Linux**: Homebrew 等で Python 3 を入れるか、`python` が Python 3 を指すか確認してください。
- **Windows**: **`py -0p`** でインストール済みバージョンを確認し、**`py -3.12`** のように起動するか、`python` で 3.10 以上になるか確認してください。

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
