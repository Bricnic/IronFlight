<#
.SYNOPSIS
Find the newest unused race reference image in the Windows Downloads folder.
.DESCRIPTION
Inspect the returned image using the returned interpretation rules. Build and
verify the official level, then record the source image with -RecordImage and
-LevelFile. Use -DownloadsDirectory to override automatic discovery.
.EXAMPLE
pwsh -File scripts/find-level-reference.ps1
.EXAMPLE
pwsh -File scripts/find-level-reference.ps1 -RecordImage 'E:\Downloads\course.jpg' -LevelFile 'My Course.json'
#>
[CmdletBinding(DefaultParameterSetName = 'Find')]
param(
    [Parameter(ParameterSetName = 'Find')][string]$DownloadsDirectory,
    [Parameter(Mandatory, ParameterSetName = 'Record')][string]$RecordImage,
    [Parameter(Mandatory, ParameterSetName = 'Record')][string]$LevelFile,
    [Parameter(ParameterSetName = 'Record')][string]$Notes,
    [Parameter(Mandatory, ParameterSetName = 'Zfight')][string]$ZfightLevelId,
    [Parameter(Mandatory, ParameterSetName = 'Zfight')][string]$ZfightLevelFile,
    [Parameter(ParameterSetName = 'Zfight')][int]$PreviewPort = 5173,
    [Parameter(ParameterSetName = 'Zfight')][string]$ShotDirectory
)

$ErrorActionPreference = 'Stop'
$levelsDirectory = Join-Path $PSScriptRoot '..\levels'
$configPath = Join-Path $levelsDirectory 'reference-images.json'
$extensions = '.png', '.jpg', '.jfif'

function Get-Images([string]$Directory) {
    Get-ChildItem -LiteralPath $Directory -File |
        Where-Object Extension -in $extensions |
        Sort-Object -Property @{ Expression = 'CreationTimeUtc'; Descending = $true }, FullName
}

