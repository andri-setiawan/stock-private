#!/bin/bash
# AI Stock Trading Companion - Docker Run Script

set -e

# Default configuration
IMAGE_NAME="stock-trader-ai:latest"
CONTAINER_NAME="stock-trader-ai-app"
PORT="3000"

# Load environment variables from .env.docker if it exists
if [ -f ".env.docker" ]; then
    echo "📋 Loading environment from .env.docker"
    export $(cat .env.docker | grep -v '#' | xargs)
fi

echo "🐳 Starting AI Stock Trading Companion..."

# Stop and remove existing container if it exists
if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    echo "🛑 Stopping existing container..."
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
fi

# Run the container
echo "🚀 Starting new container..."
docker run -d \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    -p $PORT:3000 \
    -e NODE_ENV=production \
    -e PORT=3000 \
    -e NEXT_PUBLIC_FINNHUB_API_KEY="${NEXT_PUBLIC_FINNHUB_API_KEY:-d170vi9r01qkv5jdsaa0d170vi9r01qkv5jdsaag}" \
    -e NEXT_PUBLIC_GEMINI_API_KEY="${NEXT_PUBLIC_GEMINI_API_KEY:-AIzaSyDGiM_0F-fQsJY4OXZsAAGVjKMG_kuxytg}" \
    -e NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-your-super-secret-nextauth-secret-key-here}" \
    -e NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:3000}" \
    -e USER_PASSWORD_HASH="${USER_PASSWORD_HASH:-\$2b\$10\$example.hash.for.password}" \
    -v stock-trader-data:/app/data \
    $IMAGE_NAME

echo "✅ Container started successfully!"
echo ""
echo "🌐 Application URL: http://localhost:$PORT"
echo "👤 Login: andrisetiawan / masandri9922"
echo ""
echo "📊 Container status:"
docker ps | grep $CONTAINER_NAME
echo ""
echo "📋 Useful commands:"
echo "   docker logs $CONTAINER_NAME -f    # View logs"
echo "   docker stop $CONTAINER_NAME       # Stop container"
echo "   docker restart $CONTAINER_NAME    # Restart container"