param(
    [string]$Model = "kimi-code/kimi-for-coding",
    [string]$TaskId = "cmt-hard-research-8",
    [int]$PerItemTimeoutSeconds = 90
)

$ErrorActionPreference = "Stop"

$BenchmarkRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$TaskRoot = Join-Path $BenchmarkRoot "tasks\$TaskId"
$FullPromptPath = Join-Path $TaskRoot "prompt.md"
$VerifierPath = Join-Path $TaskRoot "verify.py"
$GoldPath = Join-Path $TaskRoot "private\gold.json"

if (-not (Test-Path $FullPromptPath)) { throw "Prompt not found: $FullPromptPath" }
if (-not (Test-Path $GoldPath)) { throw "Gold not found: $GoldPath" }

$Agent = "kimi26_code_allowed_itemwise"
$Kimi = Get-Command kimi -ErrorAction Stop
$KimiVersion = (& kimi --version).Trim()
$PythonCommand = Get-Command python -ErrorAction SilentlyContinue
if ($PythonCommand) {
    $PythonExe = $PythonCommand.Source
} else {
    $BundledPython = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
    if (-not (Test-Path $BundledPython)) { throw "Python not found: $BundledPython" }
    $PythonExe = $BundledPython
}

$Gold = Get-Content $GoldPath -Raw | ConvertFrom-Json
$Fields = @($Gold.checks | ForEach-Object { $_.field })
$FullPrompt = Get-Content $FullPromptPath -Raw

function Read-TextFileBestEffort {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return "" }
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    if ($bytes.Length -eq 0) { return "" }
    if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xff -and $bytes[1] -eq 0xfe) {
        return [System.Text.Encoding]::Unicode.GetString($bytes)
    }
    if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xfe -and $bytes[1] -eq 0xff) {
        return [System.Text.Encoding]::BigEndianUnicode.GetString($bytes)
    }
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xef -and $bytes[1] -eq 0xbb -and $bytes[2] -eq 0xbf) {
        return [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
    }
    return [System.Text.Encoding]::UTF8.GetString($bytes)
}

