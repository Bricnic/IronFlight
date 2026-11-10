@echo off
rem Themed level-set generator driver.
rem Usage: generate-levels.cmd [--dry-run] [--help] [--set KEY VALUE ...] [-- extra muse args ...]
rem Reads config\level-gen.json, applies --set overrides as LEVEL_GEN_* env vars,
rem then runs: muse exec --prompt-file docs\level-generation.md --workspace <root>
setlocal EnableDelayedExpansion
for %%I in ("%~dp0..") do set "ROOT=%%~fI"
set "CONFIG=%ROOT%\config\level-gen.json"
set "PROMPT_FILE=%ROOT%\docs\level-generation.md"
set DRYRUN=
set "MUSE_ARGS="
set "OVERRIDES="

:parse
if "%~1"=="" goto resolved
if /i "%~1"=="--dry-run" set DRYRUN=1
if /i "%~1"=="--dry-run" shift& goto parse
if /i "%~1"=="--help" goto help
if /i "%~1"=="-h" goto help
if "%~1"=="--" shift& goto passthrough
if /i "%~1"=="--set" goto doset
echo Unknown argument: %~1
exit /b 2

:doset
if "%~3"=="" echo --set needs KEY VALUE& exit /b 2
set "K=%~2"
set "V=%~3"
if /i "%K%"=="theme" goto doknown
if /i "%K%"=="levels" goto doknown
if /i "%K%"=="decor" goto doknown
if /i "%K%"=="destructibles" goto doknown
if /i "%K%"=="backgrounds" goto doknown
if /i "%K%"=="lethals" goto doknown
if /i "%K%"=="gemini" goto doknown
if /i "%K%"=="mode" goto doknown
if /i "%K%"=="goldmin" goto doknown
if /i "%K%"=="goldmax" goto doknown
if /i "%K%"=="idealmin" goto doknown
if /i "%K%"=="idealmax" goto doknown
if /i "%K%"=="previewvehicle" goto doknown
echo Unknown config key: %K%
exit /b 2
:doknown
call :setkey "%K%" "%V%"
shift
shift
shift
goto parse

:setkey
set "K=%~1"
set "V=%~2"
if /i "%K%"=="theme" set "LEVEL_GEN_THEME=%V%"
if /i "%K%"=="levels" set "LEVEL_GEN_LEVELS=%V%"
if /i "%K%"=="decor" set "LEVEL_GEN_DECOR=%V%"
if /i "%K%"=="destructibles" set "LEVEL_GEN_DESTRUCTIBLES=%V%"
if /i "%K%"=="backgrounds" set "LEVEL_GEN_BACKGROUNDS=%V%"
if /i "%K%"=="lethals" set "LEVEL_GEN_LETHALS=%V%"
if /i "%K%"=="gemini" set "LEVEL_GEN_GEMINI=%V%"
if /i "%K%"=="mode" set "LEVEL_GEN_MODE=%V%"
if /i "%K%"=="goldmin" set "LEVEL_GEN_GOLD_MIN=%V%"
if /i "%K%"=="goldmax" set "LEVEL_GEN_GOLD_MAX=%V%"
if /i "%K%"=="idealmin" set "LEVEL_GEN_IDEAL_MIN=%V%"
if /i "%K%"=="idealmax" set "LEVEL_GEN_IDEAL_MAX=%V%"
if /i "%K%"=="previewvehicle" set "LEVEL_GEN_PREVIEW_VEHICLE=%V%"
set "OVERRIDES=%OVERRIDES% %K%=%V%"
exit /b 0

:passthrough
:ploop
if "%~1"=="" goto resolved
set "MUSE_ARGS=%MUSE_ARGS% %1"
shift
goto ploop

