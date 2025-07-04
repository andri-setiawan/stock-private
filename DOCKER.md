# 🐳 Docker Deployment Guide
## AI Stock Trading Companion - Complete Container Solution

This comprehensive guide covers deploying the AI Stock Trading Companion using Docker containers across multiple platforms and environments.

## 📋 Prerequisites

- Docker 20.0+ installed
- Docker Compose 2.0+ installed
- 2GB+ available RAM
- 5GB+ available disk space
- API keys (Finnhub & Gemini AI)

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone and navigate to the project
cd stock-trader-ai

# 2. Copy and configure environment file
cp .env.docker .env.local
# Edit .env.local with your API keys and secrets

# 3. Start with docker-compose
docker-compose up -d

# 4. Access the application
open http://localhost:3000
```

### Option 2: Build and Run Scripts

```bash
# 1. Build the Docker image
./docker-build.sh

# 2. Run the container
./docker-run.sh

# 3. Access the application
open http://localhost:3000
```

### Option 3: Manual Docker Commands

```bash
# Build the image
docker build -t stock-trader-ai:latest .

# Run the container
docker run -d \
  --name stock-trader-ai-app \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_key \
  -e NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key \
  -e NEXTAUTH_SECRET=your_super_secret_key \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -v stock-trader-data:/app/data \
  stock-trader-ai:latest
```

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file or set these environment variables:

```bash
# Required API Keys
NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_api_key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

# Authentication (generate using scripts/generate-hash.js)
NEXTAUTH_SECRET=your-super-secret-nextauth-secret-key
NEXTAUTH_URL=http://localhost:3000
USER_PASSWORD_HASH=your_bcrypt_password_hash

# Optional Production Settings
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

### Generate Password Hash

```bash
# Generate bcrypt hash for password
node scripts/generate-hash.js YOUR_PASSWORD
```

## 🔧 Production Deployment

### Using Production Compose File

```bash
# For production with nginx and redis
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Configuration

1. **Copy environment template:**
   ```bash
   cp .env.docker .env.production
   ```

2. **Update production values:**
   ```bash
   # Update with your production values
   NEXTAUTH_URL=https://your-domain.com
   NEXTAUTH_SECRET=your-super-secure-production-secret
   # ... other production values
   ```

3. **Deploy:**
   ```bash
   docker-compose --env-file .env.production -f docker-compose.prod.yml up -d
   ```

## 📊 Container Management

### View Logs
```bash
# Follow logs
docker logs stock-trader-ai-app -f

# View last 100 lines
docker logs stock-trader-ai-app --tail 100
```

### Health Check
```bash
# Check container health
docker ps
docker inspect stock-trader-ai-app | grep Health -A 5
```

### Container Shell Access
```bash
# Access container shell
docker exec -it stock-trader-ai-app sh
```

### Update Application
```bash
# Pull latest changes and rebuild
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🔒 Security Considerations

### Production Security

1. **Change default credentials:**
   ```bash
   # Generate new password hash
   node scripts/generate-hash.js your_new_password
   ```

2. **Use strong secrets:**
   ```bash
   # Generate random secret
   openssl rand -base64 32
   ```

3. **Enable HTTPS:**
   - Configure nginx with SSL certificates
   - Update NEXTAUTH_URL to use https://

4. **Restrict network access:**
   ```bash
   # Only expose necessary ports
   docker-compose up -d
   # Don't expose internal services publicly
   ```

## 📈 Performance Optimization

### Resource Limits

The containers are configured with resource limits:

```yaml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
    reservations:
      memory: 256M
      cpus: '0.25'
```

### Scaling

```bash
# Scale to multiple instances
docker-compose up -d --scale stock-trader-ai=3
```