function Get-ProblemBlock {
    param([string]$Text, [int]$ProblemNumber)
    $next = $ProblemNumber + 1
    $pattern = "(?s)(### $ProblemNumber\..*?)(?=### $next\.|$)"
    $match = [regex]::Match($Text, $pattern)
    if (-not $match.Success) { throw "Problem block not found: $ProblemNumber" }
    return $match.Groups[1].Value.Trim()
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$SafeTaskId = $TaskId -replace '[^A-Za-z0-9_]+', '_'
$RunId = "${Timestamp}__${Agent}__${SafeTaskId}"
$RunRoot = Join-Path $BenchmarkRoot "runs\$RunId"
$OutputDir = Join-Path $RunRoot "outputs"
$ScoresDir = Join-Path $RunRoot "scores"
$LogsDir = Join-Path $RunRoot "logs"
New-Item -ItemType Directory -Force -Path $OutputDir, $ScoresDir, $LogsDir | Out-Null

$Started = Get-Date
$Merged = [ordered]@{}
$ItemRuns = @()

for ($i = 0; $i -lt $Fields.Count; $i++) {
    $field = $Fields[$i]
    $problemNumber = $i + 1
    $itemPromptPath = Join-Path $LogsDir ("item-{0:00}-{1}.prompt.md" -f $problemNumber, $field)
    $stdoutPath = Join-Path $LogsDir ("item-{0:00}-{1}.stdout.txt" -f $problemNumber, $field)
    $stderrPath = Join-Path $LogsDir ("item-{0:00}-{1}.stderr.txt" -f $problemNumber, $field)
    $problemBlock = Get-ProblemBlock -Text $FullPrompt -ProblemNumber $problemNumber
    $itemPrompt = @"
# $TaskId Item $problemNumber

Return exactly one JSON object and no explanation.

Use exactly this key:

- ``$field``

For multiple-answer questions, return a semicolon-separated lowercase choice set such as `"a;b;d"`.
For symbolic answers, use compact LaTeX-like strings.
For numeric vectors, return a JSON array of numbers.

$problemBlock
"@
    $itemPrompt | Set-Content -Path $itemPromptPath -Encoding utf8
    $tempRoot = Join-Path $env:TEMP "hakimi-kimi-cmt-hard-item-$Timestamp-$problemNumber"
    New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
    Copy-Item -Path $itemPromptPath -Destination (Join-Path $tempRoot "prompt.md") -Force

    $promptText = @"
Read prompt.md in the current directory and complete the benchmark item exactly as written.

Important:
- Do not browse the web or use search.
- Do not ask a follow-up question.
- Output exactly one JSON object and no explanation.
"@

    $itemStarted = Get-Date
    $escapedPrompt = $promptText.Replace('"', '\"')
    $argumentLine = "-m `"$Model`" -p `"$escapedPrompt`" --output-format text"
    $proc = Start-Process -FilePath $Kimi.Source -ArgumentList $argumentLine -WorkingDirectory $tempRoot -NoNewWindow -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru
    $completed = $proc.WaitForExit($PerItemTimeoutSeconds * 1000)
    if ($completed) {
        $exitCode = $proc.ExitCode
        $status = "completed"
    } else {
        Stop-Process -Id $proc.Id -Force
        $exitCode = -1
        $status = "timeout"
    }
    $itemFinished = Get-Date

    $stdoutText = Read-TextFileBestEffort -Path $stdoutPath
    $jsonMatch = [regex]::Match($stdoutText, "(?s)\{.*\}")
    if ($jsonMatch.Success) {
        try {
            $obj = $jsonMatch.Value | ConvertFrom-Json
            if ($obj.PSObject.Properties.Name -contains $field) {
                $Merged[$field] = $obj.$field
            }
        } catch {
        }
    }

    $ItemRuns += [ordered]@{
        field = $field
        problem_number = $problemNumber
        status = $status
        exit_code = $exitCode
        runtime_seconds = [Math]::Round(($itemFinished - $itemStarted).TotalSeconds, 3)
        prompt = $itemPromptPath
        stdout = $stdoutPath
        stderr = $stderrPath
    }
}

$OutputPath = Join-Path $OutputDir "$TaskId.itemwise.json"
$Merged | ConvertTo-Json -Depth 8 | Set-Content -Path $OutputPath -Encoding utf8
$ScorePath = Join-Path $ScoresDir "$TaskId.itemwise.score.json"
$ScoreStderrPath = Join-Path $LogsDir "$TaskId.itemwise.scorer.stderr.txt"

$PreviousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
if (Test-Path "variable:PSNativeCommandUseErrorActionPreference") {
    $PreviousNativeErrorPreferenceForScorer = $PSNativeCommandUseErrorActionPreference
    $PSNativeCommandUseErrorActionPreference = $false
}
$ScoreText = & $PythonExe $VerifierPath $OutputPath 2> $ScoreStderrPath
$ScoreExitCode = $LASTEXITCODE
$ScoreText | Set-Content -Path $ScorePath -Encoding utf8
$ErrorActionPreference = $PreviousErrorActionPreference
if (Test-Path "variable:PreviousNativeErrorPreferenceForScorer") {
    $PSNativeCommandUseErrorActionPreference = $PreviousNativeErrorPreferenceForScorer
}

$Finished = Get-Date
$Metadata = [ordered]@{
    benchmark_id = "existing-cmt-hard-stress-v0.1"
    task_id = $TaskId
    run_id = $RunId
    agent = $Agent
    model_alias = $Model
    model_display_name_note = "Local config displays kimi-code/kimi-for-coding as Kimi-k2.6."
    command = "itemwise kimi -m $Model -p <single problem prompt> --output-format text"
    started_at = $Started.ToString("o")
    finished_at = $Finished.ToString("o")
    runtime_seconds = [Math]::Round(($Finished - $Started).TotalSeconds, 3)
    per_item_timeout_seconds = $PerItemTimeoutSeconds
    scorer_exit_code = $ScoreExitCode
    kimi_executable = $Kimi.Source
    kimi_version = $KimiVersion
    python_executable = $PythonExe
    output = $OutputPath
    score = $ScorePath
    item_runs = @($ItemRuns)
    network_allowed = $false
    network_enforced = $false
    local_leakage_boundary = "Each item temp cwd contains only prompt.md. Gold and verifier are not mounted in cwd."
}

$Metadata | ConvertTo-Json -Depth 8 | Set-Content -Path (Join-Path $RunRoot "run-metadata.json") -Encoding utf8

Write-Host "Run directory: $RunRoot"
Write-Host "Scorer exit code: $ScoreExitCode"
Write-Host "Output: $OutputPath"
Write-Host "Score: $ScorePath"
