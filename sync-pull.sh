#!/bin/sh
# git pull ~/.claude。settings.json 設了 skip-worktree 而 pull 被擋時：備份、取遠端版本、把本機 autoMode 合回去、設回 skip-worktree。
set -e
cd "$HOME/.claude"
git pull --ff-only && exit 0
git ls-files -v settings.json | grep -q '^S' || exit 1
echo "sync-pull: settings.json 是 skip-worktree，改用遠端版本並保留本機 autoMode"
mkdir -p backups
cp settings.json backups/settings.json.pre-pull
jq .autoMode settings.json > backups/automode.json
git update-index --no-skip-worktree settings.json
git checkout settings.json
if ! git pull --ff-only; then
  cp backups/settings.json.pre-pull settings.json
  git update-index --skip-worktree settings.json
  echo "sync-pull: pull 仍失敗，已還原本機 settings.json" >&2
  exit 1
fi
if ! jq --slurpfile a backups/automode.json 'if $a[0] == null then . else .autoMode = $a[0] end' settings.json > backups/settings.tmp; then
  cp backups/settings.json.pre-pull settings.json
  git update-index --skip-worktree settings.json
  echo "sync-pull: 合回 autoMode 失敗，已還原本機 settings.json（repo 已更新到遠端）" >&2
  exit 1
fi
mv backups/settings.tmp settings.json
git update-index --skip-worktree settings.json
echo "sync-pull: 完成（備份在 backups/settings.json.pre-pull）"
