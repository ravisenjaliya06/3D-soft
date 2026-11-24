#!/bin/bash

echo "🔍 Running Design Portal Checks..."

# Get current date and time
YYYY=$(date +%Y)
MM=$(date +%m)
DD=$(date +%d)
HH=$(date +%H)
Min=$(date +%M)
Sec=$(date +%S)

lint_status="Failed"
format_status="Failed"
build_status="Failed"
any_failed=0
error_count=0

# 1. ESLint Check
echo ""
echo "=== Running ESLint ==="

lint_output=$(npm run lint 2>&1)

error_count=$(echo "$lint_output" | grep -oP '\d+(?= errors)' | head -1)

if [ -z "$error_count" ]; then
  error_count=0
fi

if [ "$error_count" -gt 38 ]; then
  echo "✗ ESLint failed - Found $error_count errors (allowed up to 38)"
  echo ""
  echo "$lint_output"
  any_failed=1
  lint_status="Failed"
else
  echo "✓ ESLint passed - Found $error_count errors (allowed up to 38)"
  lint_status="Passed"
fi

# 2. Format Check
echo ""
echo "=== Running Format Check ==="
npm run format
if [ $? -ne 0 ]; then
  echo "✗ Format Check failed"
  any_failed=1
  format_status="Failed"
else
  echo "✓ Format Check passed"
  format_status="Passed"
fi

# 3. Build Check
echo ""
echo "=== Running Build ==="
npm run build
if [ $? -ne 0 ]; then
  echo "✗ Build failed"
  any_failed=1
  build_status="Failed"
else
  echo "✓ Build passed"
  build_status="Passed"
fi

# Summary
echo ""
echo "=== Check Summary ==="
echo "Date: $YYYY-$MM-$DD"
echo "Time: $HH:$Min:$Sec"
echo ""
echo "ESLint: $lint_status - Found $error_count errors (allowed up to 38)"
echo "Format: $format_status"
echo "Build:  $build_status"

if [ "$any_failed" -eq 1 ]; then
  echo ""
  echo "✗ Some checks failed. Please fix the issues above."
  exit 1
else
  echo ""
  echo "✓ All checks passed successfully!"
  exit 0
fi