#!/bin/bash
# Ensure the SSH directory exists and has the right permissions
mkdir -p /root/.ssh
chmod 700 /root/.ssh
chmod 600 /root/.ssh/*

# Execute the command passed to the docker run command
exec "$@"
