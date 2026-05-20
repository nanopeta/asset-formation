# 資産形成ダッシュボード

## ドキュメント更新ルール（必須）
**機能を実装・変更したら、コミット前に必ず以下を更新すること：**
- `README.md` — 機能一覧・使い方の説明を最新状態に
- `TODO.md` — 完了タスクを `[x]` に、新規検討事項を `[ ]` に追加
- `CLAUDE.md` — データ構造・関数・CSS クラス等の変更を反映

## PR マージルール（必須）
- PR 作成後は確認なしで即マージすること（「マージしますか？」と聞かない）
- マージ方式: squash merge

## Git 操作ルール（必須）
- **変更は必ずコミットしてからプッシュする**
- `git reset --hard` は未コミット変更を破棄するため、変更前に実行しないこと
- 正しい順序: 変更 → コミット → `git push --force-with-lease`
- mainとの同期が必要な場合も、先にコミットしてからpushする

## ファイル構成（3ファイル）
| ファイル | 役割 | 行数目安 |
|---|---|---|
| `index.html` | UI構造・タブ・テーブル定義 | ~750行 |
| `app.js` | ロジック全般・レンダリング | ~1200行 |
| `style.css` | スタイル | ~360行 |

## キャッシュバスター（重要）
`index.html` の末尾付近で `app.js` と `style.css` をバージョン付きで読み込んでいる。
**`app.js` または `style.css` を変更したときは、必ず両方のバージョン番号を同時に上げること。**
```html
<link rel="stylesheet" href="style.css?v=61">  <!-- style.css変更時に上げる -->
<script src="app.js?v=61"></script>             <!-- app.js変更時に上げる -->
```
片方だけ上げると、古いファイルがブラウザにキャッシュされたまま反映されない。

## 過去に起きた重大バグ（再発防止）

### uid() 未定義バグ（2026-05-07）
`load()` 内でマイグレーションコードに `uid()` を使ったところ、`uid` の定義が `let D=load()` より後にあるため
`ReferenceError: uid is not defined` が発生。try/catch に捕まり `makeDefault()` が返り、**ユーザーデータが全消去される**事象が発生。

**対策**: `load()` 内では `uid()` を使わず、`'sp'+Date.now()+index` 等のインラインIDを使うこと。

## データ構造（localStorage: `asset-v3`）
```js
D = {
  settings: {
    scdTarget: 10000000,      // 目標元本
    scdHoldingId: 'h-schd',   // 対象銘柄ID（getScdHolding()で取得）
    idecoStartMonth: '',       // iDeCo開始月（YYYY-MM形式）
    idecoMonthlyTotal: 0,      // iDeCo月次拠出合計（円）
    usdJpy: 150,               // USD/JPY レート（USD銘柄の円換算に使用）
    targetAllocation: {},      // 目標配分 { [assetTypeId]: number（%） }
  },
  brokers:      [ {id, name, order} ],
  bankAccounts: [ {id, name, note, order} ],
  creditCards:  [ {id, name, note, bankId, order} ],  // bankId: 引き落とし口座ID（任意）
  holdings:     [ {id, name, account, assetType, brokerId, monthlyAmount, spotList, dividendYield, currency, dividendMonths, order} ],
  //  brokerId: 証券会社ID（brokers[].id 参照、楽天証券CSVインポート時の削除スコープ制御に使用）
  //  spotList: [{id, amount, done}]  ← 複数スポット購入計画。done=true のみNISA年間バーに加算
  //  currency: 'jpy'（デフォルト）または 'usd'（holdingJpy()でusdJpy換算）
  //  dividendMonths: [1-12の数値配列]  ← 配当受取月（配当カレンダーに使用）
  //  （旧 spotAnnual は load() 時に spotList へ自動マイグレーション済み）
  idecoHoldings:[ {id, name, assetType, monthlyAmount, dividendYield, order} ],
  customAccounts:   [ {id, label, color, badge, taxFree} ],  // taxFree: 配当非課税フラグ
  customAssetTypes: [ {id, label, badge, color} ],           // color: ドーナツグラフ用カラーコード
  accountTypeOrder: [ ...builtInIds, ...customIds ],         // 口座種別の表示順（ドラッグ並び替えで変更）
  assetTypeOrder:   [ ...builtInIds, ...customIds ],         // 銘柄種別の表示順（ドラッグ並び替えで変更）
  accountTypeOverrides: { [builtInId]: {label, color, badge, taxFree} },  // 組み込み口座種別の上書き
  assetTypeOverrides:   { [builtInId]: {label, color, badge} },            // 組み込み銘柄種別の上書き
  current: {
    bankValues:    { [id]: 数値 },
    cardValues:    { [id]: 数値 },
    holdingValues: { [id]: {value, principal} },
    idecoValues:   { [id]: {value, principal} },
    idecoActualPrincipal: 数値,  // iDeCo累計拠出元本（スイッチング前からの実拠出総額）
    nisa: { year, seichouUsed, tsumitateUsed, lifetimeUsed, seichouLifetimeUsed }
  },
  snapshots: [ {month, bankValues, cardValues, holdingValues, idecoValues, idecoActualPrincipal, nisa, cash, investment, idecoTotal, total} ]
}
```

