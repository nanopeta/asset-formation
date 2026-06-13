# 資産形成ダッシュボード

## ドキュメント更新ルール（必須）
**機能を実装・変更したら、コミット前に必ず以下を更新すること：**
- `README.md` — 機能一覧・使い方の説明を最新状態に
- `TODO.md` — 完了タスクを `[x]` に、新規検討事項を `[ ]` に追加
- `CLAUDE.md` — データ構造・関数・CSS クラス等の変更を反映
- `CHANGELOG.md` — バージョンと変更内容を記録
- `index.html` — ヘルプモーダル更新履歴（`id="help-pane-changelog"`）に changelog-entry を追記
  - バージョンバッジをクリックして開くモーダルの「更新履歴」タブ
  - 最新バージョンが先頭になるよう追加すること
  - 新機能は「使い方」タブ（`id="help-pane-usage"`）の該当セクションにも追記を検討

### 自動チェック（二重防止策）
ドキュメント更新漏れを防ぐ2つのフックが設定されている。

**① git pre-commit フック**（`scripts/pre-commit`）
- `app.js` / `style.css` / `index.html` が変更されたのに MD ファイルが1つも変更されていない場合、コミットをブロック
- キャッシュバスターの4箇所（APP_VERSION / CACHE / ?v=N × 2）が不一致の場合もブロック
- `git config core.hooksPath scripts` で有効化済み（新規クローン時は再実行が必要）
- スキップする場合: `git commit --no-verify`（意図的な場合のみ）

**② Claude Code PostToolUse フック**（`.claude/hooks/doc-reminder.sh`）
- Claude が `Edit` / `Write` ツールで `app.js` / `style.css` / `index.html` を変更した直後に、ドキュメント更新チェックリストをターミナルに表示
- `.claude/settings.json` で設定済み（`PostToolUse` → `Edit` / `Write`）

## PR マージルール（必須）
- PR 作成後は確認なしで即マージすること（「マージしますか？」と聞かない）
- マージ方式: squash merge

## Git 操作ルール（必須）
- **変更は必ずコミットしてからプッシュする**
- `git reset --hard` は未コミット変更を破棄するため、変更前に実行しないこと
- 正しい順序: 変更 → コミット → `git push --force-with-lease`
- mainとの同期が必要な場合も、先にコミットしてからpushする

## ファイル構成
| ファイル | 役割 | 行数目安 |
|---|---|---|
| `index.html` | UI構造・タブ・テーブル定義 | ~1,360行 |
| `app.js` | ロジック全般・レンダリング | ~1,990行 |
| `style.css` | スタイル | ~590行 |
| `sw.js` | Service Worker（キャッシュ・通知） | ~45行 |
| `manifest.json` | PWA マニフェスト | ~30行 |

## グローバル定数（app.js 先頭）
```js
APP_VERSION  // バージョン文字列（例: 'v104'）。キャッシュバスターと同じ番号
TAX_RATE     // 0.20315 — 源泉分離課税率（所得税 15% + 住民税 5% + 復興税 0.315%）
             // 税率を直書きせず必ずこの定数を使うこと。6箇所以上で参照
```

## キャッシュバスター（重要）
`index.html` の末尾付近で `app.js` と `style.css` をバージョン付きで読み込んでいる。
**`app.js` または `style.css` を変更したときは、必ず以下の4箇所を同時に上げること。**
```html
<link rel="stylesheet" href="style.css?v=N">  <!-- index.html -->
<script src="app.js?v=N"></script>             <!-- index.html -->
```
```js
const APP_VERSION='vN';  // app.js 冒頭（ヘッダーバッジに反映）
```
```js
const CACHE = 'asset-dashboard-vN';  // sw.js 冒頭（Service Workerキャッシュ）★忘れると古いファイルがPWAで使われ続ける
```
4箇所のうち1つでも上げ忘れると、ブラウザ・PWAのキャッシュが古いままになる。

## 過去に起きた重大バグ（再発防止）

### uid() 未定義バグ（2026-05-07）
`load()` 内でマイグレーションコードに `uid()` を使ったところ、`uid` の定義が `let D=load()` より後にあるため
`ReferenceError: uid is not defined` が発生。try/catch に捕まり `makeDefault()` が返り、**ユーザーデータが全消去される**事象が発生。

**対策**: `load()` 内では `uid()` を使わず、`'sp'+Date.now()+index` 等のインラインIDを使うこと。

