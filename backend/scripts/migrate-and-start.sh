#!/bin/sh
# Migration script with retry logic for production

MAX_RETRIES=3
RETRY_DELAY=5

echo "Starting migration process..."

# Function to run migration
run_migration() {
    echo "Attempting migration (attempt $1 of $MAX_RETRIES)..."
    npx prisma migrate deploy
    return $?
}

# Retry loop
attempt=1
while [ $attempt -le $MAX_RETRIES ]; do
    if run_migration $attempt; then
        echo "✓ Migration successful!"
        break
    else
        echo "✗ Migration failed (attempt $attempt)"

        if [ $attempt -lt $MAX_RETRIES ]; then
            echo "Retrying in ${RETRY_DELAY} seconds..."
            sleep $RETRY_DELAY
        else
            echo "ERROR: All migration attempts failed!"
            echo ""
            echo "To debug, check:"
            echo "  1. Database connection (DATABASE_URL)"
            echo "  2. Migration files in prisma/migrations/"
            echo "  3. Run 'npx prisma migrate status' to see pending migrations"
            echo ""

            # Check migration status for debugging
            echo "Current migration status:"
            npx prisma migrate status || true

            # Exit with error - container will restart
            exit 1
        fi
    fi
    attempt=$((attempt + 1))
done

# Start the server
echo "Starting Node.js server..."
exec node dist/index.js
