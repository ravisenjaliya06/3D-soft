#!/bin/bash

# Format
CWD=$(pwd)
# IGNORED_FOLDERS="(.venv|static)"

pipenv run python -m isort $CWD
pipenv run python -m black $CWD
pipenv run python -m ruff check $CWD --fix

# pipenv run python -m isort --profile black $CWD --skip init.py --skip-glob "$IGNORED_FOLDERS/*"
# pipenv run python -m black $CWD --line-length 120 --exclude "$IGNORED_FOLDERS"
# pipenv run python -m check $CWD --fix
