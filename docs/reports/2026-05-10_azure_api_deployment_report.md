# Azure API デプロイレポート（barhunters）

**日付**: 2026-05-10  
**対象**: FastAPI バックエンド（`backend/`）→ Azure App Service **Linux / Python 3.12**  
**追跡 Issue**: [#29](https://github.com/Shun0914/barhunters/issues/29)

---

## 1. 環境サマリ

| 項目 | 値 |
|------|-----|
| App Service 名 | `tech0-gen-11-step3-2-py-66` |
| 公開 URL | `https://tech0-gen-11-step3-2-py-66.azurewebsites.net` |
| ランタイム | Python 3.12（Oryx ビルドログ上は 3.12.13、コンテナ起動ログでは 3.12.12 表記あり） |
| 成果物レイアウト | Oryx が **`output.tar.zst`**（zstd）で `wwwroot` に配置し、**コンテナ起動時に `/tmp/<id>` へ展開** |
| 仮想環境名 | `antenv`（展開先内） |
| CI | GitHub Actions（`main` 向け）— artifact は `backend/` のみ → `azure/webapps-deploy@v3` |

関連するフロント用ホスト（未デプロイ／別タスク）: `https://tech0-gen-11-step3-2-node-66.azurewebsites.net`

---

## 2. ビルド（Oryx）

- **設定**: `SCM_DO_BUILD_DURING_DEPLOYMENT=1`（想定）により、デプロイ時に Oryx が `requirements.txt` を解決し `uv pip install` を実行。
- **ログ上の成功条件**: `antenv` 作成、29 パッケージインストール、`oryx-manifest.toml` 生成、`output.tar.zst` を `wwwroot` へ配置、`Total execution done`。
- **ローカルとの差**: ローカルは `pyproject.toml` 中心でもよいが、Azure 側は **`backend/requirements.txt`** が実体。

---

## 3. インシデント: Application Error（503）と原因

### 現象

- ブラウザ／`curl` で **503**、`Application Error` ページ。
- ログでは Oryx 展開は成功する一方、アプリが期待どおり起動しない時間帯があった。

### 根本原因

- スタートアップコマンドに **`cd /home/site/wwwroot &&`** が含まれていた。
- **圧縮デプロイ**では、アプリと `antenv` は **`output.tar.zst` 展開後の `App path`（例: `/tmp/8deaee1ac7001f4`）** で動作する。`wwwroot` には tarball とマニフェスト等が残り、**展開済みの `app` パッケージがルートに無い**。
- その状態で `wwwroot` に `cd` して `python -m uvicorn app.main:app` を実行すると、**モジュール解決や venv パスの前提が崩れ**、プロセスが落ちる。

### 是正

- スタートアップから **`cd /home/site/wwwroot &&` を削除**。
- 推奨コマンド（1 行）:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

- 代替として **スタートアップコマンドを空**にし、Oryx 生成の `startup.sh` に任せる手もある。

### 期待ログ（正常時）

- `App path is set to '/tmp/...'`
- `Using packages from virtual environment antenv located at /tmp/.../antenv`
- `Application startup complete` / `Uvicorn running on http://0.0.0.0:8000`

---

## 4. 疎通検証（2026-05-10 時点）

| エンドポイント | 結果 | メモ |
|----------------|------|------|
| `GET /health` | `200` | `{"status":"ok"}` |
| `GET /api/hello` | `200` | `SELECT 1` 成功 → `database: ok` |
| `GET /api/db/meta` | `200` | `alembic_version`: `dd855ad482be`、各テーブル件数 `0` |

**備考**: `GET /robots933456.txt` の **404** は Azure 側プローブで、アプリ不具合ではない。

---

## 5. アプリ設定（参照・秘密は記載しない）

ポータル「構成」で想定されるキー（値は各環境で設定）:

- `DATABASE_URL` — 共有 MySQL 等（Azure MySQL なら TLS 前提。アプリは `database.azure.com` 向けに SSL コンテキストを設定）
- `ALLOW_ORIGINS` — CORS。Web 公開後は node App Service の HTTPS オリジンを含める
- `DEV_DEFAULT_USER_ID` / `MYSQL_SSL_CA` / `POINT_AGGREGATE_STATUSES` — 必要に応じて

---

## 6. 残タスク（Issue #29 用メモと同期）

1. **Web App（node-66）**: Next.js `standalone` のデプロイと `NEXT_PUBLIC_API_URL` の確定。
2. **`ALLOW_ORIGINS`**: Web URL 確定後に API へ反映。
3. **シード・初期データ**: 方針決定後、`/api/db/meta` で件数確認。
4. **CI**: フロント用ワークフローはチーム方針に従い追加（未追加ならポータル／ZIP 等で代替）。

---

## 7. 参考リンク

- 手順の索引: [azure_deployment.md](../setup/azure_deployment.md)
- ワークフロー: [.github/workflows/main_tech0-gen-11-step3-2-py-66.yml](../../.github/workflows/main_tech0-gen-11-step3-2-py-66.yml)
- Oryx: [Microsoft/Oryx](https://github.com/Microsoft/Oryx)
