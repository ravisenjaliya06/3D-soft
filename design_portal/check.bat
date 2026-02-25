@echo off
setlocal EnableDelayedExpansion

echo 🔍 Running Design Portal Checks...

:: Get current date and time
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YYYY=%dt:~0,4%"
set "MM=%dt:~4,2%"
set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%"
set "Min=%dt:~10,2%"
set "Sec=%dt:~12,2%"

:: Initialize variables for tracking results
set "lint_status=Failed"
set "lint_errors=0"
set "format_status=Failed"
set "any_failed=0"

:: 1. ESLint Check
echo.
echo === Running ESLint ===
for /f "tokens=4" %%a in ('npm run lint 2^>^&1 ^| findstr /C:"errors"') do (
    set "error_count=%%a"
)

if !error_count! GTR 0 (
    echo ✗ ESLint failed - Found !error_count! errors (allowed up to 0)
    echo.
    echo Error List:
    call npm run lint
    set "any_failed=1"
    set "lint_status=Failed"
) else (
    echo ✓ ESLint passed - Found !error_count! errors (allowed up to 0)
    set "lint_status=Passed"
)

:: 2. Format Check
echo.
echo === Running Format Check ===
call npm run format
if %ERRORLEVEL% NEQ 0 (
    echo ✗ Format Check failed
    set "any_failed=1"
    set "format_status=Failed"
) else (
    echo ✓ Format Check passed
    set "format_status=Passed"
)

:: 2. Build Check
echo.
echo === Running Format Check ===
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ✗ Build Check failed
    set "any_failed=1"
    set "build_status=Failed"
) else (
    echo ✓ Build Check passed
    set "build_status=Passed"
)

:: Print detailed summary with timestamp
echo.
echo === Check Summary ===
echo Date: %YYYY%-%MM%-%DD%
echo Time: %HH%:%Min%:%Sec%
echo.
echo ESLint: %lint_status% - Found !error_count! errors (allowed up to 0)
echo Format: %format_status%
echo Build: %build_status%

if %any_failed% EQU 1 (
    echo.
    echo ✗ Some checks failed. Please fix the issues above.
    exit /b 1
) else (
    echo.
    echo ✓ All checks passed successfully!
    exit /b 0
) 