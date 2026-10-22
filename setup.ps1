# 外部 skill：clone 到固定位置再用 junction 連進 ~\.claude\skills（不需管理員）。可重複執行，已存在就略過。
$ErrorActionPreference = 'Stop'
function Skill($Name, $Repo, $Dir) {
  if (-not (Test-Path "$Dir\.git")) { git clone $Repo $Dir; if ($LASTEXITCODE) { throw "clone failed: $Name" } }
  $Link = "$HOME\.claude\skills\$Name"
  if (-not (Test-Path $Link)) { New-Item -ItemType Junction -Path $Link -Target $Dir | Out-Null }
  "ok: $Name -> $Dir"
}
Skill ai-level-check https://github.com/Raymondhou0917/ai-level-check "$HOME\ai-level-check"
Skill speak-human-tw https://github.com/Raymondhou0917/speak-human-tw.git "$HOME\projects\speak-human-tw"