## localStorage キー
| キー | 内容 |
|---|---|
| `asset-v3` | メインデータ `D`（下記データ構造） |
| `asset-v3-ts` | 最終更新タイムスタンプ（ISO 8601） |
| `asset-theme` | ダークモード設定（`'dark'` / `'light'`） |
| `asset-privacy` | プライバシーモード設定（`'1'` = ON）。D の外に保存しエクスポート JSON を汚さない |
| `asset-last-export` | 最終 `exportAll()` 日時（ISO 8601、バックアップリマインダー判定用）。`importAll()` 成功時も更新 |

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
    hiddenSections: [],        // ダッシュボードセクションの非表示設定（非表示にするセクションIDの配列、includes()で判定）
    aiMemo: '',                // 資産形成方針メモ（AI分析用エクスポートの冒頭に出力される自由記述）
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
  pointAccounts:[ {id, name, note, order} ],  // ポイント口座（楽天ポイント等）
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
    pointValues:  { [id]: 数値 },  // ポイント残高（calcTotals()で現金合計に加算）
    nisa: { year, seichouUsed, tsumitateUsed, lifetimeUsed, seichouLifetimeUsed }
  },
  snapshots: [ {month, note, bankValues, cardValues, pointValues, holdingValues, idecoValues, idecoActualPrincipal, nisa, cash, investment, idecoTotal, total} ]
  //  note: スナップショットメモ（記録タブの「メモ」欄、任意）
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
  'cash':           {label, badge:'b-gray',   color: 設定で変更可能},  // 現金（銀行残高）種別合計ドーナツに使用
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
メインタブ: overview / analysis / simulations / record / settings
  overview     → （サブタブなし）
    セクションID: sec-summary, sec-schd, sec-nisa, sec-portfolio
  analysis     → （サブタブなし）
    セクションID: sec-trend, sec-gainloss, sec-detail
  simulations  → （サブタブなし）
    セクションID: sec-sim, sec-reinvest, sec-div-cal, sec-div-sim,
                   sec-ideco-sim, sec-fire, sec-drawdown, sec-tax
  record       → rec-banks / rec-holdings
  settings     → set-holdings / set-accounts / set-basic
```
- 各タブ内先頭に `.dash-qnav` が子要素として配置（親のdisplay:none/blockに追従）
- **シミュタブはセグメント切替**: pill は `data-show` 属性を持ち、`showSimSection(id)` で選んだ1セクションのみ表示（遅延レンダリング）。概要・分析タブの pill は従来通り `data-scroll`（スクロールジャンプ＋スクロール連動ハイライト）
- セクションの表示/非表示は `D.settings.hiddenSections` で制御（`renderHiddenSectionSettings()` / `saveHiddenSections()`）

### URLハッシュ同期（v104）
- タブ・サブタブは URL ハッシュに同期される（例: `#overview` / `#record/holdings` / `#settings/basic`）
- `_syncHash()` — `_doSwitchTab()` / `switchSubTab()` の末尾で `history.pushState`。`_navByHash` フラグ中はスキップ
- `_applyHashNav()` — ハッシュを解析してタブ・サブタブを復元（`popstate` と初期ロードで呼ばれる）
- `_modalHist()` — モーダル/パネルを開くとき履歴を1段積む → 戻るボタンで閉じられる（openHelp / showAssetReport / openSnapCompare / showSnapSummary / customConfirm / openCmdPalette / `_panelOpen` が呼ぶ）
- `closeTopModal()` — 最前面のモーダル/パネルを1つ閉じて true を返す（ESC キーと `popstate` で共用）。`_anyModalOpen()` はショートカットのガード用
- 現在のサブタブは `_curSub={rec,set}` で追跡

## 主要関数の場所（app.js）

