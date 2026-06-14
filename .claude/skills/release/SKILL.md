---
name: release
description: 資産形成ダッシュボードのリリース工程を半自動化する。キャッシュバスター4箇所のバージョンバンプ、CHANGELOG.md とアプリ内ヘルプモーダル(#help-pane-changelog)への二重追記、README/TODO/CLAUDE の更新、整合チェックまでを順に実行する。「リリースして」「バージョンを上げて」「vNを出して」と言われたとき、または機能実装後にまとめてドキュメント反映したいときに使う。
---

# /release — リリース工程スキル

このアプリは vanilla HTML/CSS/JS の単一ページアプリで、リリースのたびに**キャッシュバスターの4箇所同期**と**CHANGELOG の二重追記**という手作業が必要。1箇所でも漏れると PWA が古いファイルを使い続ける重大バグになる。このスキルはその工程を漏れなく実行するためのもの。

## 前提
- 作業前に変更内容（実装した機能・修正したバグ）を把握しておくこと。
- バージョン番号は単調増加の整数（`vN`）。現行は `app.js` の `APP_VERSION` で確認できる。

## 手順

### 1. 次バージョン番号 N を決定
現行を確認:
```bash
grep -oE "APP_VERSION='v[0-9]+'" app.js
```
引数で番号が渡されていればそれを、なければ現行+1 を使う。ユーザーに確認が必要なら確認する。

### 2. キャッシュバスターを4箇所同時にバンプ
```bash
bash scripts/bump-version.sh N
```
これで `app.js`(APP_VERSION) / `sw.js`(CACHE) / `index.html`(style.css?v= と app.js?v=) が一括更新される。**手で個別に書き換えないこと**（漏れの原因）。

### 3. CHANGELOG.md に追記
ファイル先頭（`---` 区切りの直後、既存の最新エントリの上）に追加。フォーマットは既存エントリに合わせる:
```markdown
## vN（YYYY-MM-DD）

[変更全体を1文で要約]

- 詳細な変更点1
- 詳細な変更点2
```
- 日付は今日の日付（`date +%F`）。
- 複数テーマがある場合は `### セクション名` で小見出しを付けてよい（v103/v104 を参照）。

### 4. index.html の #help-pane-changelog に追記
`id="help-pane-changelog"` の直後（既存の最新 `changelog-entry` の**上**＝先頭）に追加。最新が一番上になること。既存エントリをコピーして書き換えるのが確実:
```html
            <div class="changelog-entry">
                <div class="changelog-ver">vN <span class="changelog-date">YYYY-MM-DD</span></div>
                <ul class="changelog-items">
                    <li>ユーザー向けのやさしい説明（CHANGELOG より平易に）</li>
                </ul>
            </div>
```
- ここはエンドユーザーが読む欄。技術用語を避け、何が良くなったかを平易に書く。

### 5. README.md / TODO.md / CLAUDE.md を更新
- **機能追加・変更時は必須**:
  - `README.md` — 機能一覧・使い方を最新に
  - `TODO.md` — 完了タスクを `[x]` に、新規検討事項を `[ ]` に
  - `CLAUDE.md` — データ構造・関数・CSSクラス等の変更を反映
- **純粋なバグ修正のみ**の場合は CHANGELOG + ヘルプモーダルだけで可（README/TODO/CLAUDE に該当変更がなければスキップしてよい）。

### 6. 整合チェック
```bash
bash scripts/check-docs.sh
```
`✅ 全整合 (vN)` が出ればOK。エラーが出たら該当箇所を直す。

### 7. コミット
```bash
git add -A
git commit -m "vN: <要約>"
```
`scripts/pre-commit` フックが doc更新・changelog同期・キャッシュバスター整合を再検証する（hooksPath は SessionStart フックで自動有効化済み）。ブロックされたらメッセージに従って修正。
- **push と PR 作成はユーザーが明示的に指示したときのみ**行う。

## 踏みやすい地雷（CLAUDE.md より）
- **`load()` 内で `uid()` を使わない** — ReferenceError で全データ消去事故あり。インラインID（`'sp'+Date.now()+i` 等）を使う。
- **税率を直書きしない** — 必ず `TAX_RATE` 定数（0.20315）を参照。
- **配当カレンダーの canvas を innerHTML で上書きしない** — `#div-cal-chart` は永続化されている。
- チャート再描画は `new Chart()` を直接呼ばず `_chartRender(chart, ctx, config)` ヘルパーを使う。
