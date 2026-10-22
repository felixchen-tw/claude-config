# ~/.claude 設定同步

新裝置：

```bash
git clone git@github.com:felixchen-tw/claude-config.git ~/.claude   # ~/.claude 已存在就先移開，再把憑證搬回來
```

外部 skill（ai-level-check、speak-human-tw）：跑一次 setup（會先 `git pull` 這個 repo），會 clone 到固定位置再 symlink／junction 進 `skills/`，可重複執行，已 clone 的會 pull 更新。symlink 不進 git，所以每台各跑一次。

```bash
sh ~/.claude/setup.sh                                  # Ubuntu / macOS
```

```powershell
powershell -ExecutionPolicy Bypass -File $HOME\.claude\setup.ps1   # Windows 11，junction 不需管理員
```

要加新的外部 skill，就在兩支腳本各加一行 `skill` 呼叫。要更新外部 skill，重跑 setup 即可。

啟動 Claude Code 後，`settings.json` 裡的 plugin 會自動安裝。
`felix-mods` 的 marketplace 路徑寫成 `~/.claude/mods`（Claude Code 會展開 `~`），Ubuntu／macOS／Windows 共用同一份 `settings.json`，不用改。
iTerm2 的狀態 hook 只在 `~/.config/iterm2/cc-status` 存在時執行，其他機器自動略過。
`skills/` 裡的 caveman 系列與 find-skills 是從 `npx skills` 複製進來的實體檔（不再 symlink 到 `~/.agents`），要更新就重跑 `npx skills add JuliusBrussee/caveman -g` 後再複製進來。
claude.ai 內建的 skills（`skills/synced/`）跟著帳號同步，不用處理。

同步：`git -C ~/.claude pull` / `git -C ~/.claude commit -am ... && git push`（新檔要先 `git add`）

## macOS 這台：settings.json 設了 skip-worktree

Claude Code 會把本機專屬的 `autoMode` 區塊（含 `/Users/felix` 路徑）寫進 `settings.json`，而 `autoMode` 只能放 user 或 managed 設定，沒有 user 層級的 local 檔可以放，所以這台用 `git update-index --skip-worktree settings.json` 讓 git 忽略本機改動。副作用：

- `git status` 看起來乾淨，但遠端改過 `settings.json` 時 `git pull`（和 `setup.sh`）會報 `Your local changes ... would be overwritten`。
- `commit -am` 不會帶到 `settings.json`；這台改的共用設定要照下面流程手動處理。

這台改用 `sh ~/.claude/sync-pull.sh` 取代 `git pull`（`setup.sh` 也是呼叫它）：pull 被擋時會備份到 `backups/settings.json.pre-pull`、取遠端版本、把本機 `autoMode` 合回去、再設回 skip-worktree；第二次 pull 仍失敗就還原本機檔。需要 `jq`。

要從這台推 `settings.json` 的改動：先 `--no-skip-worktree`，用 `jq 'del(.autoMode)'` 產生要 commit 的版本，commit 推完再把 `autoMode` 合回去、設回 skip-worktree。