### レンダリング
| 関数 | 役割 |
|---|---|
| `renderOverview()` | 概要タブ再描画（sec-summary/schd/nisa/portfolio）＋スナップ／バックアップリマインダー表示判定 |
| `renderAnalysis()` | 分析タブ再描画（sec-trend/gainloss/detail） |
| `renderSimulations()` | シミュタブ再描画（`showSimSection(_simActive)` を呼ぶだけ） |
| `showSimSection(id, scroll)` | シミュタブのセグメント切替。選んだ1セクションのみ表示＋`_renderSimSection(id)` で遅延レンダリング。hiddenSections を考慮 |
| `_renderSimSection(id)` | セクションID→レンダラーのディスパッチ（sec-sim→renderScdSimTable 等） |
| `renderScdSimTable()` | SCHD到達シミュテーブル（sim-cur/sim-eta 等。旧 renderAnalysisData から分離） |
| `renderDashboard()` | 互換性ラッパー（renderOverview+renderAnalysis+renderSimulationsを順呼び出し） |
| `renderDashHero(...)` | ヒーローカード＋サマリーカード描画（renderDashboard内サブ関数） |
| `renderDashScdStrip(...)` | 対象銘柄元本ストリップ描画 |
| `renderDashNisaSection(mo)` | NISAカード＋今年の投資計画描画 |
| `renderPortfolio(totalInv)` | ドーナツチャート＋銘柄比率テーブル＋目標配分バー |
| `renderAllocationBars(items)` | 目標配分テーブル（実績・目標・差分・買い増し目安額） |
| `renderAnalysisData()` | 詳細分析（口座別・種別ドーナツ＋テーブル、銘柄別一覧）。種別合計に現金を含み、凡例クリックでテーブル行連動。銘柄別一覧セルに `data-label`（モバイルカード表示用） |
| `_renderHeroSpark(snaps, total)` | ヒーロー内ミニスパークライン（`#hero-spark`、直近12ヶ月＋現在値。素のcanvas描画・Chart.js不使用） |
| `renderAssetReport()` | 資産分析レポート（口座別・種別バー比較＋インサイト12条件の自動診断）|
| `openAssetReport()` | レポートモーダル表示（`#report-modal`）＋`renderAssetReport()` 呼び出し |
| `closeAssetReport()` | レポートモーダル非表示 |
| `renderDivCalendar()` | 配当カレンダー（月別受取スケジュール・棒グラフ） |
| `renderDividendSim()` | 配当シミュレーションテーブル |
| `renderSCHDReinvest()` | 分配金再投資シミュレーション（年数・積立・再投資なし・目標月収・折れ線チャート） |
| `buildReinvestHoldingOptions()` | 再投資シミュ用銘柄セレクト生成 |
| `_populateReinvestFromHolding(id)` | 選択銘柄から再投資シミュ入力欄へ値をコピー |
| `renderFire()` | FIRE達成シミュレーション（必要資産・達成年数・プログレスバー） |
| `renderIdecoSim()` | iDeCo受取シミュレーション（一時金・年金方式、退職所得控除・税額計算） |
| `renderDrawdown()` | FIRE取崩しシミュレーション（資産枯渇年計算・折れ線チャート） |
| `renderTaxEstimate()` | 税金概算（配当税・潜在税・NISA非課税メリット、特定口座銘柄別内訳テーブル付き） |
| `renderTrendChart()` | 資産推移折れ線チャート（`_filteredSnaps()` で期間フィルター。メモ付き月はポイント強調＋ツールチップ `afterBody` でメモ表示。SCHD元本/目標ラインは `hidden:true` で凡例トグル） |
| `renderGainLossChart()` | 損益推移チャート（含み損益＋損益率%右軸、`trendPeriod` を資産推移と共有） |
| `_snapPrincipal(s)` / `_snapGain(s)` | スナップショットの投資元本／含み損益を計算（資産推移・損益推移で共用） |
| `_filteredSnaps()` | `trendPeriod` 適用済みスナップ配列（0=全期間 / `'ytd'`=今年 / N=直近N件） |
| `_emptyChartNote(ctx)` | スナップ0件時のチャートプレースホルダーテキスト描画 |
| `setTrendPeriod(months, btn)` | 期間フィルターボタン切り替え＋資産推移・損益推移の両チャート再描画（`'ytd'` も受け付ける） |
| `renderRecordTab()` | 記録タブ全体（末尾で `_updateRecProgress()`） |
| `_recFields()` | 進捗カウント対象の入力ID一覧（銘柄/iDeCo/銀行/カード/ポイント、サブタブ情報付き） |
| `_updateRecProgress()` | sticky バーの入力進捗インジケーター更新（markUnsaved/clearUnsaved から呼ばれる） |
| `jumpToNextEmpty()` | 最初の未入力欄へサブタブ切替＋スクロール＋フォーカス |
| `renderSettings()` | 設定タブ全体 |
| `autoFillNisa()` | NISA使用額を積立月数×月次額で自動計算して入力欄へ反映 |
| `calcIdecoEstimatedPri()` | iDeCo累計拠出元本を自動推計（開始月×月次拠出合計） |
| `calcIncomeTax(income)` | 所得金額から所得税額を計算（累進課税テーブル） |
| `showSnapSummary(month, snap, prev)` | スナップショット保存後の月次サマリーモーダル表示 |
| `customConfirm(msg, onOk, opts)` | ブランデッド確認ダイアログ（`#confirm-modal`）。`opts.okLabel` / `opts.okClass` / `opts.html` を指定可。ブラウザ標準 `confirm()` の代替 |
| `renderNisaBar(prefix, used, max)` | NISA枠バー描画。`used>max` 時は `fill-red` クラス付与＋「超過 ¥xxx」表示。負数は先頭で0にクランプ |
| `toast(msg, type, opts)` | トースト通知。`opts={actionLabel, onAction, duration}` でアクションボタン付きトースト（削除Undoに使用、デフォルト5秒） |
| `_chartRender(chart, ctx, config)` | Chart.js インプレース更新ヘルパー。ラベル数・データセット数が同じ場合は `chart.update('active')`（data/色/pointRadius/pointBackgroundColor を反映）、異なる場合は `destroy`＋`new Chart()` |
| `APP_VERSION` | バージョン文字列定数（例: `'v104'`）。キャッシュバスターと同じ番号に保つこと。`init()` で `#app-version-badge` にセット |
| `applyTheme(dark)` | ダークモードクラス（`.dark-mode`）を付け替え＋🌙/☀ボタンテキスト更新 |
| `toggleTheme()` | ダークモード設定を localStorage に保存して `applyTheme()` を呼び出し |
| `applyPrivacy(on)` | `_privacy` フラグ＋body の `.privacy-mode` クラスを切り替え |
| `togglePrivacy()` | プライバシーモード設定を `localStorage 'asset-privacy'` に保存して全タブ再描画（fmt/fmtMan がマスク表示に切替） |
| `updateTodayDate()` | `#today-date` に当日の日付（曜日付き）をセット |
| `updateTs()` | `#last-updated` に最終保存タイムスタンプをセット |
| `prevSnap()` | `D.snapshots` の最終エントリを返す（前月比計算・スナップ差分表示に使用） |
| `copyPrevSnap()` | 前月スナップを当月の入力フィールドに一括コピー（確認トースト付き） |
| `openSnapCompare()` | スナップ比較モーダル（`#snap-compare-modal`）を表示 |
| `markUnsaved()` | `_unsaved = true` ＋未保存インジケーター表示（`.rec-unsaved` アニメーション）＋FABを未保存色に＋進捗更新 |
| `clearUnsaved()` | `_unsaved = false` ＋未保存インジケーター非表示＋FAB色リセット＋進捗更新 |
| `openCmdPalette()` / `closeCmdPalette()` | コマンドパレット（`#cmd-modal`、Ctrl+K / Cmd+K）の開閉 |
| `_cmdItems()` | パレットの検索対象（ページ・セクション・操作・銘柄）を動的生成 |
| `_cmdFilter(q)` / `_cmdRenderList()` / `_cmdRun(i)` | 絞り込み（最大10件）・リスト描画・実行 |
| `_flashHoldingRow(name)` | 分析タブ銘柄別一覧の該当行へスクロール＋ハイライト（`.row-flash`、パレットの銘柄ジャンプ用） |
| `requestNotifPermission()` | ブラウザ通知権限リクエスト＋Periodic Background Sync 登録 |
| `_registerPeriodicSync()` | Service Worker Periodic Sync 登録（月末リマインダー用） |
| `_renderNotifStatus()` | ヘッダーの通知ステータス（🔔/🔕）を更新 |
| `openHelp(tab)` | ヘルプモーダル（`#help-modal`）を表示。`tab`: `'usage'`\|`'changelog'` |
| `closeHelp()` | ヘルプモーダル非表示 |
| `switchHelpTab(tab)` | ヘルプモーダル内タブ切り替え |
| `exportCsvSelected()` | 列選択ダイアログ付きスナップショット CSV エクスポート |
| `_exportCsv(rows, filename)` | rows 配列を CSV フォーマットしてダウンロード |
| `exportAiReport()` | AI分析用 Markdown エクスポート（口座・銘柄・iDeCo・NISA枠・設定情報・方針メモを含む `.md`）|
| `_csvRow(cells)` | CSV 行をクォート/エスケープして文字列化 |
| `importRakuten(e)` | 楽天証券 CSV インポート（Shift-JIS/UTF-8 自動判定） |
| `_parseRakutenRows(text)` | 楽天 CSV 解析（カテゴリ→銘柄種別マッピング・USD 検出） |
| `_parseJpNum(str)` | 「¥1,234」形式 → 数値変換 |
| `_parseCsvLine(line)` | クォート対応 CSV ライン解析 |
| `_applyRakutenRows(result)` | 楽天 CSV 結果を保有銘柄にマージ（確認ダイアログ付き） |
| `renderHiddenSectionSettings()` | ダッシュボードセクション表示/非表示チェックボックスを設定タブに描画 |
| `saveHiddenSections()` | 非表示設定を `D.settings.hiddenSections` に保存 |
| `renderCsvYearSel()` | CSV エクスポートの年フィルターセレクトを生成 |
| `getDivMonthsFromPanel()` | 配当月チェックボックスグリッドから `[1-12]` 配列を読み取り |
| `setDivMonthsOnPanel(months)` | 配当月チェックボックスグリッドに状態をセット |
| `dragStart(e)` | ドラッグ開始: `data-drag` 属性をセット |
| `dragOver(e)` | デフォルト抑止＋ドロップ視覚フィードバック |
| `dragLeave(e)` | ドロップ視覚フィードバック除去 |
| `drop(e)` | 配列を再並び替えして `persist()` |
| `dragEnd(e)` | ドラッグ状態クリア |
| `_dragCell(group, id)` | ドラッグ列セルHTML生成（⠿＋モバイル用 ▲▼ ボタン `.row-move`）。設定タブの全テーブルで使用 |
| `moveRow(group, id, dir)` | 行を上下に移動（dir=±1）。グループは drop() と同じ（regular/ideco/bank/card/broker/point/acctype/assettype） |

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
initQnavHighlight()    // スクロール連動ハイライト（概要・分析タブの data-scroll pill のみ対象）
qScroll(id)            // 指定セクションIDへスムーズスクロール（offset=160px）
showSimSection(id)     // シミュタブのセグメント切替（data-show pill。1セクションのみ表示＋遅延レンダリング）
```
- 概要タブ pill（data-scroll）: 概要 / SCHD / NISA / ポートフォリオ
- 分析タブ pill（data-scroll）: 資産推移 / 損益推移 / 詳細分析
- シミュタブ pill（data-show）: 資産シミュ / 再投資 / 配当カレンダー / 配当シミュ / iDeCoシミュ / FIRE / 取崩し / 税金概算（`_SIM_SECS` 配列・`_simActive` で現在地を保持）
- 旧シミュレーションドロップダウン（`toggleQnavSim` / `.qnav-dropdown`）は v101 のページ分割以降未使用（CSS・関数は残存）

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
fmt(n)            // ¥1,234,567 形式（プライバシーモード中は '¥•••••'）
fmtMan(v)         // ¥123.4万 形式（チャートY軸用。プライバシーモード中は '¥•••'）
fmtMonths(months) // 月数を「N年Mヶ月」形式に変換
formatMonth(d)    // Date → 'YYYY-MM' 文字列（月セレクト・スナップキー生成に使用）
el(id)            // document.getElementById 省略形
uid()             // ユニークID生成（※load()内では使用不可→インラインIDを使うこと）
persist()         // D を localStorage に保存（約5MBの80%超過時に warn トースト、_storageWarned でセッション1回）
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
deleteSnap(month) // 指定月のスナップショット削除（「元に戻す」トースト付き）
// delete系（Bank/Point/Card/Holding/Ideco/Snap）は削除後10秒間トーストの「元に戻す」で復元可能
//   （削除前に findIndex で位置を捕獲し splice で復元。broker/口座種別/銘柄種別は対象外）
filterTable(tbodyId, query) // tbodyをテキスト検索でフィルター（簡易版）
randomAccColor()  // 口座種別カラーピッカーで未使用色をランダム選択
randomAssetColor() // 銘柄種別カラーピッカーで未使用色をランダム選択
_buildCardBankOptions(val) // カード設定パネルの引き落とし口座セレクトを生成
_flashBtn(id)     // ボタンを一時的に緑「✓ 完了」に変える（2秒後に戻る）
_panelOpen(id)    // 設定パネルを開く（モーダル表示＋バックドロップ有効化＋_modalHist()＋最初の入力欄へ自動フォーカス）
_panelClose(id)   // 設定パネルを閉じる（バックドロップ非表示）
// --- 金額スマート入力（v104） ---
_moneyEval(raw, base)   // 入力文字列を解析（カンマ除去・「万」×10000・先頭+/-でbaseに増減）。{v, op} か null（解析不能）
_moneyNormalize(input)  // input.money の値をプレーン数値に正規化して dataset.base を更新（focusout で発火）
_normalizeAllMoney()    // 全 input.money を正規化（saveSnapshot() 冒頭で呼ぶ — blur 前の値も確実に確定）
_showMoneyHint(input) / _hideMoneyHint() // #money-hint に円換算プレビュー表示（position:fixed）
initMoneyInputs()       // focusin/input/focusout の委譲リスナー登録（init() から）
// 対象: 記録タブの rb-/rc-/rp-/hv-/hp-/rec-ideco-actual-pri（type="text" inputmode="decimal" class="hi money"）
// 読み手は Number(el.value) のままでOK（正規化済みプレーン数値が入る）
_triggerExport(blob, filename, btnId, onDone) // iOS対応エクスポート（Web Share API優先、fallbackでダウンロード。onDone は成功時のみ呼ばれる）
_markExported()   // 'asset-last-export' を現在時刻に更新＋renderOverview()（バックアップバナー消去）
exportSettings()  // 設定のみJSONエクスポート（accountTypeOverrides/assetTypeOverrides含む）
exportAll()       // 全体バックアップJSONエクスポート
exportAiReport()  // AI分析用Markdownエクスポート（asset-report-YYYY-MM-DD.md）。プライバシーモード中も try/finally で一時解除して実値を出力
printReport()     // 印刷ヘッダー(#print-header)にKPIを書き込んでwindow.print()を呼び出す
handleTitleClick() // h1クリック時のリロード処理。_unsaved=true の場合は customConfirm() を表示してリロードをブロック
renderPointInputs() // 記録タブのポイント残高グリッドを再描画
renderPointsTable() // 設定タブのポイント口座テーブルを再描画
// ポイント口座 CRUD: openPointPanel / closePointPanel / editPoint / savePoint / deletePoint
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
let chartGainLoss = null;    // 損益推移折れ線
let trendPeriod = 0;         // 期間フィルター（0=全期間、'ytd'=今年、3/6/12=直近N件。資産推移・損益推移で共有、_filteredSnaps()で適用）
```
チャートの再描画は `_chartRender(chart, ctx, config)` ヘルパーを使うこと（直接 `new Chart()` しない）。
データ数が同じ場合はインプレース更新（`chart.update('active')`）、異なる場合のみ destroy＋再生成。
配当カレンダー（`renderDivCalendar`）は `<canvas id="div-cal-chart">` を永続化しているため innerHTML を毎回上書きしないこと。

