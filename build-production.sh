#!/bin/bash
# AI Stock Trading Companion - Production Docker Build Script

set -e

echo "🚀 Building Production Docker Image for AI Stock Trading Companion..."

# Configuration
IMAGE_NAME="stock-trader-ai"
VERSION=${1:-latest}
REGISTRY=${2:-""}  # Optional registry prefix like "your-registry.com/"

# Build arguments
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo "📋 Build Configuration:"
echo "   Image: ${REGISTRY}${IMAGE_NAME}:${VERSION}"
echo "   Build Date: ${BUILD_DATE}"
echo "   Git Commit: ${GIT_COMMIT}"
echo ""

# Clean up any existing containers
echo "🧹 Cleaning up existing containers..."
docker stop ${IMAGE_NAME}-production 2>/dev/null || true
docker rm ${IMAGE_NAME}-production 2>/dev/null || true

# Build the production image
echo "🔨 Building Docker image..."
docker build \
  --build-arg BUILD_DATE="${BUILD_DATE}" \
  --build-arg GIT_COMMIT="${GIT_COMMIT}" \
  --target runner \
  --tag ${REGISTRY}${IMAGE_NAME}:${VERSION} \
  --tag ${REGISTRY}${IMAGE_NAME}:latest \
  .

# Display image information
echo "✅ Production image built successfully!"
echo ""
echo "📊 Image Details:"
docker images | grep ${IMAGE_NAME} | head -5
echo ""

# Security scan (if available)
if command -v docker scan &> /dev/null; then
    echo "🔒 Running security scan..."
    docker scan ${REGISTRY}${IMAGE_NAME}:${VERSION} || echo "⚠️  Security scan failed or not available"
    echo ""
fi

# Test the image
echo "🧪 Testing the image..."
docker run --rm --name ${IMAGE_NAME}-test \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_FINNHUB_API_KEY=test \
  -e NEXT_PUBLIC_GEMINI_API_KEY=test \
  -e NEXTAUTH_SECRET=test-secret \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e USER_PASSWORD_HASH='$2b$10$test.hash' \
  --health-cmd="node -e \"require('http').get('http://localhost:3000/api/test-env', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))\"" \
  --health-interval=10s \
  --health-timeout=3s \
  --health-retries=3 \
  -d \
  ${REGISTRY}${IMAGE_NAME}:${VERSION}

# Wait for health check
echo "⏳ Waiting for health check..."
sleep 15

# Check if container is healthy
HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' ${IMAGE_NAME}-test 2>/dev/null || echo "no-health")
if [ "$HEALTH_STATUS" = "healthy" ]; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed. Status: $HEALTH_STATUS"
    echo "📋 Container logs:"
    docker logs ${IMAGE_NAME}-test
fi

# Clean up test container
docker stop ${IMAGE_NAME}-test 2>/dev/null || true
docker rm ${IMAGE_NAME}-test 2>/dev/null || true

echo ""
echo "🎉 Production image ready!"
echo ""
echo "🚀 To deploy:"
echo "   docker run -d --name ${IMAGE_NAME}-production \\"
echo "     --restart unless-stopped \\"
echo "     -p 3000:3000 \\"
echo "     --env-file .env.production \\"
echo "     -v stock-trader-data:/app/data \\"
echo "     ${REGISTRY}${IMAGE_NAME}:${VERSION}"
echo ""
echo "📋 To push to registry:"
echo "   docker push ${REGISTRY}${IMAGE_NAME}:${VERSION}"
echo "   docker push ${REGISTRY}${IMAGE_NAME}:latest"
echo ""
echo "🔧 To run with docker-compose:"
echo "   docker-compose -f docker-compose.prod.yml up -d"