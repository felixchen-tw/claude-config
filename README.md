# ~/.claude 設定同步

新裝置：

```bash
git clone git@github.com:felixchen-tw/claude-config.git ~/.claude   # ~/.claude 已存在就先移開，再把憑證搬回來
npx skills add JuliusBrussee/caveman -g          # caveman 系列 skills
npx skills add vercel-labs/skills -g            # find-skills
git clone https://github.com/Raymondhou0917/ai-level-check ~/ai-level-check && ln -s ~/ai-level-check ~/.claude/skills/ai-level-check
```

啟動 Claude Code 後，`settings.json` 裡的 plugin 會自動安裝。
`felix-mods` 的 marketplace 用的是絕對路徑 `/home/felix/.claude/mods`，家目錄不同（例如 macOS 的 `/Users/felix`）要改 `settings.json`。
claude.ai 內建的 skills（`skills/synced/`）跟著帳號同步，不用處理。

同步：`git -C ~/.claude pull` / `git -C ~/.claude commit -am ... && git push`