## 🛠️ Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Check what's using port 3000
   sudo lsof -i :3000
   # Or change port in docker-compose.yml
   ```

2. **Container won't start:**
   ```bash
   # Check logs for errors
   docker logs stock-trader-ai-app
   # Check environment variables
   docker exec stock-trader-ai-app env
   ```

3. **API keys not working:**
   ```bash
   # Verify environment variables are set
   docker exec stock-trader-ai-app env | grep API
   ```

4. **Memory issues:**
   ```bash
   # Check container memory usage
   docker stats stock-trader-ai-app
   ```

### Health Check Endpoint

The application includes a health check endpoint:
```bash
curl http://localhost:3000/api/test-env
```

## 📦 Build Information

### Multi-stage Build

The Dockerfile uses a multi-stage build for optimization:

1. **Dependencies stage:** Installs production dependencies
2. **Builder stage:** Builds the Next.js application
3. **Runtime stage:** Creates minimal production image

### Image Size Optimization

- Uses Alpine Linux base image (~5MB)
- Multi-stage build removes build dependencies
- .dockerignore excludes unnecessary files
- Standalone output mode for Next.js

## 🔄 Backup and Restore

### Data Backup
```bash
# Backup persistent data
docker run --rm -v stock-trader-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/stock-trader-backup-$(date +%Y%m%d).tar.gz -C /data .
```

### Data Restore
```bash
# Restore from backup
docker run --rm -v stock-trader-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/stock-trader-backup-YYYYMMDD.tar.gz -C /data
```

## 📞 Support

For Docker-related issues:

1. Check the logs: `docker logs stock-trader-ai-app -f`
2. Verify environment variables
3. Check resource usage: `docker stats`
4. Review health check status
5. Test API endpoints: `curl http://localhost:3000/api/test-env`

---

## 🎯 Default Login Credentials

- **Username:** `YOUR_USERNAME`
- **Password:** `YOUR_PASSWORD`

**⚠️ Important:** Change these credentials in production!

---

## 📚 Additional Resources

- **[Complete Deployment Guide](DOCKER_DEPLOYMENT_GUIDE.md)**: Comprehensive guide for all container platforms
- **[Platform Tutorials](CONTAINER_PLATFORM_TUTORIALS.md)**: Step-by-step tutorials for Railway, Heroku, Google Cloud Run, AWS ECS, etc.
- **[Kubernetes Setup](k8s/)**: Production-ready Kubernetes configurations
- **[Nginx Configuration](nginx/)**: Production reverse proxy setup

## 🚀 Production Deployment Platforms

| Platform | Complexity | Cost | Auto-Scale | HTTPS | Domain |
|----------|------------|------|------------|-------|---------|
| **Railway** | ⭐ Easy | Free tier | ✅ | ✅ | ✅ |
| **Google Cloud Run** | ⭐⭐ Medium | Pay per use | ✅ | ✅ | ✅ |
| **Heroku** | ⭐⭐ Medium | $7/month | ✅ | ✅ | ✅ |
| **DigitalOcean Apps** | ⭐⭐ Medium | $5/month | ✅ | ✅ | ✅ |
| **AWS ECS** | ⭐⭐⭐ Complex | Variable | ✅ | ⚙️ | ⚙️ |
| **Kubernetes** | ⭐⭐⭐⭐ Expert | Variable | ✅ | ⚙️ | ⚙️ |

### 🎯 Recommended Platforms

**For Beginners**: Railway or DigitalOcean App Platform  
**For Scale**: Google Cloud Run or AWS ECS  
**For Enterprise**: Kubernetes with managed services

---

## 🔧 Quick Deployment Commands

### Railway (Fastest)
```bash
npm install -g @railway/cli
railway login
railway create stock-trader-ai
railway env set NEXT_PUBLIC_FINNHUB_API_KEY=your_key
railway env set NEXT_PUBLIC_GEMINI_API_KEY=your_key  
railway env set NEXTAUTH_SECRET=$(openssl rand -base64 32)
railway up
```

### Google Cloud Run
```bash
gcloud auth login
docker build -t gcr.io/your-project/stock-trader-ai .
docker push gcr.io/your-project/stock-trader-ai
gcloud run deploy --image gcr.io/your-project/stock-trader-ai --allow-unauthenticated
```

### Heroku Container
```bash
heroku create your-app-name
heroku container:push web -a your-app-name
heroku container:release web -a your-app-name
```

---

*Docker Guide v1.0 - Last Updated: 2025-01-16*