# Get the list of migration files changed in the current PR
migration_files=$(git diff --diff-filter=A --name-only origin/main...HEAD -- ./umaboy/migrations/*.py)

echo "file check"
echo "$migration_files"
# Check if any migration files exist
if [[ -z "$migration_files" ]]; then
  echo "No migration files found in the current PR."
  exit 0
fi

echo "Found migration files in the current PR:"
echo "$migration_files"

# Extract app names from migration files
app_names=$(for file in $migration_files; do echo "${file%/*}" | awk -F'/' '{print $(NF-1)}'; done | sort -u)

echo "App names found:"
echo "$app_names"

# Check for multiple migration files per app
for app_name in $app_names; do
  # Count only the migration files that are newly created or modified in the current PR
  app_migration_files=$(echo "$migration_files" | grep "$app_name" | grep -v "__init__.py" | wc -l)
  echo "Checking app '$app_name': $app_migration_files migration files found."
  
  # If more than one migration file is found, raise an error
  if [[ "$app_migration_files" -gt 1 ]]; then
    echo "Error: Multiple migration files found for app '$app_name'."
    exit 1
  fi
done

echo "Migration check passed: This PR has more than one migration file per app."
exit 0