## 口座種別・銘柄種別
```js
// 組み込み口座種別（taxFree フラグ付き）
BUILT_IN_ACCOUNTS = {
  'nisa-growth':    {label, color, badge, taxFree:true},
  'nisa-tsumitate': {label, color, badge, taxFree:true},
  'specific':       {label, color, badge, taxFree:false},
  'old-nisa':       {label, color, badge, taxFree:true},
}
// 組み込み銘柄種別（color フィールド付き）
BUILT_IN_ASSET_TYPES = {
  'fund':           {label, badge:'b-blue',   color:'#5b8fa8'},
  'domestic-stock': {label, badge:'b-teal',   color:'#5fad9b'},
  'us-stock':       {label, badge:'b-orange', color:'#c9915a'},
  'other':          {label, badge:'b-purple', color:'#9b8fc4'},
}
// 銘柄種別カラーパレット（ASSET_TYPE_COLORS は後方互換フォールバック用として残存）
ASSET_TYPE_COLORS = { 'fund':'#5b8fa8', 'domestic-stock':'#5fad9b', 'us-stock':'#c9915a', 'other':'#9b8fc4' }
// iDeCo 専用カラー
IDECO_COLOR = '#c9915a'

// 動的取得（カスタム＋上書き含む）
getAccounts()    // BUILT_IN_ACCOUNTS + accountTypeOverrides + customAccounts（accountTypeOrder 順）
getAssetTypes()  // BUILT_IN_ASSET_TYPES + assetTypeOverrides + customAssetTypes（color フィールドあり）

// 対象銘柄取得（settings.scdHoldingId を参照）
getScdHolding()  // D.holdings.find(id===scdHoldingId) || D.holdings[0]
```

## タブ・サブタブ構成
```
メインタブ: dashboard / record / settings
  dashboard → （サブタブなし）
    セクションID: sec-summary, sec-schd, sec-nisa, sec-portfolio,
                  sec-trend, sec-detail,
                  sec-sim, sec-reinvest, sec-div-cal, sec-div-sim,
                  sec-ideco-sim, sec-fire, sec-drawdown, sec-tax
  record    → rec-banks / rec-holdings
  settings  → set-holdings / set-accounts / set-basic
```

## 主要関数の場所（app.js）