### チャート Y軸の「万」表記（姉妹アプリと統一）
折れ線・棒グラフの Y 軸ラベルは `fmtMan`（`'¥'+(v/10000).toFixed(1)+'万'`、プライバシーモード対応）で統一する（例: `¥1234.5万`）。
対象: 資産推移（`renderTrendChart`）・損益推移（`renderGainLossChart`）・分配金再投資シミュ（`renderSCHDReinvest`）・FIRE取崩しシミュ（`renderDrawdown`）。
配当カレンダー（`renderDivCalendar`）は1万円未満の値を実額表示する特殊ロジック（`_privacy` チェック内包）のため対象外。
ツールチップの金額は `fmt()` 経由でフォーマットすること（プライバシーモードのマスク漏れ防止）。

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
- `.an-summary` は CSS の `::before` で丸型の左アクセントバー（`width:4px;height:16px;border-radius:99px;background:var(--accent)`）を自動付与する（HTML側でのバー要素追加は不要）。`.trend-summary` 併用時は最初の `<span>` 内に表示されるよう個別ルールあり

### カードタイトルの標準スタイル（姉妹アプリ「給与明細ダッシュボード」と統一）
左に丸型アクセントバー＋タイトルの構成で統一する。`.an-summary` は CSS のみでこのパターンを実現済み（上記参照）。新規セクションを追加する場合も `.an-summary` をそのまま使えばよい。

