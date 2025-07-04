#!/bin/bash
# AI Stock Trading Companion - Production Deployment Script

set -e

echo "🚀 Deploying AI Stock Trading Companion to Production..."

# Configuration
IMAGE_NAME="stock-trader-ai"
CONTAINER_NAME="stock-trader-ai-production"
VERSION=${1:-latest}
PORT=${2:-3000}

# Check if production environment file exists
if [ ! -f ".env.production" ]; then
    echo "❌ Production environment file not found!"
    echo "Please create .env.production with your production configuration."
    echo "You can copy from .env.docker and modify the values."
    exit 1
fi

# Load production environment
echo "📋 Loading production environment..."
export $(cat .env.production | grep -v '#' | xargs)

# Validate required environment variables
REQUIRED_VARS=("NEXTAUTH_SECRET" "NEXTAUTH_URL")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set in .env.production"
        exit 1
    fi
done

# Check if we need to update the secret
if [[ "$NEXTAUTH_SECRET" == *"CHANGE_THIS"* ]]; then
    echo "⚠️  WARNING: NEXTAUTH_SECRET still contains default value!"
    echo "Please update .env.production with a secure random string."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Stop existing container if running
echo "🛑 Stopping existing container..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Pull latest image (if using registry)
if [[ "$IMAGE_NAME" == *"/"* ]]; then
    echo "📥 Pulling latest image..."
    docker pull $IMAGE_NAME:$VERSION
fi

# Create data volume if it doesn't exist
echo "💾 Ensuring data volume exists..."
docker volume create stock-trader-data 2>/dev/null || true

# Deploy the container
echo "🚀 Starting production container..."
docker run -d \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    -p $PORT:3000 \
    --env-file .env.production \
    -v stock-trader-data:/app/data \
    --memory=512m \
    --cpus=0.5 \
    --health-cmd="node -e \"require('http').get('http://localhost:3000/api/test-env', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))\"" \
    --health-interval=30s \
    --health-timeout=10s \
    --health-retries=3 \
    --health-start-period=40s \
    $IMAGE_NAME:$VERSION

# Wait for container to start
echo "⏳ Waiting for container to start..."
sleep 10

# Check container status
if docker ps | grep -q $CONTAINER_NAME; then
    echo "✅ Container started successfully!"
    
    # Wait for health check
    echo "🔍 Waiting for health check..."
    sleep 30
    
    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "unknown")
    case $HEALTH_STATUS in
        "healthy")
            echo "✅ Application is healthy and ready!"
            ;;
        "unhealthy")
            echo "❌ Application health check failed!"
            echo "📋 Recent logs:"
            docker logs --tail 20 $CONTAINER_NAME
            exit 1
            ;;
        "starting")
            echo "⏳ Application is still starting..."
            ;;
        *)
            echo "❓ Health status unknown: $HEALTH_STATUS"
            ;;
    esac
else
    echo "❌ Container failed to start!"
    echo "📋 Container logs:"
    docker logs $CONTAINER_NAME
    exit 1
fi

# Display deployment information
echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📊 Container Status:"
docker ps | grep $CONTAINER_NAME
echo ""
echo "🌐 Application URLs:"
echo "   Local: http://localhost:$PORT"
if [ ! -z "$NEXTAUTH_URL" ]; then
    echo "   Production: $NEXTAUTH_URL"
fi
echo ""
echo "👤 Default Login:"
echo "   Username: andrisetiawan"
echo "   Password: masandri9922"
echo ""
echo "📋 Useful Commands:"
echo "   View logs: docker logs $CONTAINER_NAME -f"
echo "   Stop app: docker stop $CONTAINER_NAME"
echo "   Restart app: docker restart $CONTAINER_NAME"
echo "   Remove app: docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"
echo ""
echo "💾 Data Volume: stock-trader-data"
echo "   Backup: docker run --rm -v stock-trader-data:/data -v \$(pwd):/backup alpine tar czf /backup/backup-\$(date +%Y%m%d).tar.gz -C /data ."
echo ""

# Optional: Show resource usage
if command -v docker stats &> /dev/null; then
    echo "📈 Resource Usage (5 seconds):"
    timeout 5 docker stats $CONTAINER_NAME --no-stream 2>/dev/null || true
fi

echo "✅ Production deployment complete!"