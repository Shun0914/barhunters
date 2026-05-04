# 最小スキーマと要件・Issue の対応（#10 / TKT-S02-01）

物理テーブルは [04_データ要件.md](../../docs/requirements/04_データ要件.md) のドラフトに沿う。**Notification（§2.5）は未作成**（ワークフロー実装時に別マイグレーション）。

| テーブル | データ要件 | GitHub |
|----------|------------|--------|
| `users` | §2.1 User（最小: id, name, employee_code, org_id, role） | #12 / #15 で申請者・承認者参照の土台 |
| `activity_genres` | §2.4 活動ジャンル | #15 のマスタ GET |
| `indicators` | §2.3 Indicator / DashboardContent | #12 の指標一覧・因果 UI |
| `point_applications` | §2.2 PointApplication | #15 の POST / 下書き（`status` は文字列。例: `draft`, `submitted`） |

## `point_applications.status`（案）

実装で ENUM に寄せるまで、文字列で統一する想定。

- `draft` — 下書き（IN-08）
- `submitted` — 提出済（以降はワークフロー #22 で拡張）

## 主キーと将来 PostgreSQL 移行

- ローカル SQLite: `users.id` / `point_applications.id` は **36 文字 UUID 文字列**。
- `activity_genres.id` / `indicators.id` は **整数 AUTOINCREMENT**。
- 本番で PostgreSQL に移す際は、`UUID` 型・シーケンスへの変更を別リビジョンで扱う。
