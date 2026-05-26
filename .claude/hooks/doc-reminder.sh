#!/bin/bash
# Claude Code PostToolUse フック: コードファイル編集後にドキュメント更新をリマインド

INPUT=$(cat)

# 編集されたファイルパスを取得
FILE=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except:
    print('')
" 2>/dev/null || echo "")

BASENAME=$(basename "$FILE")

case "$BASENAME" in
  app.js|style.css)
    echo ""
    echo "════════════════════════════════════════════════════"
    echo "📝 [ドキュメント更新リマインダー]"
    echo "  '$BASENAME' を変更しました。コミット前に確認:"
    echo ""
    echo "  □ README.md    — 新機能・変更を特徴/機能一覧に追記"
    echo "  □ TODO.md      — 完了タスクを [x] に / バグ・改善を [ ] に"
    echo "  □ CLAUDE.md    — 関数・データ構造・CSSクラスの変更を反映"
    echo "  □ CHANGELOG.md — バージョンと変更内容を記録"
    echo "  □ index.html   — ヘルプモーダル更新履歴（#help-pane-changelog）に追記"
    echo ""
    echo "  □ キャッシュバスター 4箇所を同期:"
    echo "      app.js      APP_VERSION='vN'"
    echo "      sw.js       CACHE = 'asset-dashboard-vN'"
    echo "      index.html  style.css?v=N"
    echo "      index.html  app.js?v=N"
    echo "════════════════════════════════════════════════════"
    ;;
  index.html)
    echo ""
    echo "════════════════════════════════════════════════════"
    echo "📝 [ドキュメント更新リマインダー]"
    echo "  'index.html' を変更しました。コミット前に確認:"
    echo ""
    echo "  □ README.md    — 新機能・変更を特徴/機能一覧に追記"
    echo "  □ TODO.md      — 完了タスクを [x] に / バグ・改善を [ ] に"
    echo "  □ CLAUDE.md    — HTML構造・CSSクラスの変更を反映"
    echo "  □ CHANGELOG.md — バージョンと変更内容を記録"
    echo "  □ ヘルプモーダル更新履歴（#help-pane-changelog）も変更が必要か確認"
    echo "════════════════════════════════════════════════════"
    ;;
esac
