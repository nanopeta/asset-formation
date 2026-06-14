#!/bin/bash
# check-docs.sh — ドキュメント整合チェッカー（コミット前にいつでも手動実行できる版）
#
# 使い方:
#   bash scripts/check-docs.sh
#
# チェック内容:
#   1. キャッシュバスター4箇所のバージョン番号が一致しているか
#      （app.js APP_VERSION / sw.js CACHE / index.html style.css?v= / index.html app.js?v=）
#   2. 現行バージョン vN が CHANGELOG.md と index.html(#help-pane-changelog) の両方に存在するか
#
# pre-commit はコミット時に同等チェックを行う。本スクリプトは作業中に先回りで確認するためのもの。
# 正規表現は scripts/pre-commit / scripts/bump-version.sh と完全一致させること。

cd "$(dirname "$0")/.."

FAIL=0

# ─── 1. キャッシュバスター整合 ─────────────────────────────────────────
APP_VER=$(grep -oE "APP_VERSION='v[0-9]+'"   app.js     | grep -oE "[0-9]+" | head -1)
CACHE_VER=$(grep -oE "asset-dashboard-v[0-9]+" sw.js     | grep -oE "[0-9]+" | head -1)
CSS_VER=$(grep -oE "style\.css\?v=[0-9]+"     index.html | grep -oE "[0-9]+" | head -1)
JS_VER=$(grep -oE "app\.js\?v=[0-9]+"         index.html | grep -oE "[0-9]+" | head -1)

if [ "$APP_VER" = "$CACHE_VER" ] && [ "$APP_VER" = "$CSS_VER" ] && [ "$APP_VER" = "$JS_VER" ]; then
  echo "✅ キャッシュバスター: 4箇所すべて v$APP_VER"
else
  echo "❌ キャッシュバスター不一致:"
  echo "     app.js      APP_VERSION : v$APP_VER"
  echo "     sw.js       CACHE       : v$CACHE_VER"
  echo "     index.html  style.css?v=: v$CSS_VER"
  echo "     index.html  app.js?v=   : v$JS_VER"
  echo "   → bash scripts/bump-version.sh $APP_VER で揃え直せます。"
  FAIL=1
fi

# ─── 2. CHANGELOG 二重追記チェック ──────────────────────────────────────
V="$APP_VER"
if [ -n "$V" ]; then
  # CHANGELOG.md: "## v106" 形式（全角/半角カッコどちらでも先頭一致で拾う）
  if grep -qE "^## v$V[（(]" CHANGELOG.md; then
    echo "✅ CHANGELOG.md: v$V エントリあり"
  else
    echo "❌ CHANGELOG.md に v$V のエントリがありません（先頭に ## v$V（YYYY-MM-DD）を追記してください）"
    FAIL=1
  fi

  # index.html: changelog-ver の中に "v106 " があるか
  if grep -qE "changelog-ver\">v$V " index.html; then
    echo "✅ index.html #help-pane-changelog: v$V エントリあり"
  else
    echo "❌ index.html の #help-pane-changelog に v$V のエントリがありません（先頭に changelog-entry を追記してください）"
    FAIL=1
  fi
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ 全整合 (v$APP_VER)"
  exit 0
else
  echo "⚠️  整合エラーがあります。上記を修正してください。"
  exit 1
fi
