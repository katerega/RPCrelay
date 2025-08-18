#!/bin/bash

# Exit on any error
set -e

# Navigate to project directory (change if needed)
cd "$(dirname "$0")"

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Check if axios is installed, if not install it
if ! npm list axios >/dev/null 2>&1; then
  echo "Installing axios..."
  npm install axios
fi

# Increase file watchers limit (Linux only)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  echo "Increasing file watchers limit (Linux)..."
  sudo sysctl fs.inotify.max_user_watches=524288
fi

# Start the React development server
echo "Starting the app..."
npm start