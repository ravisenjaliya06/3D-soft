.SILENT:
.PHONY: formatter type-checker all test run makemigrations migrate

PYTHON=pipenv run python
DJANGO_MANAGE=$(PYTHON) manage.py

fmt:
	@echo "Running formatter..."
	sh ./scripts/formatter.sh
	@if [ ! -x ./scripts/formatter.sh ]; then echo "Error: formatter.sh not found or not executable"; exit 1; fi


type:
	@echo "Running type checker..."
	sh ./scripts/type-checker.sh


all: fmt type


test:
	@echo "Running tests..."
	pipenv run pytest


run:
	@echo "Starting the Django development server..."
	$(DJANGO_MANAGE) runserver


makemigrations:
	@echo "Creating database migrations..."
	$(DJANGO_MANAGE) makemigrations


migrate:
	@echo "Applying database migrations..."
	$(DJANGO_MANAGE) migrate
