param(
    [string]$Model = "kimi-code/kimi-for-coding",
    [string]$TaskId = "cmt-hard-research-50",
    [int[]]$ProblemNumbers = @(14),
    [string]$ProblemList = "",
    [int]$IdleTimeoutMinutes = 20,
    [int]$PollSeconds = 30,
    [string]$RunLabel = "",
    [ValidateSet("default", "pass-review")]
    [string]$PromptVariant = "default"
)

$ErrorActionPreference = "Stop"

$BenchmarkRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$TaskRoot = Join-Path $BenchmarkRoot "tasks\$TaskId"
$FullPromptPath = Join-Path $TaskRoot "prompt.md"
$VerifierPath = Join-Path $TaskRoot "verify.py"
$GoldPath = Join-Path $TaskRoot "private\gold.json"

if (-not (Test-Path $FullPromptPath)) { throw "Prompt not found: $FullPromptPath" }
if (-not (Test-Path $GoldPath)) { throw "Gold not found: $GoldPath" }

$Agent = "kimi26_code_allowed_no_answer_timeout_slice"
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

$VariantInstruction = ""
if ($PromptVariant -eq "pass-review") {
    $VariantInstruction = @"
Pass-stability audit instruction:
- Solve only from the problem text below.
- Do not rely on memory of public benchmarks, previous runs, solution keys, or answer keys.
- If the item looks familiar, ignore that memory and rederive from the prompt.
- The final stdout must still be exactly one JSON object.
"@
}

if ($ProblemList.Trim()) {
    $ProblemNumbers = @($ProblemList -split '[,\s]+' | Where-Object { $_ } | ForEach-Object { [int]$_ })
}

function Read-TextFileBestEffort {
    param([string]$Path)
    for ($try = 0; $try -lt 10; $try++) {
        try {
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
        } catch {
            Start-Sleep -Milliseconds 300
        }
    }
    return ""
}

function Get-FileLengthSafe {
    param([string]$Path)
    try {
        if (Test-Path $Path) { return (Get-Item $Path).Length }
    } catch {
    }
    return 0
}

function Get-ProblemBlock {
    param([string]$Text, [int]$ProblemNumber)
    $next = $ProblemNumber + 1
    $pattern = "(?s)(### $ProblemNumber\..*?)(?=### $next\.|$)"
    $match = [regex]::Match($Text, $pattern)
    if (-not $match.Success) { throw "Problem block not found: $ProblemNumber" }
    return $match.Groups[1].Value.Trim()
}

