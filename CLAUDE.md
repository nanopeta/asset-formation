# 資産形成ダッシュボード

## ファイル構成（3ファイル）
| ファイル | 役割 | 行数目安 |
|---|---|---|
| `index.html` | UI構造・タブ・テーブル定義 | ~530行 |
| `app.js` | ロジック全般・レンダリング | ~600行 |
| `style.css` | スタイル | ~225行 |

## データ構造（localStorage: `asset-v3`）
```js
D = {
  settings: { scdTarget: 10000000 },          // SCHD目標元本
  bankAccounts: [ {id, name, note, order} ],   // 銀行口座
  creditCards:  [ {id, name, note, order} ],   // クレジットカード
  holdings:     [ {id, name, account, assetType, monthlyAmount, spotAnnual, dividendYield, order} ],
  idecoHoldings:[ {id, name, assetType, monthlyAmount, dividendYield, order} ],
  customAccounts:   [ {id, label, color, badge} ],   // カスタム口座種別
  customAssetTypes: [ {id, label, badge} ],           // カスタム銘柄種別
  current: {
    bankValues:    { [id]: 数値 },
    cardValues:    { [id]: 数値 },
    holdingValues: { [id]: {value, principal} },
    idecoValues:   { [id]: {value, principal} },
    nisa: { year, seichouUsed, tsumitateUsed, lifetimeUsed, seichouLifetimeUsed }
  },
  snapshots: [ {month, bankValues, cardValues, holdingValues, idecoValues, nisa, cash, investment, idecoTotal, total} ]
}
```

## 口座種別・銘柄種別
```js
// 組み込み口座種別（変更不可）
BUILT_IN_ACCOUNTS = { 'nisa-growth', 'nisa-tsumitate', 'specific', 'old-nisa' }
// 組み込み銘柄種別（変更不可）
BUILT_IN_ASSET_TYPES = { 'fund', 'domestic-stock', 'us-stock', 'other' }
// 動的取得（カスタム含む）
getAccounts()    // BUILT_IN_ACCOUNTS + D.customAccounts
getAssetTypes()  // BUILT_IN_ASSET_TYPES + D.customAssetTypes
```

## タブ・サブタブ構成
```
メインタブ: dashboard / record / settings
  dashboard → （サブタブなし）セクションID: sec-summary, sec-schd, sec-nisa, sec-portfolio, sec-trend, sec-sim, sec-detail
  record    → rec-banks / rec-holdings
  settings  → set-holdings / set-accounts / set-basic
```

## 主要関数の場所（app.js）

### レンダリング
| 関数 | 役割 |
|---|---|
| `renderDashboard()` | ダッシュボード全体再描画（毎回フル） |
| `renderPortfolio(totalInv)` | ドーナツチャート＋銘柄比率テーブル |
| `renderAnalysisData()` | 詳細分析3テーブル（口座別・種別・銘柄一覧） |
| `renderDividendSim()` | 配当シミュレーションテーブル |
| `renderTrendChart()` | 資産推移折れ線チャート |
| `renderRecordTab()` | 記録タブ全体 |
| `renderSettings()` | 設定タブ全体 |

### 設定タブ CRUD パターン（銀行・カード・銘柄・iDeCo・口座種別・銘柄種別で共通）
```
render〇〇Table()  → テーブル再描画
open〇〇Panel()    → 追加パネル表示
close〇〇Panel()   → パネル閉じる
edit〇〇(id)       → 編集モードでパネル表示
save〇〇()         → 保存＆persist()
delete〇〇(id)     → 削除＆persist()
```

### フィルター（Excel風）
```js
xfBind(tableId, tbodyId, {afterFilter})  // テーブルにフィルター機能を紐付け
xfOpen(tableId, colIdx, btn)             // ▾ボタンクリックでドロップダウン表示
xfApplyAndClose(tableId)                 // 閉じるボタン押下で実行（遅延実行）
xfApply(tableId)                         // フィルター＆ソート適用
```
- フィルターは**閉じるボタン押下時に実行**（チェック変更時は即時適用しない）
- `afterFilter` コールバックで合計行を動的更新（div-sim, an-holdings）

### ユーティリティ
```js
fmt(n)          // ¥1,234,567 形式
el(id)          // document.getElementById 省略形
uid()           // ユニークID生成
persist()       // D を localStorage に保存
calcTotals()    // {cash, inv, ideco, total} を返す
acBadge(acc)    // 口座種別バッジHTML（<span class="badge ...">）
atBadge(type)   // 銘柄種別バッジHTML
buildAccountOptions(selId, val)    // select要素に口座種別を動的生成
buildAssetTypeOptions(selId, val)  // select要素に銘柄種別を動的生成
```

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
| `.tbl-wrap` | テーブルを角丸枠で囲む |
| `.add-panel` / `.add-panel.open` | 追加/編集フォームパネル |
| `.xf-btn` / `.xf-active` | フィルターボタン（▾） |
| `.g2` `.g3` `.g4` | 2/3/4カラムグリッド |

## GitHub Pages
- URL: https://nanopeta.github.io/asset-formation/
- push すれば自動で反映（1〜2分）
