# 教訓・注意事項

このプロジェクト固有のミスを記録し、再発を防ぐためのファイル。

---

## データ管理

### localStorage のキー名を変えるときは必ずマイグレーションを書く
- v1 → v2 → v3 と形式が変わるたびに `migrateV2()` を追加した
- **ルール**: キー名・構造変更時は `load()` 内に旧→新変換ロジックを追加する

### `persist()` は変更後に必ず呼ぶ
- CRUD 操作後に `persist()` を呼ばないとページリロードで消える
- **ルール**: データを変更するすべての関数の末尾に `persist()` があることを確認する

### 新しいフィールドを settings/D に追加したら load() でも初期化する
- `D.assetTypeOverrides` を追加したとき、既存 localStorage には存在しないため `undefined` になる
- **ルール**: `load()` 内で `if(!d.xxx)d.xxx={}` のフォールバックを必ず書く

---

## 描画・チャート

### Chart.js のインスタンスは `destroy()` してから再生成する
- 同じ `<canvas>` に複数回 `new Chart()` するとメモリリークとレイアウト崩れが起きる
- **ルール**: `chartPortfolio` / `chartTrend` を再描画する前に `if(chart) chart.destroy()` を先に呼ぶ

### 資産推移チャートは renderDashboard() から呼ぶ
- 分析セクションは常時表示（`<details>` 廃止済み）のため、`renderDashboard()` 内で `renderTrendChart()` を直接呼ぶ
- **ルール**: `<details>` の toggle イベントは使わない

---

## UI / DOM

### `el()` は `document.getElementById()` のショートハンド
- `el('some-id')` が `null` を返すときはスペルミスか、まだ DOM に存在しない
- **ルール**: 新しい要素を JS から参照するときは HTML 側に対応する `id` があるか先に確認する

### グリッドクラス `g1`〜`g4` は CSS 側で定義済み
- 銀行・カードの入力グリッドは `grid.className = \`g${Math.min(4, count)}\`` で動的に変わる
- **ルール**: 新しいグリッドを追加するときは `style.css` に `.g1`〜`.g4` が定義済みかを確認する

### div の閉じタグのズレはタブ全体が崩れる原因になる
- 設定タブで `</div>` の位置ミスにより、口座種別・銘柄種別カードがダッシュボードと記録タブの末尾に漏れ出た
- **ルール**: 複数の `rec-sec` を `g2` などで囲む場合、開閉タグの対応を慎重に確認する。コメントに「end g2」などを書くより、インデントを正確に揃える

---

## Git

### 変更後は必ずコミットする
- セッション末尾で `git add` + `git commit` を実行する（CLAUDE.md のルール）
- コミットメッセージは日本語で書く

---

## Sticky レイアウト

### main の padding を打ち消して sticky を全幅にする
- `main` に `padding: 20px 24px` があるため、内部の sticky 要素は左右に余白が生じる
- **解決策**: `margin: 0 -24px; padding: 8px 24px;` でpaddingを打ち消す
- **top の計算**: header(50px) + main-nav(41px) = top:91px

### sticky が重なる順序
- z-index の優先順: header(200) > main-nav(199) > qnav/rec-sticky(150) > sub-nav(148)

---

## Excel風フィルター（XF）

### xfBind はデータ描画後に必ず呼ぶ
- `renderDividendSim()` や `renderAnalysisData()` で innerHTML を更新した直後に `xfBind(tableId, tbodyId)` を呼ぶ

### data-raw 属性で数値ソートを正確にする
- 数値セルには `data-raw="1234567"` を追加し、xfApply 内で `parseFloat` してソートする

### xf-dropdown は position:fixed で body に appendChild する
- `overflow:hidden` な親要素にドロップダウンを入れるとクリッピングされる
- **解決策**: `getBoundingClientRect()` で位置を取得し `position:fixed` で `document.body.appendChild(dd)`

### フィルターは「閉じるボタン」押下で実行する
- チェックボックス変更・ソートボタン押下では即時適用しない（状態の更新のみ）
- `xfApplyAndClose(tableId)` が `xfApply` + `xfUpdateBtnState` + `xfCloseAll` をまとめて実行する

### フィルター後の合計行は afterFilter コールバックで更新する
- `xfBind(tableId, tbodyId, {afterFilter: fn})` の第3引数でコールバックを渡す

---

## 口座種別・銘柄種別の拡張

### カスタム種別は D.customAccounts / D.customAssetTypes で管理する
- `BUILT_IN_ACCOUNTS` / `BUILT_IN_ASSET_TYPES` は定数（変更不可）
- 組み込みの上書きは `D.accountTypeOverrides` / `D.assetTypeOverrides` に保存
- 動的に全種別を取得するには `getAccounts()` / `getAssetTypes()` を使う

### taxFree フラグは BUILT_IN_ACCOUNTS に定義済み・カスタムでも設定可能
- `nisa-growth / nisa-tsumitate / old-nisa` は `taxFree:true`、`specific` は `taxFree:false`
- 配当シミュレーションの課税判定は `getAccounts()[h.account]?.taxFree` を参照する
- **ルール**: 新しい非課税口座を追加する場合は `taxFree:true` をセットする

### 対象銘柄は ID 決め打ちではなく getScdHolding() を使う
- `D.settings.scdHoldingId` に対象銘柄 ID を保存し、`getScdHolding()` で取得する
- **ルール**: SCHD（または任意の目標銘柄）を参照する箇所は `getScdHolding()` を使い、`h.id==='h-schd'` の直接参照をしない

---

## 今後の注意点（未来の自分へ）

- `BUILT_IN_ACCOUNTS` / `BUILT_IN_ASSET_TYPES` の組み込み定数を削除・リネームすると既存 localStorage データとの互換性が壊れる。追加は OK、削除・リネームは慎重に。
- `saveSnapshot()` は `D.current` を上書きしてからスナップショットを生成する。この順番を逆にすると現在値が更新されない。
- 設定タブのセクションは `.rec-sec` / `.rec-sec-head` / `.rec-sec-body` の白カード構造を使う。
