#!/bin/bash

echo "Starting installation process..."

# Check if npm is installed
if ! command -v npm >/dev/null 2>&1; then
    echo "Error: npm is not installed or not found in PATH. Please install Node.js first."
    exit 1
fi

# Installing yarn
echo "Installing yarn globally..."
npm install --global yarn
if [ $? -ne 0 ]; then
    echo "Error: Failed to install yarn."
    exit 1
fi

# Refresh PATH to ensure yarn is recognized
export PATH="$HOME/.yarn/bin:$PATH"
if ! command -v yarn >/dev/null 2>&1; then
    echo "Error: Yarn is not recognized. Ensure it installed correctly."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
yarn install --production
if [ $? -ne 0 ]; then
    echo "Error: Failed to install dependencies with yarn."
    exit 1
fi

# Install dotenv-cli globally
echo "Installing dotenv-cli globally..."
yarn global add dotenv-cli
if [ $? -ne 0 ]; then
    echo "Error: Failed to install dotenv-cli."
    exit 1
fi

echo "Installation complete!"