## タイポグラフィ（行間）変数（v105〜）
`:root` に行間トークンを定義。`body` の基本行間は `--lh-base`。フォントサイズは px 直書き（数が少ないため変数化していない）。
```css
--lh-tight:1.3;    /* 密なラベル（.csub 等）。折り返し時に詰めたい箇所 */
--lh-base:1.5;     /* body 既定。折り返すテキスト全般に効く */
--lh-relaxed:1.6;  /* 多行プローズ用（必要に応じて） */
```
- フォントサイズの下限目安は 9px（`.div-cal-val` / `.row-move button`）。ラベル類は 10〜11px。テーブル `th`(11)/`td`(13)・`.badge`・KPI（`.cval`/`.sum-val`/`.hero-value`）の寸法は密度維持のため変更しないこと。
- モバイル入力欄（`.fg input,.fg select,.hi`）は `@768px` で **14px**（Android/PC 最適）。iOS Safari のみ `@supports (-webkit-touch-callout: none)`（iOS 専用フック）で **16px** に上書きし、フォーカス時の自動ズームを防止する（iOS は font-size<16px でズームする）。`.rec-sticky-inner` のセレクト/月入力も同 iOS フックに含む。**この14px/16pxの出し分けは崩さないこと**（数値を下げると Android で過大、上げると iOS でズーム）。

