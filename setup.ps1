# 外部 skill：clone 到固定位置再用 junction 連進 ~\.claude\skills（不需管理員）。可重複執行，已 clone 的會 pull 更新。
$ErrorActionPreference = 'Stop'
# 先更新設定 repo，pull 完用新版本檔重跑一次，讓新加的 skill 立刻生效
if (-not $env:SETUP_PULLED) {
  git -C "$HOME\.claude" pull --ff-only
  if ($LASTEXITCODE) { throw "git failed: .claude" }
  $env:SETUP_PULLED = 1
  & (Get-Process -Id $PID).Path -ExecutionPolicy Bypass -File $PSCommandPath
  exit $LASTEXITCODE
}
function Skill($Name, $Repo, $Dir) {
  if (Test-Path "$Dir\.git") { git -C $Dir pull --ff-only } else { git clone $Repo $Dir }
  if ($LASTEXITCODE) { throw "git failed: $Name" }
  $Link = "$HOME\.claude\skills\$Name"
  if (-not (Test-Path $Link)) { New-Item -ItemType Junction -Path $Link -Target $Dir | Out-Null }
  "ok: $Name -> $Dir"
}
Skill ai-level-check https://github.com/Raymondhou0917/ai-level-check "$HOME\ai-level-check"
Skill speak-human-tw https://github.com/Raymondhou0917/speak-human-tw.git "$HOME\projects\speak-human-tw"