### レンダリング
| 関数 | 役割 |
|---|---|
| `renderDashboard()` | ダッシュボード全体再描画（毎回フル）＋スナップリマインダー表示判定 |
| `renderDashHero(...)` | ヒーローカード＋サマリーカード描画（renderDashboard内サブ関数） |
| `renderDashScdStrip(...)` | 対象銘柄元本ストリップ描画 |
| `renderDashNisaSection(mo)` | NISAカード＋今年の投資計画描画 |
| `renderPortfolio(totalInv)` | ドーナツチャート＋銘柄比率テーブル＋目標配分バー |
| `renderAllocationBars(items)` | 目標配分テーブル（実績・目標・差分・買い増し目安額） |
| `renderAnalysisData()` | 詳細分析（口座別・種別ドーナツ＋テーブル、銘柄別一覧、到達シミュ） |
| `renderDivCalendar()` | 配当カレンダー（月別受取スケジュール・棒グラフ） |
| `renderDividendSim()` | 配当シミュレーションテーブル |
| `renderSCHDReinvest()` | 分配金再投資シミュレーション（年数・積立・再投資なし・目標月収・折れ線チャート） |
| `buildReinvestHoldingOptions()` | 再投資シミュ用銘柄セレクト生成 |
| `_populateReinvestFromHolding(id)` | 選択銘柄から再投資シミュ入力欄へ値をコピー |
| `renderFire()` | FIRE達成シミュレーション（必要資産・達成年数・プログレスバー） |
| `renderIdecoSim()` | iDeCo受取シミュレーション（一時金・年金方式、退職所得控除・税額計算） |
| `renderDrawdown()` | FIRE取崩しシミュレーション（資産枯渇年計算・折れ線チャート） |
| `renderTaxEstimate()` | 税金概算（配当税・潜在税・NISA非課税メリット、特定口座銘柄別内訳テーブル付き） |
| `renderTrendChart()` | 資産推移折れ線チャート（`trendPeriod` で期間フィルター） |
| `setTrendPeriod(months, btn)` | 期間フィルターボタン切り替え＋チャート再描画 |
| `renderRecordTab()` | 記録タブ全体 |
| `renderSettings()` | 設定タブ全体 |
| `autoFillNisa()` | NISA使用額を積立月数×月次額で自動計算して入力欄へ反映 |
| `calcIdecoEstimatedPri()` | iDeCo累計拠出元本を自動推計（開始月×月次拠出合計） |
| `calcIncomeTax(income)` | 所得金額から所得税額を計算（累進課税テーブル） |
| `showSnapSummary(month, snap, prev)` | スナップショット保存後の月次サマリーモーダル表示 |

### NISAカード「今年の投資計画」
`renderDashboard()` 内で計算・描画。
- NISA年間バーは `monthlyAmount × 経過月数 + spotDone(h)` で計算（未済スポットは含めない）
- 投資計画セクションは `成長投資枠 → 積立投資枠 → NISA合計 → iDeCo` の順で表示
- スポット件数バッジ: 未完了=黄色、全完了=緑

### スポット購入パネル関数
```js
addSpotRow(s)             // スポット行をパネルに追加（s省略時は空行）
                          // done=true の行は spot-done-row クラスを付与して取り消し線表示
                          // checkbox onchange でリアルタイムにクラスをトグル
renderSpotListPanel(spots) // 銘柄編集パネルにspotListを描画
getSpotListFromPanel()    // パネルからspotListを読み取り配列で返す
```

### 設定タブ CRUD パターン（銀行・カード・銘柄・iDeCo・口座種別・銘柄種別で共通）
```
render〇〇Table()      → テーブル再描画
open〇〇Panel()        → 追加パネル表示
close〇〇Panel()       → パネル閉じる
edit〇〇(id, builtIn)  → 編集モードでパネル表示（組み込みは builtIn=true）
save〇〇()             → 保存＆persist()
delete〇〇(id)         → 削除＆persist()
```
- 組み込み種別の編集は `accountTypeOverrides` / `assetTypeOverrides` に保存（元の定数は変更しない）

### クイックナビ
```js
toggleQnavSim(event)   // シミュレーションドロップダウンの開閉（外側クリックで自動閉じ）
initQnavHighlight()    // スクロール連動ハイライト（.qnav-pill/.qnav-drop-item に qnav-active 付与）
                       // シミュレーション系セクション表示中は #qnav-sim-btn に qnav-group-active 付与
qScroll(id)            // 指定セクションIDへスムーズスクロール（offset=160px）
```
- ナビ構成: 概要・SCHD・NISA・ポートフォリオ ｜ 資産推移・詳細分析 ｜ シミュレーション▾（ドロップダウン6項目）
- ドロップダウン6項目: 資産シミュ / 配当カレンダー / iDeCoシミュ / FIRE / 取崩し / 税金概算
- ドロップダウン: `.qnav-group > .qnav-dropdown.open` パターン
- シミュ系セクションID（`simIds`）: `sec-sim`, `sec-div-cal`, `sec-ideco-sim`, `sec-fire`, `sec-drawdown`, `sec-tax`