## CSS 主要クラス
| クラス | 用途 |
|---|---|
| `.dark-mode` | ダークモード ルートクラス（CSS変数を一括オーバーライド） |
| `.sidebar` / `.sidebar-brand` / `.sidebar-nav` / `.sidebar-foot` / `.sidebar-meta` / `.sidebar-sister-link` | PC用サイドバー（左固定 `--sidebar-w`=224px）。タイトル・バージョンバッジ・ナビ・日付/最終更新・テーマ切替・姉妹アプリリンクを集約 |
| `.mobile-header` / `.mobile-header-actions` / `.icon-btn` | スマホ用ヘッダー（タイトル・バージョンバッジ・テーマ切替・姉妹アプリリンクを横並び表示） |
| `.bottom-nav` / `.bn-label` | スマホ用ボトムナビ（固定下部、ダッシュボード/記録/設定の3ボタン） |
| `.nav-ico` | 共通アウトラインSVGアイコン（`width:18px;height:18px;stroke="currentColor"`）。ボトムナビでは `width:22px;height:22px` に上書き |
| `.tt-ico` | テーマ切替ボタン内アイコンwrapper span。`.ico-moon`（デフォルト表示）と `.ico-sun`（`.dark-mode` 時表示）の2つのSVGを内包。CSS-only切替のため `applyTheme()` では操作不要 |
| `.ico-moon` / `.ico-sun` | テーマ切替用moon/sun SVGクラス。`.dark-mode .tt-ico .ico-moon{display:none}` / `.dark-mode .tt-ico .ico-sun{display:inline-flex}` でCSSのみで切り替え |
| `.app-version-badge` / `.today-date` / `.last-updated` / `.theme-toggle` | サイドバーとモバイルヘッダーの両方に存在する共通クラス。`id` ではなく `querySelectorAll` で同期更新（`updateTodayDate()` / `updateTs()` / `applyTheme()` / `init()`） |
| `.rec-sec` / `.rec-sec-head` / `.rec-sec-body` | 記録・設定タブの白カードセクション |
| `.an-block` / `.an-summary` / `.an-body` / `.an-divider` | ダッシュボード分析セクション / 区切り線 |
| `.tbl-wrap` | テーブルを角丸枠で囲む（overflow-x:auto） |
| `.tbl-wrap.tbl-scroll` | スクロール固定テーブル（max-height:380px・sticky thead） |
| `.tbl-head` | テーブル上部のsticky見出し（白背景グラデーション） |
| `.add-panel` / `.add-panel.open` | 追加/編集フォームパネル（`.open`時はモーダルとして表示） |
| `#settings-backdrop` / `#settings-backdrop.active` | モーダル背景オーバーレイ（blur付き） |
| `.xf-btn` / `.xf-active` | フィルターボタン（▾） |
| `.xf-dropdown` | フィルタードロップダウン本体（`position:fixed` / `body`直下） |
| `.xf-sort-btns` / `.xf-sep` / `.xf-scroll` / `.xf-row` / `.xf-actions` | フィルタードロップダウン内部構造 |
| `.g2` `.g3` `.g4` | 2/3/4カラムグリッド |
| `.fi` / `.fi-wrap` | フレキシブル入力グループ（モバイルで折り返し） |
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
| `.hi` / `.hi-warn` | 入力欄ハイライト / 含み損ハイライト（黄色背景） |
| `.div-months-grid` / `.div-month-cb` | 配当月チェックボックスグリッド |
| `.div-cal-grid` / `.div-cal-col` / `.div-cal-val` / `.div-cal-bar-wrap` / `.div-cal-bar` / `.div-cal-label` | 配当カレンダーカスタム棒グラフ（12ヶ月グリッド） |
| `.snap-modal` / `.snap-modal-card` / `.snap-row` | 月次サマリーモーダル |
| `.alloc-title` / `.alloc-table` | 目標配分セクション |
| `.chart-wrap` / `.chart-h300` | チャートコンテナ（標準220px / 高さ300px） |
| `.fill-blue` `.fill-orange` `.fill-green` `.fill-purple` `.fill-red` | プログレスバー色 |
| `.toast` / `.toast-show` / `.toast-error` / `.toast-success` / `.toast-warn` | トースト通知（5秒・× 閉じるボタン付き） |
| `.toast-close` | トースト内 × 閉じるボタン |
| `.toast-action` | トースト内アクションボタン（削除Undoの「元に戻す」等） |
| `.privacy-mode` | プライバシーモード ルートクラス（body に付与。fmt/fmtMan のマスクは JS 側 `_privacy` フラグで制御） |
| `.privacy-toggle` / `.pv-ico` / `.ico-eye` / `.ico-eye-off` | プライバシー切替ボタンとアイコン。`.tt-ico` と同じ CSS-only 切替パターン（`.privacy-mode .pv-ico .ico-eye{display:none}` 等） |
| `#backup-reminder` | バックアップリマインダーバナー（`.snap-reminder` クラスを共用、概要タブ） |
| `.help-modal-card` / `.help-modal-header` / `.help-tabs` / `.help-tab-btn` / `.help-pane` | ヘルプモーダル構造 |
| `.help-section` / `.help-step` / `.help-feature-list` / `.changelog-entry` | ヘルプモーダル内コンテンツ |
| `.report-trigger-btn` / `.report-modal-card` / `.report-modal-head` | 資産分析レポートモーダル |
| `.report-bars` / `.report-bar-row` / `.report-bar-track` / `.report-bar-fill` / `.report-bar-val` | レポートモーダル バー要素 |
| `.report-insight` / `.report-insight-good` / `.report-insight-warn` / `.report-insight-info` / `.report-insight-danger` | インサイト診断表示 |
| `.print-hdr-title` / `.print-hdr-date` / `.print-kpi` / `.print-kpi-item` / `.print-kpi-label` / `.print-kpi-val` | 印刷/PDF ヘッダーとKPI（`@media print` で表示） |
| `.fire-hint` | FIRE シミュレーションのプレースホルダーテキスト |
| `.strip-eta-pre` | SCHD ストリップの到達予想プレラベル |
| `.clabel` / `.cval` / `.cval-lg` / `.csub` | 詳細分析カードのラベル/値/サブテキスト |
| `.ov-cols` / `.ov-col` | 概要タブ2カラムレイアウト（1100px以上で grid 2列、未満は `display:contents` で縦積みに透過） |
| `.hero-spark` | ヒーロー内スパークライン canvas（150×40px、白系線） |
| `.rec-progress` / `.rec-prog-item` / `.rec-prog-done` | 記録タブ入力進捗インジケーター（完了グループは緑） |
| `.rec-fab` / `.rec-fab-unsaved` | スマホ用保存FAB（768px以下で表示。未保存時はオレンジ＋パルス） |
| `.money-hint` / `#money-hint` | 金額入力の円換算ヒント（position:fixed、単一要素を使い回し） |
| `.row-move` | 並び替え ▲▼ ボタン（drag-handle セル内、768px以下でのみ表示） |
| `.cmd-modal` / `.cmd-card` / `#cmd-input` / `.cmd-list` / `.cmd-item` / `.cmd-sel` / `.cmd-kind` / `.cmd-hint` | コマンドパレット（Ctrl+K） |
| `.row-flash` | 銘柄ジャンプ時の行ハイライト（2.4秒で解除） |
| `.mtbl` / `.mtbl-rec` / `.mtbl-an` | モバイルカード型テーブル（768px以下で thead 非表示・tr を2列グリッド化・`data-label` 属性をセルラベルとして表示。`-rec`=記録タブ銘柄/iDeCo、`-an`=銘柄別一覧） |

