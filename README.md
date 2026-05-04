# barhunters

西部ガスグループ向け **人的資本・挑戦活動の可視化** と、クエスト（Tech0 Step4）に沿ったプロダクト開発のリポジトリです。経営・部門長・現場が同じストーリーで状況を把握できることを目指します。

---

## ディレクトリ構成（現状と予定）

```
bar_hunters/
├── README.md                 # 本ファイル（リポジトリ全体の案内）
├── docs/                     # ドキュメント一式（編集・正の議論は主にここ）
│   ├── design/               # サービス企画資料（整理版）
│   ├── planning/             # 開発プランニング（3 スプリント等）
│   ├── research/             # クエスト原文、事例調査、UI 調査
│   ├── requirements/         # 要件ドラフト（基本要件・機能一覧・非機能・データ）
│   └── data/                 # 因果チェーン等の機械可読データ（JSON）
├── dashboard/                # モック・静的プロトタイプ専用（下記参照）
├── frontend/                 # 本番向けフロントエンド（Next.js）
└── backend/                  # 本番向け API（FastAPI）
```

### `dashboard/` について

- **用途**: Figma に近い画面イメージの**モック**、因果チェーンなどの**静的ビュー**の置き場です。
- **本番実装の編集先ではありません。** 新規開発は **`frontend/` / `backend/`** を追加したうえでそちらを主戦場にしてください。
- 主要ファイル例: `index.html` と JSX 分割、`remixed-9d8265c3.html`（因果チェーン v9.2）、`style.css`、`data.js`。

### `docs/` について

| サブディレクトリ | 内容 |
|------------------|------|
| `design/` | 現状は `サービス企画資料_整理版.md` のみ |
| `planning/` | 開発スプリントの計画・チケット分解（現状は `開発プランニング_3スプリント.md` を中心） |
| `research/` | 企業クエスト本文、参考サービス、カラー・フォント調査 |
| `requirements/` | 要件のたたき台（索引は [docs/requirements/README.md](docs/requirements/README.md)） |
| `setup/` | **開発環境・GitHub 運用・テスト運用**の索引（[docs/setup/README.md](docs/setup/README.md)） |
| `data/` | 因果チェーン等の **JSON データ**（[docs/data/README.md](docs/data/README.md)） |

※ `docs/hearing/`・`docs/minutes/` は `.gitignore` で除外している場合があります（ローカル限定の議事・ヒアリング用）。

---

## 技術方針（参照）

クエスト推奨スタックは **フロント: Next.js / サーバー: FastAPI / インフラ: Azure** です（詳細は `docs/research/Tech0_Step4_西部ガス企業クエスト.md`）。  
`frontend/`・`backend/` の実装は、この方針と `docs/requirements/` の非機能要件を前提にしてください。

---

## 本番向けアプリのローカル起動（スプリント1）

API とフロントを別ターミナルで起動し、トップページに API 応答が表示されれば疎通成功です。手順の詳細は **[docs/setup/setup.md](docs/setup/setup.md) の §3** を参照してください。

| 役割 | ディレクトリ | 例（開発） |
|------|----------------|------------|
| API | `backend/` | `http://127.0.0.1:8000`（`/health`, `/api/hello`, `/docs`） |
| UI | `frontend/` | `http://localhost:3000` |

---

## モックの閲覧（参考）

`dashboard/` 内の HTML は、ローカルでファイルを開くか、簡易 HTTP サーバから配信して確認できます。

```bash
# 例: リポジトリルートで
python3 -m http.server 8080
# ブラウザで http://localhost:8080/dashboard/ を開く
```

JSX をそのままブラウザが解釈しない構成のファイルがある場合は、`frontend/` のビルド手順に従ってください。

---

## 関連リンク（外部）

- リモート: `https://github.com/Shun0914/barhunters.git`
- デザイン・ボード類は FigJam / Figma を正とし、要件との対応は `docs/requirements/01_基本要件定義書.md` を参照。

---

## ライセンス

未設定の場合はリポジトリオーナーに従ってください。
