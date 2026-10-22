# ~/.claude 設定同步

新裝置：

```bash
git clone git@github.com:felixchen-tw/claude-config.git ~/.claude   # ~/.claude 已存在就先移開，再把憑證搬回來
git clone https://github.com/Raymondhou0917/ai-level-check ~/ai-level-check && ln -s ~/ai-level-check ~/.claude/skills/ai-level-check
```

外部 skill（clone 到 `~/projects/` 再 symlink 進來，`git pull` 即更新；symlink 不進 git，每台各建一次）：

```bash
# Ubuntu / macOS
git clone https://github.com/Raymondhou0917/speak-human-tw.git ~/projects/speak-human-tw
ln -s ~/projects/speak-human-tw ~/.claude/skills/speak-human-tw
```

```powershell
# Windows 11（PowerShell；junction 不需管理員或開發人員模式）
git clone https://github.com/Raymondhou0917/speak-human-tw.git $HOME\projects\speak-human-tw
New-Item -ItemType Junction -Path $HOME\.claude\skills\speak-human-tw -Target $HOME\projects\speak-human-tw
```

更新：`git -C ~/projects/speak-human-tw pull`

啟動 Claude Code 後，`settings.json` 裡的 plugin 會自動安裝。
`felix-mods` 的 marketplace 路徑寫成 `~/.claude/mods`（Claude Code 會展開 `~`），Ubuntu／macOS／Windows 共用同一份 `settings.json`，不用改。
iTerm2 的狀態 hook 只在 `~/.config/iterm2/cc-status` 存在時執行，其他機器自動略過。
`skills/` 裡的 caveman 系列與 find-skills 是從 `npx skills` 複製進來的實體檔（不再 symlink 到 `~/.agents`），要更新就重跑 `npx skills add JuliusBrussee/caveman -g` 後再複製進來。
claude.ai 內建的 skills（`skills/synced/`）跟著帳號同步，不用處理。

同步：`git -C ~/.claude pull` / `git -C ~/.claude commit -am ... && git push`
