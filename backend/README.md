## Get Started

1. Go To Project Folder
```bash
cd backend
```
2. Install Dependencies
```bash
pipenv install
pipenv install --dev
```

3. Create .env file
```
cp .env.example .env
```

# After copying, open the .env file and fill in the required values for your environment.
# Make sure to set the following keys:
SECRET_KEY=  # Your secret key for the application
DEBUG=True      # Set to True for development, False for production
PORT=8000        # The port number your application will run on (e.g., 8000)
HOST=localhost   # The host address (e.g., 127.0.0.1 or localhost)



4. Migrate Database
```bash
pipenv run python manage.py migrate
```

5. Create initial permission and group
```bash
pipenv run python scripts/create_initial_permission_and_group.py
```

6. Create textures, catalogs
```bash
pipenv run python scripts/design_add_data.py
```

7. Create Materials
```bash
pipenv run python scripts/add_material_data.py
```

8. Run Project
```bash
pipenv run python manage.py runserver
```



[optional]
1. Create Superuser
```bash
pipenv run python manage.py createsuperuser
```
# Follow the prompts to enter a username, email, and password for the superuser account.
# This account will have admin privileges to access the admin panel.

2. Login to Admin Panel
   - Go to `http://localhost:8000/admin` in your web browser.
   - Use the superuser credentials (username and password) you created to log in.


### Formatter Code
To format your backend code using Black and isort, run the following command:

```bash
bash scripts/formatter.sh
```
This command will apply the formatting rules defined in your backend configuration to your Python codebase. It uses `isort` to sort imports and `black` to format the code according to the Black style guide.

### Type Checker
To check your backend code for type-related issues, run the following command:

```bash
bash scripts/type-checker.sh
```

### Check the Test Cases

To run your test cases, use the following command:

```bash
pipenv run pytest
```

This command will execute all the tests in Bravento project.

### Check Test Coverage

To check the total coverage percentage, run:

```bash
pipenv run coverage run -m pytest
```

This command will run the tests and collect coverage data.

### Generate Coverage Report

After running the tests with coverage, you can generate a report by executing:

```bash
pipenv run coverage report
```

This command will display a summary of the coverage results in the terminal.

### Makefile
To install `make`, open PowerShell and run:
```
choco install make
```

Once `make` is installed, you can use it to format and tyepe-checker your code by running:

formatter code

```base
make fmt
```

type-checker code
```base
make type
```

## All Command Run
run the following command:

```
check.bat
```