function Write-JsonFile {
    param([object]$Value, [string]$Path, [int]$Depth = 8)
    $Value | ConvertTo-Json -Depth $Depth | Set-Content -Path $Path -Encoding utf8
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$SafeTaskId = $TaskId -replace '[^A-Za-z0-9_]+', '_'
$SafeRunLabel = $RunLabel -replace '[^A-Za-z0-9_]+', '_'
if ($SafeRunLabel) {
    $RunId = "${Timestamp}__${Agent}__${SafeTaskId}__${SafeRunLabel}"
} else {
    $RunId = "${Timestamp}__${Agent}__${SafeTaskId}"
}
$RunRoot = Join-Path $BenchmarkRoot "runs\$RunId"
$OutputDir = Join-Path $RunRoot "outputs"
$ScoresDir = Join-Path $RunRoot "scores"
$LogsDir = Join-Path $RunRoot "logs"
New-Item -ItemType Directory -Force -Path $OutputDir, $ScoresDir, $LogsDir | Out-Null

$Started = Get-Date
$Merged = [ordered]@{}
$ItemRuns = @()
$LiveStatusPath = Join-Path $RunRoot "live-status.json"
$PartialMetadataPath = Join-Path $RunRoot "run-metadata.partial.json"

foreach ($problemNumber in $ProblemNumbers) {
    if ($problemNumber -lt 1 -or $problemNumber -gt $Fields.Count) {
        throw "Problem number out of range: $problemNumber"
    }
    $field = $Fields[$problemNumber - 1]
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

$VariantInstruction

$problemBlock
"@
    $itemPrompt | Set-Content -Path $itemPromptPath -Encoding utf8

    $tempRoot = Join-Path $env:TEMP "hakimi-kimi-cmt-no-timeout-$Timestamp-$problemNumber"
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
    $lastGrowthAt = $itemStarted
    $lastBytes = 0
    $escapedPrompt = $promptText.Replace('"', '\"')
    $argumentLine = "-m `"$Model`" -p `"$escapedPrompt`" --output-format text"
    $proc = Start-Process -FilePath $Kimi.Source -ArgumentList $argumentLine -WorkingDirectory $tempRoot -NoNewWindow -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru
    $status = "running"
    $exitCode = $null

    while ($true) {
        Start-Sleep -Seconds $PollSeconds
        $proc.Refresh()
        $now = Get-Date
        $stdoutBytes = Get-FileLengthSafe -Path $stdoutPath
        $stderrBytes = Get-FileLengthSafe -Path $stderrPath
        $totalBytes = $stdoutBytes + $stderrBytes
        if ($totalBytes -gt $lastBytes) {
            $lastBytes = $totalBytes
            $lastGrowthAt = $now
        }
        $idleSeconds = [Math]::Round(($now - $lastGrowthAt).TotalSeconds, 3)
        $runtimeSeconds = [Math]::Round(($now - $itemStarted).TotalSeconds, 3)
        Write-JsonFile -Value ([ordered]@{
            benchmark_id = "existing-cmt-hard-stress-v0.1"
            task_id = $TaskId
            run_id = $RunId
            current_problem_number = $problemNumber
            current_field = $field
            current_status = $status
            current_runtime_seconds = $runtimeSeconds
            current_stdout_bytes = $stdoutBytes
            current_stderr_bytes = $stderrBytes
            idle_seconds = $idleSeconds
            idle_timeout_minutes = $IdleTimeoutMinutes
            prompt_variant = $PromptVariant
            updated_at = $now.ToString("o")
        }) -Path $LiveStatusPath

        if ($proc.HasExited) {
            $proc.Refresh()
            $exitCode = $proc.ExitCode
            $status = "completed"
            break
        }
        if ($idleSeconds -ge ($IdleTimeoutMinutes * 60)) {
            Stop-Process -Id $proc.Id -Force
            Start-Sleep -Milliseconds 800
            $exitCode = -1
            $status = "idle_timeout"
            break
        }
    }

    $itemFinished = Get-Date
    $stdoutText = Read-TextFileBestEffort -Path $stdoutPath
    $jsonMatch = [regex]::Match($stdoutText, "(?s)\{.*\}")
    $capturedJson = $false
    if ($jsonMatch.Success) {
        try {
            $obj = $jsonMatch.Value | ConvertFrom-Json
            if ($obj.PSObject.Properties.Name -contains $field) {
                $Merged[$field] = $obj.$field
                $capturedJson = $true
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
        stdout_bytes = Get-FileLengthSafe -Path $stdoutPath
        stderr_bytes = Get-FileLengthSafe -Path $stderrPath
        captured_json = $capturedJson
        prompt = $itemPromptPath
        stdout = $stdoutPath
        stderr = $stderrPath
    }

    Write-JsonFile -Value ([ordered]@{
        benchmark_id = "existing-cmt-hard-stress-v0.1"
        task_id = $TaskId
        run_id = $RunId
        run_label = $RunLabel
        agent = $Agent
        prompt_variant = $PromptVariant
        started_at = $Started.ToString("o")
        item_runs = @($ItemRuns)
    }) -Path $PartialMetadataPath
}

$OutputPath = Join-Path $OutputDir "$TaskId.no-timeout-slice.json"
$Merged | ConvertTo-Json -Depth 8 | Set-Content -Path $OutputPath -Encoding utf8
$ScorePath = Join-Path $ScoresDir "$TaskId.no-timeout-slice.full-score.json"
$ScoreText = & $PythonExe $VerifierPath $OutputPath
$ScoreExitCode = $LASTEXITCODE
$ScoreText | Set-Content -Path $ScorePath -Encoding utf8

$Score = $ScoreText | ConvertFrom-Json
$SliceFields = @($ProblemNumbers | ForEach-Object { $Fields[$_ - 1] })
$SliceChecks = @($Score.checks | Where-Object { $SliceFields -contains $_.field })
$SlicePassed = @($SliceChecks | Where-Object { $_.passed }).Count
$SliceTotal = $SliceChecks.Count
$SliceSummaryPath = Join-Path $ScoresDir "$TaskId.no-timeout-slice.summary.json"
$SliceSummary = [ordered]@{
    benchmark_id = "existing-cmt-hard-stress-v0.1"
    task_id = $TaskId
    run_id = $RunId
    run_label = $RunLabel
    prompt_variant = $PromptVariant
    problem_numbers = @($ProblemNumbers)
    passed = $SlicePassed
    total = $SliceTotal
    hard_score = if ($SliceTotal) { $SlicePassed / $SliceTotal } else { $null }
    item_runs = @($ItemRuns)
    checks = @($SliceChecks)
}
Write-JsonFile -Value $SliceSummary -Path $SliceSummaryPath -Depth 12

$Finished = Get-Date
$Metadata = [ordered]@{
    benchmark_id = "existing-cmt-hard-stress-v0.1"
    task_id = $TaskId
    run_id = $RunId
    run_label = $RunLabel
    agent = $Agent
    model_alias = $Model
    prompt_variant = $PromptVariant
    command = "no-answer-timeout itemwise slice kimi -m $Model -p <single problem prompt> --output-format text"
    started_at = $Started.ToString("o")
    finished_at = $Finished.ToString("o")
    runtime_seconds = [Math]::Round(($Finished - $Started).TotalSeconds, 3)
    idle_timeout_minutes = $IdleTimeoutMinutes
    poll_seconds = $PollSeconds
    problem_numbers = @($ProblemNumbers)
    scorer_exit_code = $ScoreExitCode
    kimi_executable = $Kimi.Source
    kimi_version = $KimiVersion
    python_executable = $PythonExe
    output = $OutputPath
    full_score = $ScorePath
    slice_summary = $SliceSummaryPath
    item_runs = @($ItemRuns)
    local_leakage_boundary = "Each item temp cwd contains only prompt.md. Gold and verifier are not mounted in cwd."
}
Write-JsonFile -Value $Metadata -Path (Join-Path $RunRoot "run-metadata.json") -Depth 12

Write-Host "Run directory: $RunRoot"
Write-Host "Slice summary: $SliceSummaryPath"
