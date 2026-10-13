param([string]$SkillsDirectory)
$ErrorActionPreference = 'Stop'
$taskSource = Split-Path -Parent $PSScriptRoot
if (-not $SkillsDirectory) {
    if ($env:CODEX_HOME) { $SkillsDirectory = Join-Path $env:CODEX_HOME 'skills' }
    else { $SkillsDirectory = Join-Path $env:USERPROFILE '.codex\skills' }
}
$taskDestination = [IO.Path]::GetFullPath((Join-Path $SkillsDirectory 'course-tutor'))
if (Test-Path -LiteralPath $taskDestination) { throw "Destination already exists: $taskDestination. Review the installed version before updating." }
if (-not (Test-Path -LiteralPath (Join-Path $taskSource 'assets\library-app\dist\index.html'))) { throw 'Build the web app before installing the skill.' }
New-Item -ItemType Directory -Path $taskDestination -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $taskSource 'SKILL.md') -Destination $taskDestination
foreach ($taskFolder in @('agents','references','scripts')) { Copy-Item -LiteralPath (Join-Path $taskSource $taskFolder) -Destination $taskDestination -Recurse }
$taskRuntime = Join-Path $taskDestination 'assets\library-app'
New-Item -ItemType Directory -Path $taskRuntime -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $taskSource 'assets\library-app\dist') -Destination $taskRuntime -Recurse
Copy-Item -LiteralPath (Join-Path $taskSource 'assets\library-app\server.mjs') -Destination $taskRuntime
Write-Output "Installed: $taskDestination"
