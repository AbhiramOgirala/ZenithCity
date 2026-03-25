#!/bin/bash

echo "Building ZenithCity Backend Docker Image..."

# Build the Docker image
docker build -t zenithcity-backend .

if [ $? -eq 0 ]; then
    echo "✅ Docker build successful!"
    echo "To run the container:"
    echo "docker run -p 3001:3001 --env-file .env zenithcity-backend"
else
    echo "❌ Docker build failed!"
    exit 1
fi