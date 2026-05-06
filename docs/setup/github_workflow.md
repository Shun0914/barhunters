# GitHub 開発ワークフロー手順書

GitHub を使った開発が初めての方向けに、**Issue → ブランチ → PR → マージ** の基本流れをまとめます。わからない点は Issue やチャットで遠慮なく聞いてください。

---

## 目次

1. [基本用語](#基本用語)
2. [開発の全体フロー](#開発の全体フロー)
3. [ステップバイステップ手順](#ステップバイステップ手順)
4. [よくある質問](#よくある質問)
5. [トラブルシューティング](#トラブルシューティング)

---

## 基本用語

### Issue（イシュー）

やるべきタスク・バグ・検討を記録するチケット。番号（例 `#12`）で参照します。  
**barhunters** では本文に **要件 ID（DASH-01 等）・完了条件・依存 Issue** が書かれているので、まず本文を読んでから着手してください。

### Branch（ブランチ）

`main` を壊さずに作業するための枝。

- **`main`**: マージ済みの最新。直接コミットしない運用を推奨
- **`feature/issue-{番号}-{短い英語}`**: 機能・タスク用
- **`fix/issue-{番号}-{短い英語}`**: バグ修正用

### Pull Request（PR）

変更を `main` に取り込むためのレビュー依頼。本文に **関連 Issue**（`Closes #12` など）を書くと追跡しやすいです。

### Merge（マージ）

PR が承認されたあと、`main` に変更が取り込まれること。

---

## 開発の全体フロー

```
1. Issue を選ぶ（依存関係・完了条件を確認）
2. main を最新化する
3. ブランチを切る
4. 実装・ドキュメント更新
5. コミット・プッシュ
6. PR を作成（説明・関連 Issue）
7. レビュー対応
8. マージ後、ローカルで main を更新し作業ブランチを削除
```

---

## ステップバイステップ手順

### ステップ 1: Issue を選ぶ

1. リポジトリの **Issues** を開く
2. 自分がアサインされている、またはチームで割り当てた Issue を選ぶ
3. **依存関係**に書かれた先行 Issue がマージ済みか確認する

### ステップ 2: 最新の main を取り込む

```bash
cd /path/to/bar_hunters
git fetch origin
git checkout main
git pull origin main
```

### ステップ 3: ブランチを作成する

命名例（日本語は使わない）:

```text
feature/issue-12-causal-story-ui
fix/issue-20-form-validation
```

```bash
git checkout -b feature/issue-12-causal-story-ui
```

### ステップ 4〜5: コミット・プッシュ

コミットメッセージの例:

```text
[Issue #12] 因果ストーリー画面の一覧表示を追加
```

```bash
git status
git add .
git commit -m "[Issue #12] 因果ストーリー画面の一覧表示を追加"
git push -u origin feature/issue-12-causal-story-ui
```

### ステップ 6: Pull Request を作成する

- **base**: `main`
- **compare**: 作業ブランチ
- **タイトル**: 内容が分かる一文（例: `[Issue #12] 因果ストーリー画面（タブ・一覧・検索）`）
- **本文**: 実装概要、動作確認手順、関連 Issue

PR 本文の例:

```markdown
## 実装内容
- …

## 関連 Issue
Closes #12

## 動作確認
- [ ] ローカルで FE/BE 起動済み
- [ ] Issue の完了条件を満たす
```

リポジトリのラベル（例: `type:task`, `area:frontend`, `mvp`）があれば PR に付与します。

### ステップ 7〜8: レビュー後

指摘があれば同じブランチに追加コミットして `git push`。マージ後:

```bash
git checkout main
git pull origin main
git branch -d feature/issue-12-causal-story-ui
```

---

## よくある質問

### Q: どの Issue から手をつける？

**A**: (1) アサインされているもの (2) 依存が空、または依存 Issue が完了済みのもの、の順で選ぶと安全です。

### Q: ブランチ名のルールは？

**A**: `feature/issue-{番号}-{英語の短い説明}` を推奨。チームで別ルールにした場合は本ドキュメントを更新してください。

### Q: コンフリクトしたら？

**A**: まず `main` を取り込むか、相手とファイル担当を分ける。解決できなければ Issue に状況を書いて相談してください。

---

## トラブルシューティング

### `git pull` でローカル変更が邪魔される

```bash
git stash
git pull origin main
git stash pop
```

### 間違ったブランチで編集してしまった

```bash
git stash
git checkout 正しいブランチ名
git stash pop
```

### 直前のコミットメッセージだけ直したい（未プッシュ）

```bash
git commit --amend -m "新しいメッセージ"
```

---

## チェックリスト

**作業開始前**

- [ ] `main` を最新化した
- [ ] Issue の完了条件を読んだ
- [ ] 依存 Issue の状態を確認した

**PR 作成前**

- [ ] 動作確認した
- [ ] スコープ外のファイルを大量に変えていない

**マージ後**

- [ ] `main` を pull した
- [ ] 作業ブランチを削除した

---

## 参考リンク

- [セットアップ手順](./setup.md)
- [開発プランニング（チケット・依存）](../planning/開発プランニング_3スプリント.md)
- [GitHub ドキュメント](https://docs.github.com/ja)
