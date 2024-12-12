#!/bin/sh

# Load the .env file
if [ -f /tmp/.env ]; then
    export $(grep -v '^#' /tmp/.env | xargs)
    echo ".env loaded from /tmp folder"
else
    echo ".env file not found"
 #   exit 1
fi

if mkdir /flux-dns-fdm/; then
echo "Log directory created successfully"
fi
if touch /flux-dns-fdm/main.log; then
echo "Log file created successfully"
else
echo "Log file failed to create"
fi

# Run npm start
npm run start
