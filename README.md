# ~/.claude 設定同步

新裝置：

```bash
git clone git@github.com:felixchen-tw/claude-config.git ~/.claude   # ~/.claude 已存在就先移開，再把憑證搬回來
```

外部 skill（ai-level-check、speak-human-tw）：pull 完跑一次 setup，會 clone 到固定位置再 symlink／junction 進 `skills/`，可重複執行，已 clone 的會 pull 更新。symlink 不進 git，所以每台各跑一次。

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

同步：`git -C ~/.claude pull` / `git -C ~/.claude commit -am ... && git push`
