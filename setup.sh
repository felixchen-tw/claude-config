#!/bin/sh
# 外部 skill：clone 到固定位置再 symlink 進 ~/.claude/skills。可重複執行，已 clone 的會 pull 更新。
set -e
# 先更新設定 repo；sh 邊讀邊執行，pull 可能改到本檔，所以 pull 完 exec 新版重跑一次
if [ -z "$SETUP_PULLED" ]; then
  sh "$HOME/.claude/sync-pull.sh"
  SETUP_PULLED=1 exec sh "$0" "$@"
fi
skill() { # 名稱 repo 目標目錄
  if [ -d "$3/.git" ]; then git -C "$3" pull --ff-only; else git clone "$2" "$3"; fi
  [ -e "$HOME/.claude/skills/$1" ] || ln -s "$3" "$HOME/.claude/skills/$1"
  echo "ok: $1 -> $3"
}
skill ai-level-check https://github.com/Raymondhou0917/ai-level-check "$HOME/ai-level-check"
skill speak-human-tw https://github.com/Raymondhou0917/speak-human-tw.git "$HOME/projects/speak-human-tw"