function Find-DownloadsDirectory {
    $profileDownloads = Join-Path $env:USERPROFILE 'Downloads'
    $shellFolders = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders'
    $downloadId = '{374DE290-123F-4565-9164-39C4925E467B}'
    $configured = Get-ItemPropertyValue -LiteralPath $shellFolders -Name $downloadId -ErrorAction SilentlyContinue
    if ($configured) {
        $configured = [Environment]::ExpandEnvironmentVariables($configured)
        if ($configured.TrimEnd('\') -ne $profileDownloads -and (Test-Path -LiteralPath $configured -PathType Container)) {
            return (Get-Item -LiteralPath $configured).FullName
        }
    }

    # A root-level Downloads folder may be in use even if Explorer still has
    # the default profile folder registered. Prefer the active root folder.
    $rootDownloads = @(Get-PSDrive -PSProvider FileSystem |
        Where-Object Root -match '^[A-Z]:\\$' |
        ForEach-Object { Join-Path $_.Root 'Downloads' } |
        Where-Object { Test-Path -LiteralPath $_ -PathType Container } |
        Sort-Object -Unique)
    if ($rootDownloads.Count) {
        $newest = $rootDownloads | ForEach-Object { Get-Images $_ | Select-Object -First 1 } |
            Sort-Object -Property @{ Expression = 'CreationTimeUtc'; Descending = $true }, FullName |
            Select-Object -First 1
        if ($newest) { return $newest.DirectoryName }
        return $rootDownloads[0]
    }
    if (Test-Path -LiteralPath $profileDownloads -PathType Container) { return $profileDownloads }
    throw 'Could not locate Downloads. Pass -DownloadsDirectory with its path.'
}

function Read-Config {
    Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
}

function Invoke-NodeJson([string]$Script, [string[]]$ScriptArgs) {
    $out = & node (Join-Path $PSScriptRoot $Script) @ScriptArgs 2>&1
    if ($LASTEXITCODE -ne 0) { throw ($out -join "`n") }
    return ($out -join "`n") | ConvertFrom-Json
}

function Invoke-ZfightGate([string]$LevelId, [string]$LevelFile, [int]$Port, [string]$OutDir) {
    $root = (Get-Item (Join-Path $PSScriptRoot '..')).FullName
    $file = $LevelFile
    if (![IO.Path]::IsPathRooted($file)) { $file = Join-Path $root $file }
    $item = Get-Item -LiteralPath $file -ErrorAction Stop
    if (!$OutDir) { $OutDir = Join-Path $root "artifacts/zfight/$($item.BaseName)" }

    $tcp = [Net.Sockets.TcpClient]::new()
    try { $tcp.Connect('127.0.0.1', $Port) }
    catch { throw "No dev server on :$Port. Start 'npm run dev -- --port $Port' first." }
    finally { $tcp.Close() }

    $scan = Invoke-NodeJson 'level-zfight.mjs' @('scan', $item.FullName, '--json')
    $spots = @($scan.suspects | Sort-Object area -Descending | Select-Object -First 2)
    $center = $null
    if (!$spots.Count) {
        $level = Get-Content -LiteralPath $item.FullName -Raw | ConvertFrom-Json
        $xs = $level.solids | Measure-Object -Property x -Average
        $zs = $level.solids | Measure-Object -Property z -Average
        $center = "$([Math]::Round($xs.Average, 2)),$([Math]::Round($zs.Average, 2))"
    }

    $env:PREVIEW_PORT = "$Port"
    $before = @()
    if ($spots.Count) {
        $shotArgs = @($LevelId, $OutDir, 'before') + @($spots | ForEach-Object { "$($_.x),$($_.z)" })
        $before = (Invoke-NodeJson 'capture-overhead.mjs' $shotArgs).shots
    } else {
        $before = (Invoke-NodeJson 'capture-overhead.mjs' @($LevelId, $OutDir, 'clean', $center)).shots
    }

    $clip = Invoke-NodeJson 'level-zfight.mjs' @('clip', $item.FullName, '--apply', '--json')
    $after = @()
    if ($spots.Count) {
        $shotArgs = @($LevelId, $OutDir, 'after') + @($spots | ForEach-Object { "$($_.x),$($_.z)" })
        $after = (Invoke-NodeJson 'capture-overhead.mjs' $shotArgs).shots
    }

    if ($clip.remaining.Count) {
        $pairs = $clip.remaining | ForEach-Object { "$($_.a) x $($_.b) at ($($_.x),$($_.z))" }
        throw "Z-fighting remains after clipping: $($pairs -join '; '). Shots: $($before -join ', ')"
    }
    return [ordered]@{
        levelFile = $item.FullName
        suspects = $scan.suspects.Count
        clipped = $clip.clipped
        beforeShots = $before
        afterShots = $after
    } | ConvertTo-Json -Depth 6
}

if ($PSCmdlet.ParameterSetName -eq 'Zfight') {
    Invoke-ZfightGate $ZfightLevelId $ZfightLevelFile $PreviewPort $ShotDirectory
    return
}

if ($PSCmdlet.ParameterSetName -eq 'Record') {
    $image = Get-Item -LiteralPath $RecordImage
    if ($image.PSIsContainer -or $image.Extension -notin $extensions) {
        throw 'The source must be a PNG, JPG, or JFIF file.'
    }
    $official = Join-Path $levelsDirectory 'official'
    $order = Get-Content -LiteralPath (Join-Path $official 'order.json') -Raw | ConvertFrom-Json
    if ($LevelFile -notin $order.file -or !(Test-Path -LiteralPath (Join-Path $official $LevelFile) -PathType Leaf)) {
        throw 'Record an image only after adding its level to the official lineup.'
    }

    $hash = (Get-FileHash -LiteralPath $image.FullName -Algorithm SHA256).Hash
    $lockName = 'Local\DemolitionDerby2-level-references'
    $lock = [Threading.Mutex]::new($false, $lockName)
    $acquired = $false
    try {
        try { $acquired = $lock.WaitOne(5000) }
        catch [Threading.AbandonedMutexException] { $acquired = $true }
        if (!$acquired) { throw 'The image config is being updated. Try again.' }
        $config = Read-Config
        foreach ($entry in $config.processedImages) {
            if ($entry.filename -eq $image.Name -or $entry.sha256 -eq $hash -or $entry.levelFile -eq $LevelFile) {
                if ($entry.filename -eq $image.Name -and $entry.sha256 -eq $hash -and $entry.levelFile -eq $LevelFile) {
                    return $entry | ConvertTo-Json
                }
                throw "The image or level is already recorded for $($entry.levelFile)."
            }
        }
        $entry = [pscustomobject]@{ filename = $image.Name; sha256 = $hash; levelFile = $LevelFile }
        if ($Notes) { $entry | Add-Member -NotePropertyName notes -NotePropertyValue $Notes }
        $config.processedImages = @($config.processedImages) + $entry
        $tempPath = "$configPath.$([Guid]::NewGuid()).tmp"
        $backupPath = "$tempPath.bak"
        try {
            $json = ($config | ConvertTo-Json -Depth 6) + "`n"
            [IO.File]::WriteAllText($tempPath, $json)
            [IO.File]::Replace($tempPath, $configPath, $backupPath)
            [IO.File]::Delete($backupPath)
        } finally {
            if (Test-Path -LiteralPath $tempPath) { Remove-Item -LiteralPath $tempPath }
        }
        return $entry | ConvertTo-Json
    } finally {
        if ($acquired) { $lock.ReleaseMutex() }
        $lock.Dispose()
    }
}

if (!$DownloadsDirectory) { $DownloadsDirectory = Find-DownloadsDirectory }
$directory = Get-Item -LiteralPath $DownloadsDirectory
if (!$directory.PSIsContainer) { throw 'Downloads must be a directory.' }
$config = Read-Config
$result = [ordered]@{
    downloadsDirectory = $directory.FullName
    image = $null
    interpretationRules = $config.interpretationRules
}
foreach ($image in (Get-Images $directory.FullName)) {
    if ($image.Name -in $config.processedImages.filename) { continue }
    $hash = (Get-FileHash -LiteralPath $image.FullName -Algorithm SHA256).Hash
    if ($hash -in $config.processedImages.sha256) { continue }
    $result.image = [ordered]@{ filename = $image.Name; path = $image.FullName; sha256 = $hash }
    break
}
$result | ConvertTo-Json -Depth 6
