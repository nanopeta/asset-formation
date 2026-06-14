#!/bin/bash
# bump-version.sh — キャッシュバスターのバージョン番号を4箇所同時に書き換える
#
# 使い方:
#   bash scripts/bump-version.sh 107        # v107 に揃える
#
# 書き換え対象（4箇所）:
#   1. app.js      const APP_VERSION='vN';
#   2. sw.js       const CACHE = 'asset-dashboard-vN';
#   3. index.html  style.css?v=N
#   4. index.html  app.js?v=N
#
# 正規表現は scripts/pre-commit / scripts/check-docs.sh と完全一致させること。

set -euo pipefail

# リポジトリルートへ移動（どこから呼ばれても動くように）
cd "$(dirname "$0")/.."

N="${1:-}"
if ! [[ "$N" =~ ^[0-9]+$ ]]; then
  echo "❌ 使い方: bash scripts/bump-version.sh <番号>   例: bash scripts/bump-version.sh 107" >&2
  exit 1
fi

# 現行バージョン（app.js 基準）を表示
CUR=$(grep -oE "APP_VERSION='v[0-9]+'" app.js | grep -oE "[0-9]+" | head -1 || echo "?")
echo "現行: v$CUR  →  新規: v$N"

HITS=0

bump() {  # bump <file> <sed-expr> <label>
  local file="$1" expr="$2" label="$3"
  if sed -i -E "$expr" "$file"; then
    echo "  ✅ $label"
    HITS=$((HITS+1))
  fi
}

bump app.js     "s/APP_VERSION='v[0-9]+'/APP_VERSION='v$N'/"                 "app.js      APP_VERSION"
bump sw.js      "s/asset-dashboard-v[0-9]+/asset-dashboard-v$N/"            "sw.js       CACHE"
bump index.html "s/style\.css\?v=[0-9]+/style.css?v=$N/"                    "index.html  style.css?v="
bump index.html "s/app\.js\?v=[0-9]+/app.js?v=$N/"                          "index.html  app.js?v="

# 反映後の整合確認（4箇所すべて vN になっているか）
APP_VER=$(grep -oE "APP_VERSION='v[0-9]+'"   app.js     | grep -oE "[0-9]+" | head -1)
CACHE_VER=$(grep -oE "asset-dashboard-v[0-9]+" sw.js     | grep -oE "[0-9]+" | head -1)
CSS_VER=$(grep -oE "style\.css\?v=[0-9]+"     index.html | grep -oE "[0-9]+" | head -1)
JS_VER=$(grep -oE "app\.js\?v=[0-9]+"         index.html | grep -oE "[0-9]+" | head -1)

if [ "$APP_VER" = "$N" ] && [ "$CACHE_VER" = "$N" ] && [ "$CSS_VER" = "$N" ] && [ "$JS_VER" = "$N" ]; then
  echo "✅ 4箇所すべて v$N に同期しました。"
  echo ""
  echo "次のステップ:"
  echo "  • CHANGELOG.md 先頭に ## v$N（YYYY-MM-DD）を追記"
  echo "  • index.html #help-pane-changelog 先頭に changelog-entry を追記"
  echo "  • README.md / TODO.md / CLAUDE.md を変更内容に応じて更新"
  echo "  • bash scripts/check-docs.sh で整合チェック"
else
  echo "❌ 同期に失敗しました: app=$APP_VER cache=$CACHE_VER css=$CSS_VER js=$JS_VER（期待: $N）" >&2
  exit 1
fi