:resolved
if not exist "%CONFIG%" echo Missing config: %CONFIG%& exit /b 2
if not exist "%PROMPT_FILE%" echo Missing prompt: %PROMPT_FILE%& exit /b 2
for /f "tokens=1* delims==" %%A in ('powershell -NoProfile -Command "$c=Get-Content '%CONFIG%' -Raw | ConvertFrom-Json; foreach ($n in @('theme','levels','decor','destructibles','backgrounds','lethals','gemini','mode','goldMin','goldMax','idealMin','idealMax','previewVehicle')) { $v=$c.$n; if ($v -is [bool]) { $v=$v.ToString().ToLower() }; 'CFG_'+$n+'='+$v }"') do set "%%A=%%B"
if defined LEVEL_GEN_THEME (
  set "EFF_theme=%LEVEL_GEN_THEME%"
  set "SRC_theme=override"
) else (
  set "EFF_theme=%CFG_theme%"
  set "SRC_theme=default"
)
if defined LEVEL_GEN_LEVELS (
  set "EFF_levels=%LEVEL_GEN_LEVELS%"
  set "SRC_levels=override"
) else (
  set "EFF_levels=%CFG_levels%"
  set "SRC_levels=default"
)
if defined LEVEL_GEN_DECOR (
  set "EFF_decor=%LEVEL_GEN_DECOR%"
  set "SRC_decor=override"
) else (
  set "EFF_decor=%CFG_decor%"
  set "SRC_decor=default"
)
if defined LEVEL_GEN_DESTRUCTIBLES (
  set "EFF_destructibles=%LEVEL_GEN_DESTRUCTIBLES%"
  set "SRC_destructibles=override"
) else (
  set "EFF_destructibles=%CFG_destructibles%"
  set "SRC_destructibles=default"
)
if defined LEVEL_GEN_BACKGROUNDS (
  set "EFF_backgrounds=%LEVEL_GEN_BACKGROUNDS%"
  set "SRC_backgrounds=override"
) else (
  set "EFF_backgrounds=%CFG_backgrounds%"
  set "SRC_backgrounds=default"
)
if defined LEVEL_GEN_LETHALS (
  set "EFF_lethals=%LEVEL_GEN_LETHALS%"
  set "SRC_lethals=override"
) else (
  set "EFF_lethals=%CFG_lethals%"
  set "SRC_lethals=default"
)
if defined LEVEL_GEN_GEMINI (
  set "EFF_gemini=%LEVEL_GEN_GEMINI%"
  set "SRC_gemini=override"
) else (
  set "EFF_gemini=%CFG_gemini%"
  set "SRC_gemini=default"
)
if defined LEVEL_GEN_MODE (
  set "EFF_mode=%LEVEL_GEN_MODE%"
  set "SRC_mode=override"
) else (
  set "EFF_mode=%CFG_mode%"
  set "SRC_mode=default"
)
if defined LEVEL_GEN_GOLD_MIN (
  set "EFF_goldMin=%LEVEL_GEN_GOLD_MIN%"
  set "SRC_goldMin=override"
) else (
  set "EFF_goldMin=%CFG_goldMin%"
  set "SRC_goldMin=default"
)
if defined LEVEL_GEN_GOLD_MAX (
  set "EFF_goldMax=%LEVEL_GEN_GOLD_MAX%"
  set "SRC_goldMax=override"
) else (
  set "EFF_goldMax=%CFG_goldMax%"
  set "SRC_goldMax=default"
)
if defined LEVEL_GEN_IDEAL_MIN (
  set "EFF_idealMin=%LEVEL_GEN_IDEAL_MIN%"
  set "SRC_idealMin=override"
) else (
  set "EFF_idealMin=%CFG_idealMin%"
  set "SRC_idealMin=default"
)
if defined LEVEL_GEN_IDEAL_MAX (
  set "EFF_idealMax=%LEVEL_GEN_IDEAL_MAX%"
  set "SRC_idealMax=override"
) else (
  set "EFF_idealMax=%CFG_idealMax%"
  set "SRC_idealMax=default"
)
if defined LEVEL_GEN_PREVIEW_VEHICLE (
  set "EFF_previewVehicle=%LEVEL_GEN_PREVIEW_VEHICLE%"
  set "SRC_previewVehicle=override"
) else (
  set "EFF_previewVehicle=%CFG_previewVehicle%"
  set "SRC_previewVehicle=default"
)
echo Effective config: theme=%EFF_theme% levels=%EFF_levels% decor=%EFF_decor% destructibles=%EFF_destructibles% backgrounds=%EFF_backgrounds% lethals=%EFF_lethals% gemini=%EFF_gemini% mode=%EFF_mode% goldMin=%EFF_goldMin% goldMax=%EFF_goldMax% idealMin=%EFF_idealMin% idealMax=%EFF_idealMax% previewVehicle=%EFF_previewVehicle%
echo Sources: theme=%SRC_theme% levels=%SRC_levels% decor=%SRC_decor% destructibles=%SRC_destructibles% backgrounds=%SRC_backgrounds% lethals=%SRC_lethals% gemini=%SRC_gemini% mode=%SRC_mode% goldMin=%SRC_goldMin% goldMax=%SRC_goldMax% idealMin=%SRC_idealMin% idealMax=%SRC_idealMax% previewVehicle=%SRC_previewVehicle%
rem --yolo: headless generation must write files and run shell/network without
rem per-call approval prompts (same flags as an interactive yolo session).
set "MUSE_CMD=muse exec --yolo --prompt-file "%PROMPT_FILE%" --workspace "%ROOT%"%MUSE_ARGS%"
if defined DRYRUN (
  echo [dry-run] %MUSE_CMD%
  echo [dry-run] nothing executed.
  exit /b 0
)
%MUSE_CMD%
exit /b %ERRORLEVEL%

:help
echo Usage: generate-levels.cmd [--dry-run] [--help] [--set KEY VALUE ...] [-- extra muse args ...]
echo Keys: theme levels decor destructibles backgrounds lethals gemini mode goldMin goldMax idealMin idealMax previewVehicle
echo Example: generate-levels.cmd --dry-run --set theme christmas --set gemini false
exit /b 0
