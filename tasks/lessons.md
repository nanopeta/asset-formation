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

---

## 描画・チャート

### Chart.js のインスタンスは `destroy()` してから再生成する
- 同じ `<canvas>` に複数回 `new Chart()` するとメモリリークとレイアウト崩れが起きる
- **ルール**: `chartPortfolio` / `chartTrend` を再描画する前に `if(chart) chart.destroy()` を先に呼ぶ

### 資産推移チャートは renderDashboard() から呼ぶ
- 分析セクションは常時表示（`<details>` 廃止済み）のため、`renderDashboard()` 内で `renderTrendChart()` を直接呼ぶ
- **ルール**: `<details>` の toggle イベントは使わない。チャートは `renderDashboard()` → `renderTrendChart()` の順で呼ぶ

---

## UI / DOM

### `el()` は `document.getElementById()` のショートハンド
- `el('some-id')` が `null` を返すときはスペルミスか、まだ DOM に存在しない
- **ルール**: 新しい要素を JS から参照するときは HTML 側に対応する `id` があるか先に確認する

### グリッドクラス `g1`〜`g4` は CSS 側で定義済み
- 銀行・カードの入力グリッドは `grid.className = \`g${Math.min(4, count)}\`` で動的に変わる
- **ルール**: 新しいグリッドを追加するときは `style.css` に `.g1`〜`.g4` が定義済みかを確認する

---

## Git

### 変更後は必ずコミットする
- セッション末尾で `git add` + `git commit` を実行する（CLAUDE.md のルール）
- コミットメッセージは日本語で書く

---

## Sticky レイアウト

### main の padding を打ち消して sticky を全幅にする
- `main` に `padding: 20px 24px` があるため、内部の sticky 要素は左右に余白が生じる
- **解決策**: `margin: 0 -24px; padding: 8px 24px;` でpaddingを打ち消し、内部コンテンツは `max-width + margin: 0 auto` で中央揃え
- **top の計算**: header(50px) + main-nav(41px) = top:91px。その下に sticky がある場合は高さ分ずらす

### sticky が重なる順序
- z-index の優先順: header(200) > main-nav(199) > qnav/rec-sticky(150) > sub-nav(148)
- 記録タブのサブタブ top は rec-sticky の高さ(約45px)を足した `top:136px` にする

---

## Excel風フィルター（XF）

### xfBind はデータ描画後に必ず呼ぶ
- `renderDividendSim()` や `renderAnalysisData()` で innerHTML を更新した直後に `xfBind(tableId, tbodyId)` を呼ぶ
- xfBind は前回のソート/フィルター状態を引き継いでから再適用する

### data-raw 属性で数値ソートを正確にする
- テーブルセルの表示値（`¥1,234,567`）は文字列ソートでは正しく並ばない
- 数値セルには `data-raw="1234567"` を追加し、xfApply 内で `parseFloat` してソートする

### tbody の tr のみを対象にする
- `tfoot` の合計行は `xfBind` が `tbody.querySelectorAll('tr')` で収集するため自動的に除外される
- `tfoot` の colspan は列数に合わせて正確に設定する

### xf-dropdown は button の外（th内）に appendChild する
- `button` 内に `div.xf-dropdown` を入れると、「閉じる」ボタンのクリックが外側の `xf-btn` に伝播して `xfOpen` が再実行されてしまう
- また `button` 内に `label > input[checkbox]` を置くのはHTML仕様上インタラクティブ要素のネストで動作が不安定
- **ルール**: `btn.closest('th').appendChild(dd)` にする。`th{position:relative}` で位置決めは正常に機能する

### フィルター後の合計行は afterFilter コールバックで更新する
- `xfBind(tableId, tbodyId, {afterFilter: fn})` の第3引数でコールバックを渡す
- `xfApply` の末尾で `if(s.afterFilter)s.afterFilter(s)` を呼ぶ
- コールバック内で `s.rows.filter(r=>r.tr.style.display!=='none')` から可視行のみ集計して tfoot を書き換える

---

## フィルター実行タイミング

### フィルターは「閉じるボタン」押下で実行する
- チェックボックス変更・ソートボタン押下では即時適用しない（状態の更新のみ）
- `xfApplyAndClose(tableId)` が `xfApply` + `xfUpdateBtnState` + `xfCloseAll` をまとめて実行する
- **ルール**: `xfApplyFilter` / `xfToggleAll` / `xfSort` 内では `xfApply` を呼ばない。呼ぶのは `xfApplyAndClose` のみ

---

## 口座種別・銘柄種別の拡張

### カスタム種別は D.customAccounts / D.customAssetTypes で管理する
- `BUILT_IN_ACCOUNTS` / `BUILT_IN_ASSET_TYPES` は定数（変更不可）
- カスタム追加は `D.customAccounts` / `D.customAssetTypes` に push して `persist()`
- 動的に全種別を取得するには `getAccounts()` / `getAssetTypes()` を使う
- select 要素への動的生成は `buildAccountOptions(selId, val)` / `buildAssetTypeOptions(selId, val)` を使う
- **ルール**: 口座種別・銘柄種別を参照するときは定数直接参照（`BUILT_IN_ACCOUNTS[x]`）ではなく `getAccounts()[x]` を使う

---

## 今後の注意点（未来の自分へ）

- `BUILT_IN_ACCOUNTS` / `BUILT_IN_ASSET_TYPES` の組み込み定数を削除・リネームすると既存 localStorage データとの互換性が壊れる。追加は OK、削除・リネームは慎重に。
- `saveSnapshot()` は `D.current` を上書きしてからスナップショットを生成する。この順番を逆にすると現在値が更新されない。
- 設定タブのセクションは `.rec-sec` / `.rec-sec-head` / `.rec-sec-body` の白カード構造を使う（`sec-label` + `tbl-wrap` の旧パターンは使わない）。
