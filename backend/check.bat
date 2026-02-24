@echo off
setlocal EnableDelayedExpansion

echo 🔍 Running Backend Checks...

:: Initialize variables for tracking results
set "type_check_status=Failed"
set "format_status=Failed"
set "migration_status=Failed"
set "test_status=Failed"
set "coverage_status=Failed"
set "any_failed=0"

:: 1. Type Checker (Ruff)
echo.
echo === Running Type Checker (Ruff) ===
for /f "tokens=2" %%a in ('pipenv run ruff check . 2^>^&1 ^| findstr /C:"Found"') do (
    set "error_count=%%a"
)
if !error_count! GTR 0 (
    echo ✗ Type Check failed - Found !error_count! errors
    set "any_failed=1"
) else (
    echo ✓ Type Check passed - No errors found
    set "type_check_status=Passed"
)

:: 2. Formatter Check
echo.
echo === Running Formatter Check ===
echo Running isort...
call pipenv run python -m isort .
if %ERRORLEVEL% NEQ 0 (
    echo ✗ isort failed
    set "any_failed=1"
) else (
    echo ✓ isort passed
)

echo Running black...
call pipenv run python -m black .
if %ERRORLEVEL% NEQ 0 (
    echo ✗ black failed
    set "any_failed=1"
) else (
    echo ✓ black passed
)

echo Running ruff check --fix...
call pipenv run python -m ruff check . --fix
if %ERRORLEVEL% NEQ 0 (
    echo ✗ ruff check failed
    set "any_failed=1"
) else (
    echo ✓ ruff check passed
    set "format_status=Passed"
)

:: 3. Migration Check
echo.
echo === Running Migration Check ===
:: Get list of migration files changed compared to main
for /f "delims=" %%a in ('git diff --diff-filter=A --name-only origin/main...HEAD -- ./umaboy/migrations/*.py') do (
    set "migration_files=!migration_files!%%a "
)

if "!migration_files!"=="" (
    echo No migration files found in the current PR.
    set "migration_status=Passed"
) else (
    echo Found migration files in the current PR:
    echo !migration_files!
    
    :: Check for multiple migration files per app
    for %%f in (!migration_files!) do (
        for /f "tokens=2 delims=/" %%a in ("%%f") do (
            set "app_name=%%a"
            set /a "app_count[!app_name!]+=1"
        )
    )
    
    set "has_multiple=0"
    for /f "tokens=2,3 delims=[]=" %%a in ('set app_count[') do (
        if %%b gtr 1 (
            echo Error: Multiple migration files found for app '%%a'
            set "has_multiple=1"
        )
    )
    
    if !has_multiple! equ 1 (
        echo ✗ Migration Check failed - Multiple migration files found per app
        set "any_failed=1"
    ) else (
        echo ✓ Migration Check passed - One migration file per app
        set "migration_status=Passed"
    )
)

:: 4. Run Tests
echo.
echo === Running Tests ===
set "SECRET_KEY=1"
call pipenv run coverage run -m pytest
if %ERRORLEVEL% NEQ 0 (
    echo ✗ Tests failed
    set "any_failed=1"
) else (
    echo ✓ Tests passed
    set "test_status=Passed"
)

:: 5. Check Coverage
echo.
echo === Checking Coverage ===
call pipenv run coverage report -m
for /f "tokens=4" %%a in ('pipenv run coverage report ^| findstr TOTAL') do (
    set "coverage_percentage=%%a"
    set "coverage_percentage=!coverage_percentage:%%=!"
)
if !coverage_percentage! LSS 75 (
    echo ✗ Coverage is below 75%%: !coverage_percentage!%%
    set "any_failed=1"
) else (
    echo ✓ Coverage is sufficient: !coverage_percentage!%%
    set "coverage_status=Passed"
)

:: Print detailed summary
echo.
echo === Check Summary ===
echo Type Check: %type_check_status%
echo Formatter: %format_status%
echo Migration: %migration_status%
echo Tests: %test_status%
echo Coverage: %coverage_status% (!coverage_percentage!%%)

if %any_failed% EQU 1 (
    echo.
    echo ✗ Some checks failed. Please fix the issues above.
    exit /b 1
) else (
    echo.
    echo ✓ All checks passed successfully!
    exit /b 0
) 