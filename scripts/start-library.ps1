param(
    [string]$Workspace = (Get-Location).Path,
    [int]$Port = 4317,
    [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'
$taskWorkspace = (Resolve-Path -LiteralPath $Workspace).Path
$taskLibrary = Join-Path $taskWorkspace 'learning-library'
$taskAppDir = Join-Path $PSScriptRoot '..\assets\library-app'
$taskServer = (Resolve-Path -LiteralPath (Join-Path $taskAppDir 'server.mjs')).Path
if (-not (Test-Path -LiteralPath (Join-Path $taskAppDir 'dist\index.html'))) { throw '网页构建文件缺失，请先构建 assets/library-app。' }
$taskNode = (Get-Command node -ErrorAction Stop).Source
$taskSelected = $null
for ($taskCandidate = $Port; $taskCandidate -lt $Port + 10; $taskCandidate++) {
    $taskUrl = "http://127.0.0.1:$taskCandidate"
    try {
        $taskHealth = Invoke-RestMethod -Uri "$taskUrl/api/health" -TimeoutSec 1
        if ($taskHealth.app -eq 'course-tutor' -and [IO.Path]::GetFullPath($taskHealth.library) -eq [IO.Path]::GetFullPath($taskLibrary)) { $taskSelected = $taskUrl; break }
        continue
    } catch { }
    $taskListener = Get-NetTCPConnection -LocalPort $taskCandidate -State Listen -ErrorAction SilentlyContinue
    if ($taskListener) { continue }
    $taskLogDir = Join-Path $taskWorkspace 'learning-library\logs'
    New-Item -ItemType Directory -Path $taskLogDir -Force | Out-Null
    $taskStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $taskArguments = @(('"{0}"' -f $taskServer), '--library', ('"{0}"' -f $taskLibrary), '--port', "$taskCandidate")
    $taskChild = Start-Process -FilePath $taskNode -ArgumentList $taskArguments -WindowStyle Hidden -WorkingDirectory $taskWorkspace -RedirectStandardOutput (Join-Path $taskLogDir "server-$taskCandidate-$taskStamp.log") -RedirectStandardError (Join-Path $taskLogDir "server-$taskCandidate-$taskStamp.err.log") -PassThru
    for ($taskAttempt = 0; $taskAttempt -lt 30; $taskAttempt++) {
        Start-Sleep -Milliseconds 200
        try {
            $taskHealth = Invoke-RestMethod -Uri "$taskUrl/api/health" -TimeoutSec 1
            if ($taskHealth.app -eq 'course-tutor' -and [IO.Path]::GetFullPath($taskHealth.library) -eq [IO.Path]::GetFullPath($taskLibrary)) { $taskSelected = $taskUrl; break }
        } catch { }
        if ($taskChild.HasExited) { break }
    }
    if ($taskSelected) { break }
}
if (-not $taskSelected) { throw '无法启动本地书架，请检查 learning-library/logs 或更换端口。' }
if (-not $NoBrowser) { Start-Process $taskSelected }
Write-Output "Zhiye: $taskSelected"