## init() の主な初期化処理
```js
init()  // アプリ起動時の初期化
  // - 記録月を当月に設定
  // - ダークモード適用（localStorage 読み込み → applyTheme()）
  // - プライバシーモード適用（localStorage 読み込み → applyPrivacy()）
  // - 今日の日付表示（updateTodayDate()）
  // - 通知ステータス表示（_renderNotifStatus()）
  // - クイックナビを表示
  // - settings-backdrop クリックでパネルを一括閉じ
  // - keydown ハンドラ: Ctrl+K=コマンドパレット / Ctrl+S=保存 / ESC=closeTopModal() /
  //   Tab=設定パネル内フォーカストラップ / 1〜5=タブ切替 / ?=ヘルプ（入力中・モーダル中は無効）
  // - wheel ハンドラ: type=number フォーカス中のホイールで blur（誤入力防止）
  // - initTabEvents / initRecordEvents / initSettingsEvents / initQnavHighlight /
  //   initMoneyInputs / initCmdPalette 呼び出し
  // - renderOverview / renderRecordTab 呼び出し
  // - popstate リスナー登録＋URLハッシュからタブ復元（_applyHashNav()）
```

## GitHub Pages
- URL: https://nanopeta.github.io/asset-formation/
- push すれば自動で反映（1〜2分）

## 姉妹アプリ「給与明細ダッシュボード」とのUI規約共通化
家計管理系アプリ間でUX統一するための取り組み。配色（`--primary`/`--success`/`--danger`/body背景色等）・`fmt()`の¥表記・StatCard相当のグラデーション（`.hero`）は元々一致している。
追加で以下を統一済み（v97）：
- 分析セクションのカードタイトル左アクセントバー（`.an-summary` の `::before`、丸型 `width:4px;height:16px;border-radius:99px`）
- チャートY軸の「万」表記（`'¥'+(v/10000).toFixed(1)+'万'`）
- タブ切替時のスクロールリセット（`_doSwitchTab()` 内 `window.scrollTo(0,0)`）

### 今後の検討事項（大きな構造変更のため未着手）
- レイアウトのSidebar/BottomNav化（現状はヘッダー＋上部タブナビ。変更には大規模なマークアップ・CSS再設計が必要）
- プライバシーモード機能の新規実装（`usePrivacy()` 相当。本アプリには現状その機能自体が存在しない）
- チャートライブラリのRecharts移行（現状はChart.jsで統一済み。移行は大規模な書き換えになる）
