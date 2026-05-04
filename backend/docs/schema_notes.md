# 最小スキーマと要件・Issue の対応（#10 / TKT-S02-01）

物理テーブルは [04_データ要件.md](../../docs/requirements/04_データ要件.md) のドラフトに沿う。DDL は **初回** `bbef3e2293c9`（ユーザー・マスタ・指標・申請）と **`d4e8f0a2b6c1`（`notifications` / §2.5）** の 2 リビジョン。

| テーブル | データ要件 | GitHub |
|----------|------------|--------|
| `users` | §2.1 User（最小: id, name, employee_code, org_id, role） | #12 / #15 で申請者・承認者参照の土台 |
| `activity_genres` | §2.4 活動ジャンル | #15 のマスタ GET |
| `indicators` | §2.3 Indicator / DashboardContent | #12 の指標一覧・因果 UI |
| `point_applications` | §2.2 PointApplication | #15 の POST / 下書き（`status` は文字列。例: `draft`, `submitted`） |
| `notifications` | §2.5 Notification | WF-02 一覧・既読。`type` は DB 列名（ORM 属性は `notification_type`） |

## `notifications.type`（案）

要件の例に合わせ、文字列で統一（ENUM は後続可）。

- `application_submitted` / `application_approved` / `application_rejected` / `application_returned` など

## `point_applications.status`（案）

実装で ENUM に寄せるまで、文字列で統一する想定。

- `draft` — 下書き（IN-08）
- `submitted` — 提出済（以降はワークフロー #22 で拡張）

## 主キーと将来 PostgreSQL 移行

- ローカル SQLite: `users.id` / `point_applications.id` / `notifications.id` は **36 文字 UUID 文字列**。
- `activity_genres.id` / `indicators.id` は **整数 AUTOINCREMENT**。
- 本番で PostgreSQL に移す際は、`UUID` 型・シーケンスへの変更を別リビジョンで扱う。
