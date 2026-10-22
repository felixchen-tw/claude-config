#!/bin/sh
# 外部 skill：clone 到固定位置再 symlink 進 ~/.claude/skills。可重複執行，已存在就略過。
set -e
skill() { # 名稱 repo 目標目錄
  [ -d "$3/.git" ] || git clone "$2" "$3"
  [ -e "$HOME/.claude/skills/$1" ] || ln -s "$3" "$HOME/.claude/skills/$1"
  echo "ok: $1 -> $3"
}
skill ai-level-check https://github.com/Raymondhou0917/ai-level-check "$HOME/ai-level-check"
skill speak-human-tw https://github.com/Raymondhou0917/speak-human-tw.git "$HOME/projects/speak-human-tw"
