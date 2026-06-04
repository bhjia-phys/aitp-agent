param(
    [string]$Model = "kimi-code/kimi-for-coding",
    [string]$TaskId = "cmt-hard-research-8"
)

$ErrorActionPreference = "Stop"

$BenchmarkRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$TaskRoot = Join-Path $BenchmarkRoot "tasks\$TaskId"
$PromptPath = Join-Path $TaskRoot "prompt.md"
$VerifierPath = Join-Path $TaskRoot "verify.py"

if (-not (Test-Path $PromptPath)) {
    throw "Prompt not found: $PromptPath"
}

$Agent = "kimi26_code_allowed"
$Kimi = Get-Command kimi -ErrorAction Stop
$KimiVersion = (& kimi --version).Trim()
$PythonCommand = Get-Command python -ErrorAction SilentlyContinue
if ($PythonCommand) {
    $PythonExe = $PythonCommand.Source
} else {
    $BundledPython = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
    if (-not (Test-Path $BundledPython)) {
        throw "Python not found on PATH and bundled Codex Python not found: $BundledPython"
    }
    $PythonExe = $BundledPython
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$SafeTaskId = $TaskId -replace '[^A-Za-z0-9_]+', '_'
$RunId = "${Timestamp}__${Agent}__${SafeTaskId}"
$RunRoot = Join-Path $BenchmarkRoot "runs\$RunId"
$OutputDir = Join-Path $RunRoot "outputs"
$ScoresDir = Join-Path $RunRoot "scores"
$LogsDir = Join-Path $RunRoot "logs"
New-Item -ItemType Directory -Force -Path $OutputDir, $ScoresDir, $LogsDir | Out-Null

$TempRoot = Join-Path $env:TEMP "hakimi-kimi-cmt-hard-stress-$Timestamp"
New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null
Copy-Item -Path $PromptPath -Destination (Join-Path $TempRoot "prompt.md") -Force

$PromptHash = (Get-FileHash -Algorithm SHA256 -Path $PromptPath).Hash
$StdoutPath = Join-Path $LogsDir "$TaskId.stdout.txt"
$StderrPath = Join-Path $LogsDir "$TaskId.stderr.txt"
$OutputPath = Join-Path $OutputDir "$TaskId.md"
$ScorePath = Join-Path $ScoresDir "$TaskId.score.json"
$ScoreStderrPath = Join-Path $LogsDir "$TaskId.scorer.stderr.txt"

$PromptText = @"
Read prompt.md in the current directory and complete the benchmark exactly as written.

Important:
- Do not browse the web or use search.
- You may use normal Kimi Code capabilities if needed.
- Do not ask a follow-up question.
- Output exactly one JSON object and no explanation.
"@

$Started = Get-Date
$PreviousErrorActionPreference = $ErrorActionPreference
Push-Location $TempRoot
try {
    $ErrorActionPreference = "Continue"
    if (Test-Path "variable:PSNativeCommandUseErrorActionPreference") {
        $PreviousNativeErrorPreference = $PSNativeCommandUseErrorActionPreference
        $PSNativeCommandUseErrorActionPreference = $false
    }
    & $Kimi.Source -m $Model -p $PromptText --output-format text 1> $StdoutPath 2> $StderrPath
    $KimiExitCode = $LASTEXITCODE
} finally {
    $ErrorActionPreference = $PreviousErrorActionPreference
    if (Test-Path "variable:PreviousNativeErrorPreference") {
        $PSNativeCommandUseErrorActionPreference = $PreviousNativeErrorPreference
    }
    Pop-Location
}
$Finished = Get-Date

Copy-Item -Path $StdoutPath -Destination $OutputPath -Force
$OutputHash = (Get-FileHash -Algorithm SHA256 -Path $OutputPath).Hash
"$KimiExitCode" | Set-Content -Path (Join-Path $RunRoot "exit-code.txt") -Encoding utf8

$PreviousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
if (Test-Path "variable:PSNativeCommandUseErrorActionPreference") {
    $PreviousNativeErrorPreferenceForScorer = $PSNativeCommandUseErrorActionPreference
    $PSNativeCommandUseErrorActionPreference = $false
}
& $PythonExe $VerifierPath $OutputPath 1> $ScorePath 2> $ScoreStderrPath
$ScoreExitCode = $LASTEXITCODE
$ErrorActionPreference = $PreviousErrorActionPreference
if (Test-Path "variable:PreviousNativeErrorPreferenceForScorer") {
    $PSNativeCommandUseErrorActionPreference = $PreviousNativeErrorPreferenceForScorer
}

$CwdListing = Get-ChildItem -Recurse -File $TempRoot | ForEach-Object {
    $_.FullName.Substring($TempRoot.Length + 1).Replace('\', '/')
}
$AgentCreated = @($CwdListing | Where-Object { $_ -ne "prompt.md" })
foreach ($file in $AgentCreated) {
    $src = Join-Path $TempRoot ($file -replace '/', '\')
    $safeName = ($file -replace '[\\/:\*\?"<>\|]', '_')
    Copy-Item -Path $src -Destination (Join-Path $LogsDir "agent-created-$safeName") -Force
}

$Metadata = [ordered]@{
    benchmark_id = "existing-cmt-hard-stress-v0.1"
    task_id = $TaskId
    run_id = $RunId
    agent = $Agent
    model_alias = $Model
    model_display_name_note = "Local config displays kimi-code/kimi-for-coding as Kimi-k2.6."
    command = "kimi -m $Model -p <read prompt.md and output JSON> --output-format text"
    started_at = $Started.ToString("o")
    finished_at = $Finished.ToString("o")
    runtime_seconds = [Math]::Round(($Finished - $Started).TotalSeconds, 3)
    kimi_exit_code = $KimiExitCode
    scorer_exit_code = $ScoreExitCode
    kimi_executable = $Kimi.Source
    kimi_version = $KimiVersion
    python_executable = $PythonExe
    temp_cwd = $TempRoot
    cwd_listing = @($CwdListing)
    agent_created_files = @($AgentCreated)
    prompt = $PromptPath
    prompt_sha256 = $PromptHash
    output = $OutputPath
    output_sha256 = $OutputHash
    score = $ScorePath
    network_allowed = $false
    network_enforced = $false
    local_leakage_boundary = "Initial temp cwd contains only prompt.md. Gold, verifier, run history, and source metadata are not mounted in cwd."
}

$Metadata | ConvertTo-Json -Depth 8 | Set-Content -Path (Join-Path $RunRoot "run-metadata.json") -Encoding utf8

Write-Host "Run directory: $RunRoot"
Write-Host "Kimi exit code: $KimiExitCode"
Write-Host "Scorer exit code: $ScoreExitCode"
Write-Host "Output: $OutputPath"
Write-Host "Score: $ScorePath"
