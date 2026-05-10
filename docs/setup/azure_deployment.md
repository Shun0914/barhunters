# barhunters — Azure デプロイ手順（コンソール・ポータル中心）

**barhunters** を Azure 上で検証／本番相当の環境に載せるための手順です。  
**Azure Portal・Cloud Shell・ローカルターミナル**での作業が多い前提で書いています（CI/CD は後追いで可）。

**先行事例（別リポジトリ）**: [project_class4 の setup / デプロイレポート](https://github.com/Shun0914/project_class4) の構成（App Service Python + App Service Node + Azure Database for MySQL、環境変数は App Service「構成」直書き、Next.js `standalone`）を踏襲できます。ローカルパス例:

- `project_class4/docs/setup/setup.md`
- `project_class4/docs/reports/2026-02-14_deployment_report.md`
- `project_class4/docs/setup/azure_deployment_guide.md`

**追跡用 Issue**: GitHub [#29](https://github.com/Shun0914/barhunters/issues/29)（Epic: デプロイと CI/CD）

---

## 1. 構成の目安（class4 と同型）

```
[GitHub]  —（任意）GitHub Actions—>  [App Service Python]  barhunters API
                                      [App Service Node.js] barhunters Web
                                              |
                                      [Azure Database for MySQL または PostgreSQL]
```

- **バックエンド**: FastAPI（`backend/`）。起動は `uvicorn`。
- **フロントエンド**: Next.js（`frontend/`）。**`output: "standalone"`** でビルドし、`node server.js` で起動（本リポジトリの `next.config.ts` に設定済み）。
- **DB**: ローカルは SQLite。Azure 上は **MySQL または PostgreSQL** を推奨（`DATABASE_URL` を差し替え）。要件上の論理モデルは `docs/requirements/04_データ要件.md`。

**本プロジェクトに無いもの（class4 との差）**

- Azure OpenAI / AI Foundry 連携は **スコープ外**（設定不要）。
- 認証は現状 **開発用**（`X-Dev-User-Id` / `DEV_DEFAULT_USER_ID`）。本番 IdP は別途。

---

## 2. Azure 側の準備（ポータル・コンソール）

### 2.1 リソースの作成

1. [Azure Portal](https://portal.azure.com/) にログイン。
2. 次を作成（名前はチームで統一。例はプレースホルダ）。
   - **App Service（Python 3.12）** … API 用
   - **App Service（Node 20 LTS）** … Next.js 用
   - **Azure Database for MySQL（Flexible）** または **Azure Database for PostgreSQL** … 本番 DB

### 2.2 データベース

1. DB サーバーの **ネットワーク**で、**バックエンド App Service の送信 IP**（または「Azure サービスに許可」等、方針に応じたルール）を許可。  
   - class4 と同様、**バックエンド App Service の「プロパティ」→「送信 IP アドレス」** を MySQL ファイアウォールに登録する方法が分かりやすいです（デプロイレポート参照）。
2. **Cloud Shell（Bash）** やローカル `mysql` / `psql` から接続し、**空のデータベース**を作成（例: `barhunters`）。

**接続文字列の例（MySQL + PyMySQL）**

```text
mysql+pymysql://<ユーザー>:<パスワード>@<サーバー名>.mysql.database.azure.com:3306/barhunters?charset=utf8mb4
```

パスワードに `@` などが含まれる場合は **URL エンコード**が必要です。

**PostgreSQL（SQLAlchemy 2）の例**

```text
postgresql+psycopg://<ユーザー>:<パスワード>@<サーバー名>.postgres.database.azure.com:5432/barhunters?sslmode=require
```

### 2.3 バックエンド App Service — アプリケーション設定

**「設定」→「構成」→「アプリケーション設定」** に例えば以下を追加（**実際の URL・シークレットに置き換え**）。

| 名前 | 説明 |
|------|------|
| `DATABASE_URL` | 上記 MySQL または PostgreSQL の接続文字列 |
| `ALLOW_ORIGINS` | フロントの本番オリジン（カンマ区切り）。例: `https://<web-app>.azurewebsites.net` |
| `DEV_DEFAULT_USER_ID` | （デモ継続時）シードで作ったユーザーの UUID。未設定でも「先頭ユーザー」にフォールバック |
| `POINT_AGGREGATE_STATUSES` | （任意）因果集計の対象ステータス。既定は `承認済` |

**「一般設定」→「スタートアップ コマンド」** の例:

```bash
cd /home/site/wwwroot && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

**デプロイ内容**: `backend/` が wwwroot に展開される想定（`app` パッケージがルートに来る配置）。ZIP デプロイや Actions の artifact 構成は class4 の `azure_deployment_guide.md` §5〜6 と同じ思想でよいです。

**依存関係**: App Service 上で MySQL を使う場合は **`pymysql` を入れる**必要があります。

```bash
pip install -e ".[mysql]"
```

（`pyproject.toml` の optional `mysql` を利用。PostgreSQL なら `.[postgres]`。）

### 2.4 フロントエンド App Service

1. **ビルド時**に API のベース URL を固定するため、**`NEXT_PUBLIC_API_URL`** を設定してから `npm run build` する（ローカルまたは CI）。  
   - 例: `https://<api-app>.azurewebsites.net`（末尾スラッシュなし）
2. ビルド成果物: Next **standalone** では、概ね以下を wwwroot に配置（class4 と同様）。
   - `.next/standalone/` 内の一式
   - `.next/static` → `.next/standalone/.next/static`
   - `public` → `.next/standalone/public`
3. **スタートアップ コマンド**:

```bash
cd /home/site/wwwroot && node server.js
```

4. **ランタイム環境変数**: standalone ではビルド時の `NEXT_PUBLIC_*` がバンドルに焼き付くため、**ビルドパイプライン側で Secret を渡す**運用が一般的です。

---

## 3. ローカル／コンソールでのビルド・手動デプロイ（ZIP）

CI をまだ置かない場合の例です。

### 3.1 バックエンド

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # または既存 venv
pip install -e ".[mysql]"   # または .[postgres]
# テスト用に backend だけ zip（app, alembic, pyproject.toml 等が含まれるよう注意）
zip -r ../barhunters-api.zip . -x ".venv/*" -x "**/__pycache__/*" -x "**/*.pyc"
```

Portal の App Service → **デプロイセンター** または **高度なツール → Kudu** から ZIP をアップロードする手順は class4 のドキュメントと同様です。

### 3.2 フロントエンド

```bash
cd frontend
export NEXT_PUBLIC_API_URL="https://<api-app>.azurewebsites.net"
npm ci
npm run build
# standalone 用に server.js があるディレクトリを zip（class4 のレポート記載の通り）
```

---

## 4. マイグレーション（Alembic）— 初回必須

**本番 `DATABASE_URL` に対して `alembic upgrade head` を 1 回以上実行**します。次のいずれかが現実的です。

1. **ローカル**から: `.env` または一時環境変数で本番 `DATABASE_URL` を指定し、`cd backend && alembic upgrade head`  
   - そのマシンの IP を DB ファイアウォールに入れる必要あり。
2. **Azure Cloud Shell** や **App Service SSH** 上で、同じリポジトリ／同じ `alembic.ini` を使って実行（Python + alembic のインストールが必要）。

マイグレーション適用後、必要なら **`scripts/seed_minimal.py`** 等で初期データ投入（本番ポリシーに合わせて判断）。

---

## 5. 動作確認

```bash
curl -sS "https://<api-app>.azurewebsites.net/health"
curl -sS "https://<api-app>.azurewebsites.net/api/db/meta"
```

ブラウザで `https://<web-app>.azurewebsites.net/` を開き、ダッシュボード・因果ストーリー・申請画面が API と通信できるか確認。  
CORS エラーが出る場合は **`ALLOW_ORIGINS`** にフロントのオリジンが含まれているか確認。

---

## 6. CI/CD（任意・次ステップ）

class4 と同様、**GitHub Actions + Publish Profile** で `main` プッシュ時にデプロイできます。

- Secrets: 各 App Service の **発行プロファイル**、`NEXT_PUBLIC_API_URL`（フロントビルド用）
- ワークフロー: Python ビルド → ZIP / `azure/webapps-deploy`、Node ビルド → standalone を zip

詳細は project_class4 の `azure_deployment_guide.md` §5 を流用し、**リポジトリ名・パス・環境変数名（`ALLOW_ORIGINS`）** だけ barhunters に合わせて書き換えてください。

---

## 7. チェックリスト（コピー用）

- [ ] DB 作成・ファイアウォール（App Service → DB）
- [ ] API App Service: `DATABASE_URL`, `ALLOW_ORIGINS`, スタートアップコマンド
- [ ] API: `pip` で `mysql` または `postgres` オプション込みインストール
- [ ] 初回 `alembic upgrade head`（本番 DB）
- [ ] （任意）シード・`DEV_DEFAULT_USER_ID`
- [ ] Web: `NEXT_PUBLIC_API_URL` 付きで `npm run build` → standalone をデプロイ
- [ ] Web App: `node server.js` スタートアップ
- [ ] ブラウザで画面＋ネットワークタブで API 成功を確認

---

## 8. 参考（リポジトリ内）

- [05_アーキテクチャ.md](../requirements/05_アーキテクチャ.md) … Azure コンポーネント案
- [03_非機能要件.md](../requirements/03_非機能要件.md) … NFR-O-02 環境分離
- [setup.md](./setup.md) … ローカル開発
