#!/bin/bash
# AI Stock Trading Companion - Docker Build Script

set -e

echo "🐳 Building AI Stock Trading Companion Docker Image..."

# Build the Docker image
docker build -t stock-trader-ai:latest .

# Tag with version if provided
if [ ! -z "$1" ]; then
    echo "📦 Tagging image with version: $1"
    docker tag stock-trader-ai:latest stock-trader-ai:$1
fi

echo "✅ Docker image built successfully!"
echo ""
echo "🚀 To run the container:"
echo "   ./docker-run.sh"
echo ""
echo "🔧 To run with docker-compose:"
echo "   docker-compose up -d"
echo ""
echo "📋 Available images:"
docker images | grep stock-trader-ai