### フィルター（Excel風）
```js
xfBind(tableId, tbodyId, {afterFilter})  // テーブルにフィルター機能を紐付け
xfOpen(tableId, colIdx, btn)             // ▾ボタンクリックでドロップダウン表示
xfApplyAndClose(tableId)                 // 閉じるボタン押下で実行
xfApply(tableId)                         // フィルター＆ソート適用
```
- フィルターは**閉じるボタン押下時に実行**（チェック変更時は即時適用しない）
- ドロップダウンは `position:fixed` + `document.body.appendChild` でオーバーフロー回避
- `afterFilter` コールバックで合計行を動的更新（div-sim, an-holdings）

### ユーティリティ
```js
fmt(n)            // ¥1,234,567 形式
fmtMonths(months) // 月数を「N年Mヶ月」形式に変換
el(id)            // document.getElementById 省略形
uid()             // ユニークID生成（※load()内では使用不可→インラインIDを使うこと）
persist()         // D を localStorage に保存
calcTotals()      // {cash, inv, ideco, total} を返す（cash = 銀行合計 - カード合計）
getScdHolding()   // 設定で選択された対象銘柄を返す
holdingJpy(h)     // holding の {value, principal} を円換算で返す（USD銘柄はusdJpy換算）
spotTotal(h)      // holding の spotList 全件合計金額
spotDone(h)       // holding の spotList のうち done=true の合計金額
gainHtml(val, pri, size) // 含み損益を色付きHTMLで返す（+¥xxx / -¥xxx 形式）
acBadge(acc)      // 口座種別バッジHTML
atBadge(type)     // 銘柄種別バッジHTML
buildAccountOptions(selId, val)    // select要素に口座種別を動的生成
buildAssetTypeOptions(selId, val)  // select要素に銘柄種別を動的生成
buildBrokerOptions(selId, val)     // select要素に証券会社を動的生成
deleteSnap(month) // 指定月のスナップショット削除
filterTable(tbodyId, query) // tbodyをテキスト検索でフィルター（簡易版）
randomAccColor()  // 口座種別カラーピッカーで未使用色をランダム選択
randomAssetColor() // 銘柄種別カラーピッカーで未使用色をランダム選択
_buildCardBankOptions(val) // カード設定パネルの引き落とし口座セレクトを生成
_flashBtn(id)     // ボタンを一時的に緑「✓ 完了」に変える（2秒後に戻る）
_panelOpen(id)    // 設定パネルを開く（モーダル表示＋バックドロップ有効化）
_panelClose(id)   // 設定パネルを閉じる（バックドロップ非表示）
_triggerExport(blob, filename, btnId) // iOS対応エクスポート（Web Share API優先、fallbackでダウンロード）
exportSettings()  // 設定のみJSONエクスポート（accountTypeOverrides/assetTypeOverrides含む）
exportAll()       // 全体バックアップJSONエクスポート
```

### チャートインスタンス（グローバル変数）
```js
let chartPortfolio = null;   // ポートフォリオドーナツ
let byAccChart = null;       // 口座別合計ドーナツ
let byTypeChart = null;      // 種別合計ドーナツ
let chartTrend = null;       // 資産推移折れ線
let chartReinvest = null;    // 再投資シミュ折れ線
let chartDivCal = null;      // 配当カレンダー棒グラフ
let chartDrawdown = null;    // 取崩しシミュ折れ線
let trendPeriod = 0;         // 期間フィルター（0=全期間、3/6/12=直近N件）
```
チャートを再描画する前に必ず `.destroy()` してから `new Chart()` すること。

## HTML パターン

### 設定タブのセクション構造（白カード）
```html
<div class="rec-sec">
  <div class="rec-sec-head"><span>セクション名</span></div>
  <table>...</table>
  <div class="rec-sec-body">
    <button onclick="open〇〇Panel()">+ 追加</button>
    <div id="s-〇〇-panel" class="add-panel">...</div>
  </div>
</div>
```

