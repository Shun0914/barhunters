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

### 2.2 データベース（サーバー作成 → ネットワーク → 空の DB 名）

ここでやることは **3 つだけ**です。

| 順番 | やること |
|------|----------|
| ① | **DB サーバー**（MySQL または PostgreSQL のマネージド）を Azure 上に用意する（まだ無い場合はポータルで新規作成）。 |
| ② | **ネットワーク／ファイアウォール**で、後から API を載せる **App Service からの接続**（と、マイグレーションを流す **自分の PC や Cloud Shell** が必要ならその IP）を許可する。 |
| ③ | サーバー上に **論理データベース**（スキーマの入れ物）を 1 つ作る。名前の例: `barhunters`。中身のテーブルは後で Alembic が作る。 |

---

#### ① DB サーバーをまだ持っていない場合（ポータルで新規）

**MySQL（Flexible Server）の例**

1. ポータルで **「リソースの作成」** → **「Azure Database for MySQL」**（フレキシブル サーバー）を選択。
2. **リソースグループ**・**サーバー名**（例: `barhunters-mysql-xx`）・**リージョン**・**MySQL バージョン** を指定。
3. **管理者ユーザー名** と **パスワード** を決める（後で `DATABASE_URL` に使う。**必ずメモ**）。
4. **ネットワーク**では、まずは次のどちらかで進めるのが分かりやすいです。
   - **パブリック アクセス**を有効にし、後述の **②** で IP を足していく（class4 と同じ考え方）。
   - またはチーム方針で **VNet 統合**のみ（その場合は App Service 側も同じ VNet に載せる必要あり。初心者向けではパブリック + IP 制限の方が手順が追いやすいことが多い）。
5. **作成**まで完了させる。

**PostgreSQL（Flexible Server）** も同様に **「Azure Database for PostgreSQL」** からフレキシブル サーバーを作成。SSL 必須になるので接続文字列に `sslmode=require` を付ける（下記例参照）。

すでに **学校・チームで用意された MySQL/PostgreSQL サーバー** があるなら、① はスキップして **②③** だけ行う。

---

#### ② ファイアウォール（誰から DB に繋いでよいか）

**バックエンド App Service から接続する**ため、MySQL/PostgreSQL の **「ネットワーク」** に **App Service の送信元 IP** を入れる方法が class4 と同じで分かりやすいです。

1. **API 用 App Service**（Python を載せる予定のもの）をポータルで開く。
2. 左メニュー **「設定」→「プロパティ」**（または類似の場所）で **「送信 IP アドレス」**（Outbound IP）を確認。複数行ある場合は **その一覧をすべて** DB 側の許可ルールに入れるか、Azure の案内に従って範囲指定する。
3. **MySQL（または PostgreSQL）サーバー**を開き、**「設定」→「ネットワーク」**。
4. **「+ ファイアウォール規則の追加」**（名称はポータル表示に合わせる）で、上記 IP を **開始 IP / 終了 IP** に設定して保存。

**マイグレーションをローカル PC から流す**場合は、その PC のグローバル IP も同様に 1 件追加する（作業が終わったら削除してよい）。

**Azure Database for PostgreSQL** では画面名が **「ネットワーク」／「ファイアウォール規則」** などになるが、考え方は同じ（接続元 IP の許可）。

---

#### ③ 論理データベース `barhunters` を作る（空で OK）

**方法 A — ポータルだけ（おすすめ・MySQL/PostgreSQL 両方）**

1. DB サーバーのリソース画面を開く。
2. 左メニューに **「データベース」**（Databases）があれば **「+ 追加」** で名前 `barhunters` を作成。  
   ※メニューが無い・作れない場合は **方法 B**。

**方法 B — Cloud Shell またはローカル CLI**

