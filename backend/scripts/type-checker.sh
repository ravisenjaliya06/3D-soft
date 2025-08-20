#!/bin/bash

CWD=$(pwd)
# mypy_output=$(pipenv run mypy $CWD --ignore-missing-imports --exclude '/migrations/' 2>&1)
ruff_output=$(pipenv run ruff check $CWD 2>&1)
echo "$ruff_output"
error_count=$(echo "$ruff_output" | grep -oE 'Found ([0-9]+) error(s?)' | awk '{print $2}')

max_allowed_errors=0
if [ -z "$error_count" ]; then
    error_count=0
fi
# Check if the error_count is less than or equal to max_allowed_errors
if [ "$error_count" -le "$max_allowed_errors" ]; then
    echo "Total errors ($error_count) are within the allowed limit of $max_allowed_errors."
    exit 0
else
    echo "Total errors ($error_count) exceed the allowed limit of $max_allowed_errors."
    exit 1
fi