### 分析セクション構造（常時表示）
```html
<div class="an-block" id="sec-〇〇">
  <div class="an-summary">セクション名</div>
  <div class="an-body">...</div>
</div>
```

## CSS 主要クラス
| クラス | 用途 |
|---|---|
| `.rec-sec` / `.rec-sec-head` / `.rec-sec-body` | 記録・設定タブの白カードセクション |
| `.an-block` / `.an-summary` / `.an-body` | ダッシュボード分析セクション |
| `.tbl-wrap` | テーブルを角丸枠で囲む（overflow-x:auto） |
| `.tbl-wrap.tbl-scroll` | スクロール固定テーブル（max-height:380px・sticky thead） |
| `.tbl-head` | テーブル上部のsticky見出し（白背景グラデーション） |
| `.add-panel` / `.add-panel.open` | 追加/編集フォームパネル（`.open`時はモーダルとして表示） |
| `#settings-backdrop` / `#settings-backdrop.active` | モーダル背景オーバーレイ（blur付き） |
| `.xf-btn` / `.xf-active` | フィルターボタン（▾） |
| `.g2` `.g3` `.g4` | 2/3/4カラムグリッド |
| `.plan-row` / `.plan-total` / `.plan-ideco` | 投資計画表示行 |
| `.spot-row` / `.spot-check` / `.spot-badge` / `.spot-done-row` | スポット購入パネル行・完了状態 |
| `.spot-badge.spot-done` | スポット全完了バッジ（緑） |
| `.btn-saved` | 保存完了フラッシュ（緑） |
| `.btn-auto` | 自動計算ボタン（薄緑） |
| `.port-grid` | ポートフォリオカード2カラム（300px + 1fr、768px以下で縦積み） |
| `.port-chart-pane` / `.port-table-pane` | ポートフォリオ左（グラフ）・右（テーブル） |
| `.breakdown-chart` | 口座別・種別ドーナツグラフ用コンテナ（height:150px） |
| `.trend-summary` | 資産推移セクションヘッダー（タイトル＋期間ボタン横並び） |
| `.trend-period-btns` / `.tpb` / `.tpb.active` | 期間フィルターボタン群 |
| `.snap-reminder` / `.snap-reminder-btn` | 先月スナップ未記録バナー |
| `.qnav-group` / `.qnav-dropdown` / `.qnav-dropdown.open` | クイックナビ シミュレーションドロップダウン |
| `.qnav-drop-item` / `.qnav-group-active` | ドロップダウン内アイテム / グループボタンのハイライト状態 |
| `.b-blue` `.b-teal` `.b-green` `.b-orange` `.b-purple` `.b-red` `.b-gray` | 組み込みバッジカラー |
| `.b-ideco` | iDeCo専用バッジ（薄橙色） |
| `.b-rose` | ローズ色バッジ（カスタム用） |
| `.div-tax-free` / `.div-tax` | 配当シミュ 非課税/課税ラベル |
| `.hi-warn` | 含み損ハイライト（黄色背景） |
| `.div-months-grid` / `.div-month-cb` | 配当月チェックボックスグリッド |
| `.snap-modal` / `.snap-modal-card` / `.snap-row` | 月次サマリーモーダル |
| `.alloc-title` / `.alloc-table` | 目標配分セクション |
| `.chart-wrap` / `.chart-h300` | チャートコンテナ（標準220px / 高さ300px） |
| `.fill-blue` `.fill-orange` `.fill-green` `.fill-purple` `.fill-red` | プログレスバー色 |
| `.toast` / `.toast-show` / `.toast-error` / `.toast-success` | トースト通知 |

## init() の主な初期化処理
```js
init()  // アプリ起動時の初期化
  // - 記録月を当月に設定
  // - クイックナビを表示
  // - settings-backdrop クリックでパネルを一括閉じ
  // - ESCキーでモーダル（snap-modal）またはパネル（.add-panel.open）を閉じる
  // - initTabEvents / initRecordEvents / initSettingsEvents / initQnavHighlight 呼び出し
  // - renderDashboard / renderRecordTab 呼び出し
```

## GitHub Pages
- URL: https://nanopeta.github.io/asset-formation/
- push すれば自動で反映（1〜2分）