- **MySQL**: ② で **Cloud Shell 用の IP** も許可したうえで、ポータル上部 **Cloud Shell（Bash）** を開き、接続文字列のホスト名・管理者ユーザーで接続（[class4 の手順 2.3](https://github.com/Shun0914/project_class4/blob/main/docs/setup/azure_deployment_guide.md#23-%E3%83%87%E3%83%BC%E3%82%BF%E3%83%99%E3%83%BC%E3%82%B9%E3%82%92%E4%BD%9C%E6%88%90) と同型）。

```bash
mysql -h <サーバー名>.mysql.database.azure.com -u <管理者名> -p
```

```sql
CREATE DATABASE barhunters CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SHOW DATABASES;
```

- **PostgreSQL**: `psql` で接続し、`CREATE DATABASE barhunters;`

---

#### 接続情報のメモ場所

- MySQL: サーバー画面 **「設定」→「接続文字列」** でホスト名・ポート・ユーザー名を確認。
- パスワードはポータルでは再表示されないため、**作成時にメモしたもの**を使う。

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

## 6. CI/CD — デプロイセンター（GitHub Actions）から進める

**前回 class4 と同じやり方**に寄せるなら、**ZIP 手動ではなく**、App Service の **デプロイセンター**で GitHub と繋ぎ、**YAML は Azure 側のウィザードがリポジトリに追加する**（またはプレビューして保存）流れが本体です。

### 6.0 このリポジトリで先に用意しておくもの

- **`backend/requirements.txt`** … Azure のビルド（Oryx）や `pip install -r backend/requirements.txt` 型のワークフロー向け。**デプロイセンターを回す前に `main` に入れておく**と失敗が減ります。
- **App Service の「構成」** … `DATABASE_URL`・`ALLOW_ORIGINS`・スタートアップコマンド（§2.3）は **ポータル側**に入れたまま。YAML にパスワードを書かない。

### 6.1 API（Python）— デプロイセンターの手順

1. [Azure Portal](https://portal.azure.com/) で **barhunters 用の API App Service** を開く。
2. 左メニュー **「デプロイセンター」** を開く。
3. **「設定」** で **ソース** に **GitHub** を選ぶ。初回は **GitHub へのアクセス承認**（組織／リポジトリの許可）を済ませる。
4. **組織・リポジトリ・ブランチ**（例: `main`）を選ぶ。
5. **ビルド プロバイダー** で **GitHub Actions** を選ぶ。
6. **ランタイム**: **Python 3.12**（プロジェクトと合わせる）。
7. ウィザードに **アプリケーションのルート** や **ワークディレクトリ** があれば **`backend`** を指定する（**モノレポ**のため。項目が無い場合は §6.3 で YAML を直す）。
8. **保存**／**完了**。ポータルが **生成されるワークフローのプレビュー**を出したら内容を確認し、指示どおり **GitHub 側にワークフローファイルが追加される**（または PR ができる）まで進める。
9. **GitHub** の **Actions** タブでワークフローが走る。**失敗したら** ログを開き、次を確認する（§6.3）。
10. **Secrets**: デプロイセンター完了後、リポジトリの **Settings → Secrets and variables → Actions** に **発行プロファイル**用の Secret が増えていることが多い。ワークフロー内の `publish-profile: ${{ secrets.XXXX }}` と **名前が一致**しているか確認する。

**API のスタートアップコマンド**（§2.3 の例）は、デプロイセンターとは別に **構成 → 一般設定** で入れておく。

### 6.2 フロント（Node / Next.js standalone）— デプロイセンター＋追補

1. **フロント用の App Service** を開き、同様に **デプロイセンター**で **GitHub**・**GitHub Actions**・**Node 20 LTS** を選ぶ。
2. 自動生成 YAML は **「Next.js を standalone で zip して載せる」**ところまで含まないことが多い。
3. **初回デプロイ後**、生成された `.github/workflows/*.yml` を、**project_class4** の  
   `.github/workflows/main_tech0-gen-11-step3-2-node-67.yml` と見比べ、次を **barhunters 用に合わせて直す**のが現実的です。
   - `npm ci` / `npm run build` の **`cd frontend`**
   - ビルド時の **`NEXT_PUBLIC_API_URL`** … GitHub **Secrets** に本番 API の URL を登録し、ワークフローで `env:` に渡す（class4 と同型）
   - **standalone の取り出し** … `.next/standalone`・`.next/static`・`public` を 1 つの `deploy` フォルダに集める
   - **favicon 等** … barhunters は `frontend/src/app/favicon.ico` など。無いファイルを `cp` している行は削除してよい
   - **`app-name`** と **`publish-profile` の Secret 名** … フロント用 App Service のものに差し替え
4. App Service の **スタートアップコマンド**: `cd /home/site/wwwroot && node server.js`（§2.4）。

### 6.3 自動生成 YAML のよくある直し（API）

ポータルが出す雛形は **リポジトリ直下**を前提にしていることがあります。**barhunters は API が `backend/` 以下**なので、次のどちらかが必要になることが多いです。

- **ビルド手順**で `pip install -r backend/requirements.txt` とし、成果物・アップロード対象を **`backend/`** にする  
- または `defaults.run.working-directory: backend` を付け、相対パスを揃える

**Oryx** がデプロイ時に再度 `pip install` する場合、`SCM_DO_BUILD_DURING_DEPLOYMENT=true`（既定）なら **ルートに `requirements.txt` が無いと失敗**することがあります。対策は **(a)** リポジトリ直下に `requirements.txt` を置いて `backend/requirements.txt` と同内容にする、**(b)** App Service のアプリ設定で `SCM_DO_BUILD_DURING_DEPLOYMENT=false` にして GitHub 側ビルドのみにする、など。状況に合わせて Actions ログで判断してください。

### 6.4 初回だけ別作業（CI と無関係）

- **本番 DB に対する `alembic upgrade head`**（§4）は、CI が通っても **自動では流れない**ことがほとんどです。ローカル（ファイアウォールで自分の IP 許可）か SSH などで **一度実行**してください。

### 6.5 参考（class4）

- ワークフロー実物: `project_class4/.github/workflows/main_tech0-gen-11-step3-2-py-67.yml`（API）、`main_tech0-gen-11-step3-2-node-67.yml`（フロント）
- **環境変数名の差**: barhunters は CORS が **`ALLOW_ORIGINS`**（class4 の `ALLOWED_ORIGINS` ではない）

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
