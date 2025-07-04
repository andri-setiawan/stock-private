# 🐳 Container Platform Deployment Tutorials
## AI Stock Trading Companion - Step-by-Step Deployment Guides

This document provides detailed, step-by-step tutorials for deploying the AI Stock Trading Companion to various container platforms. Each tutorial is designed to be followed independently.

## 📋 Table of Contents

1. [Railway Deployment Tutorial](#railway-deployment-tutorial)
2. [Heroku Container Tutorial](#heroku-container-tutorial)
3. [DigitalOcean App Platform Tutorial](#digitalocean-app-platform-tutorial)
4. [Google Cloud Run Tutorial](#google-cloud-run-tutorial)
5. [AWS ECS Tutorial](#aws-ecs-tutorial)
6. [Local Docker Tutorial](#local-docker-tutorial)

---

## Railway Deployment Tutorial

Railway is the fastest way to deploy containerized applications with automatic HTTPS and domain management.

### 🚂 Prerequisites
- Railway account ([signup here](https://railway.app))
- Git repository with your code
- API keys (Finnhub & Gemini)

### Step 1: Install Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login
```

### Step 2: Create Project
```bash
# Create new Railway project
railway create stock-trader-ai

# Navigate to your project directory
cd stock-trader-ai
```

### Step 3: Configure Environment Variables
```bash
# Set all required environment variables
railway env set NODE_ENV=production
railway env set PORT=3000
railway env set NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_api_key
railway env set NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
railway env set NEXTAUTH_SECRET=$(openssl rand -base64 32)
railway env set USER_PASSWORD_HASH='$2a$10$N9qo8uLOickgx2ZMRZoMye/jZGfEOw5Gk4IfzKHhvOaANEfmSVsqW'
```

### Step 4: Deploy
```bash
# Deploy to Railway
railway up

# The deployment will automatically:
# - Build your Docker image
# - Deploy to Railway's infrastructure
# - Provide HTTPS endpoint
```

### Step 5: Configure Domain (Optional)
```bash
# Add custom domain
railway domain

# Or use Railway's provided domain
railway domain --help
```

### Step 6: Monitor Deployment
```bash
# View logs
railway logs

# Check status
railway status

# Open in browser
railway open
```

**✅ Your app is now live!** Railway will provide a URL like `https://stock-trader-ai-production.up.railway.app`

---

## Heroku Container Tutorial

Deploy using Heroku's container registry for full Docker support.

### 🟣 Prerequisites
- Heroku account ([signup here](https://heroku.com))
- Heroku CLI installed
- Docker installed locally

### Step 1: Install and Setup Heroku CLI
```bash
# Install Heroku CLI (macOS)
brew tap heroku/brew && brew install heroku

# Install Heroku CLI (Ubuntu/Debian)
curl https://cli-assets.heroku.com/install.sh | sh

# Login to Heroku
heroku login

# Login to Heroku Container Registry
heroku container:login
```

### Step 2: Create Heroku App
```bash
# Create new Heroku app
heroku create your-stock-trader-app

# Verify app creation
heroku apps:info -a your-stock-trader-app
```

### Step 3: Set Environment Variables
```bash
# Set production environment variables
heroku config:set NODE_ENV=production -a your-stock-trader-app
heroku config:set NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_key -a your-stock-trader-app
heroku config:set NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key -a your-stock-trader-app
heroku config:set NEXTAUTH_SECRET=$(openssl rand -base64 32) -a your-stock-trader-app
heroku config:set USER_PASSWORD_HASH='$2a$10$N9qo8uLOickgx2ZMRZoMye/jZGfEOw5Gk4IfzKHhvOaANEfmSVsqW' -a your-stock-trader-app

# Verify environment variables
heroku config -a your-stock-trader-app
```

### Step 4: Deploy Container
```bash
# Build and push container to Heroku
heroku container:push web -a your-stock-trader-app

# Release the container
heroku container:release web -a your-stock-trader-app
```

### Step 5: Verify Deployment
```bash
# Check app status
heroku ps -a your-stock-trader-app

# View logs
heroku logs --tail -a your-stock-trader-app

# Open in browser
heroku open -a your-stock-trader-app
```

**✅ Your app is now live!** Access it at `https://your-stock-trader-app.herokuapp.com`

---

## DigitalOcean App Platform Tutorial

DigitalOcean App Platform provides managed container hosting with built-in CI/CD.

### 🌊 Prerequisites
- DigitalOcean account ([signup here](https://digitalocean.com))
- GitHub repository with your code
- doctl CLI (optional)

### Step 1: Create App via Web Interface

1. **Login to DigitalOcean**
   - Go to [DigitalOcean Console](https://cloud.digitalocean.com)
   - Navigate to "Apps" in the sidebar

2. **Create New App**
   - Click "Create App"
   - Choose "GitHub" as source
   - Select your repository and branch

3. **Configure Build Settings**
   - Choose "Dockerfile" as build method
   - Set build context to root directory
   - Dockerfile path: `Dockerfile`

### Step 2: Configure Environment Variables

In the App Platform interface:

```
NODE_ENV = production
PORT = 3000
NEXT_PUBLIC_FINNHUB_API_KEY = your_finnhub_key (encrypted)
NEXT_PUBLIC_GEMINI_API_KEY = your_gemini_key (encrypted)
NEXTAUTH_SECRET = your_secret_key (encrypted)
USER_PASSWORD_HASH = your_password_hash (encrypted)
```

### Step 3: Configure Resources
- **Instance Type**: Basic (512MB RAM, 1 vCPU)
- **Instance Count**: 1 (can scale later)
- **HTTP Port**: 3000

### Step 4: Deploy
1. Review configuration
2. Click "Create Resources"
3. Wait for deployment (5-10 minutes)

### Step 5: Configure Domain (Optional)
1. Go to "Settings" tab
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as instructed

**✅ Your app is now live!** DigitalOcean provides a URL like `https://stock-trader-ai-xyz123.ondigitalocean.app`

---

## Google Cloud Run Tutorial

Deploy to Google's serverless container platform with automatic scaling.

### ☁️ Prerequisites
- Google Cloud account with billing enabled
- Google Cloud SDK installed
- Docker installed locally

### Step 1: Setup Google Cloud SDK
```bash
# Install Google Cloud SDK (macOS)
brew install google-cloud-sdk

# Install Google Cloud SDK (Ubuntu/Debian)
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Authenticate
gcloud auth login

# Set project
gcloud config set project your-project-id

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
```

### Step 2: Configure Docker Authentication
```bash
# Configure Docker to use gcloud as credential helper
gcloud auth configure-docker
```

### Step 3: Build and Push Container
```bash
# Build container for Cloud Run
docker build -t gcr.io/your-project-id/stock-trader-ai .

# Push to Google Container Registry
docker push gcr.io/your-project-id/stock-trader-ai
```

### Step 4: Deploy to Cloud Run
```bash
# Deploy with all environment variables
gcloud run deploy stock-trader-ai \
  --image gcr.io/your-project-id/stock-trader-ai \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-env-vars NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_key \
  --set-env-vars NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key \
  --set-env-vars NEXTAUTH_SECRET=your_secret_key \
  --set-env-vars USER_PASSWORD_HASH=your_password_hash \
  --memory 512Mi \
  --cpu 1 \
  --port 3000 \
  --max-instances 10
```

### Step 5: Configure Custom Domain (Optional)
```bash
# Map custom domain
gcloud run domain-mappings create \
  --service stock-trader-ai \
  --domain stocks.yourdomain.com \
  --region us-central1

# Follow DNS configuration instructions
```

### Step 6: Monitor Deployment
```bash
# Check service status
gcloud run services list

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=stock-trader-ai" --limit 50

# Get service URL
gcloud run services describe stock-trader-ai --region us-central1 --format="value(status.url)"
```

**✅ Your app is now live!** Cloud Run provides a URL like `https://stock-trader-ai-xyz123-uc.a.run.app`

---

## AWS ECS Tutorial

Deploy to Amazon Elastic Container Service with Fargate for serverless containers.

### 🚀 Prerequisites
- AWS account with appropriate permissions
- AWS CLI installed and configured
- Docker installed locally

### Step 1: Setup AWS CLI
```bash
# Install AWS CLI (macOS)
brew install awscli

# Install AWS CLI (Ubuntu/Debian)
sudo apt-get install awscli

# Configure AWS credentials
aws configure
```

### Step 2: Create ECR Repository
```bash
# Create ECR repository
aws ecr create-repository --repository-name stock-trader-ai --region us-east-1

# Get login token for ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account-id.dkr.ecr.us-east-1.amazonaws.com
```

### Step 3: Build and Push Container
```bash
# Build container
docker build -t stock-trader-ai .

# Tag for ECR
docker tag stock-trader-ai:latest your-account-id.dkr.ecr.us-east-1.amazonaws.com/stock-trader-ai:latest

# Push to ECR
docker push your-account-id.dkr.ecr.us-east-1.amazonaws.com/stock-trader-ai:latest
```

### Step 4: Store Secrets in Parameter Store
```bash
# Store API keys securely
aws ssm put-parameter --name "/stock-trader-ai/finnhub-key" --value "your_finnhub_key" --type "SecureString" --region us-east-1
aws ssm put-parameter --name "/stock-trader-ai/gemini-key" --value "your_gemini_key" --type "SecureString" --region us-east-1
aws ssm put-parameter --name "/stock-trader-ai/nextauth-secret" --value "your_secret" --type "SecureString" --region us-east-1
aws ssm put-parameter --name "/stock-trader-ai/password-hash" --value "your_hash" --type "SecureString" --region us-east-1
```

### Step 5: Create ECS Task Definition
Create `task-definition.json`:
```json
{
  "family": "stock-trader-ai",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::your-account-id:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::your-account-id:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "stock-trader-ai",
      "image": "your-account-id.dkr.ecr.us-east-1.amazonaws.com/stock-trader-ai:latest",
      "portMappings": [{"containerPort": 3000, "protocol": "tcp"}],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "3000"}
      ],
      "secrets": [
        {"name": "NEXT_PUBLIC_FINNHUB_API_KEY", "valueFrom": "arn:aws:ssm:us-east-1:your-account-id:parameter/stock-trader-ai/finnhub-key"},
        {"name": "NEXT_PUBLIC_GEMINI_API_KEY", "valueFrom": "arn:aws:ssm:us-east-1:your-account-id:parameter/stock-trader-ai/gemini-key"},
        {"name": "NEXTAUTH_SECRET", "valueFrom": "arn:aws:ssm:us-east-1:your-account-id:parameter/stock-trader-ai/nextauth-secret"},
        {"name": "USER_PASSWORD_HASH", "valueFrom": "arn:aws:ssm:us-east-1:your-account-id:parameter/stock-trader-ai/password-hash"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/stock-trader-ai",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Step 6: Deploy to ECS
```bash
# Create CloudWatch log group
aws logs create-log-group --log-group-name /ecs/stock-trader-ai --region us-east-1

# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json --region us-east-1

# Create ECS cluster (if not exists)
aws ecs create-cluster --cluster-name stock-trader-cluster --region us-east-1

# Create service
aws ecs create-service \
  --cluster stock-trader-cluster \
  --service-name stock-trader-ai \
  --task-definition stock-trader-ai:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}" \
  --region us-east-1
```

**✅ Your app is now live!** Access it through the ECS service's public IP or load balancer.

---

## Local Docker Tutorial

Run the application locally using Docker for development and testing.

### 🐳 Prerequisites
- Docker installed ([download here](https://docs.docker.com/get-docker/))
- Docker Compose installed
- API keys (Finnhub & Gemini)

### Step 1: Clone Repository
```bash
# Clone the repository
git clone <repository-url>
cd stock-trader-ai
```

### Step 2: Configure Environment
```bash
# Copy environment template
cp .env.docker .env.local

# Edit environment file
nano .env.local
```

Update the following values in `.env.local`:
```env
NEXT_PUBLIC_FINNHUB_API_KEY=your_actual_finnhub_key
NEXT_PUBLIC_GEMINI_API_KEY=your_actual_gemini_key
NEXTAUTH_SECRET=your_secure_random_secret
USER_PASSWORD_HASH=your_bcrypt_hash
NEXTAUTH_URL=http://localhost:3000
```

### Step 3: Generate Password Hash
```bash
# Generate secure password hash
node scripts/generate-hash.js your_password

# Copy the generated hash to USER_PASSWORD_HASH in .env.local
```

### Step 4: Build and Run with Docker Compose
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### Step 5: Access Application
- **URL**: http://localhost:3000
- **Username**: YOUR_USERNAME
- **Password**: YOUR_PASSWORD (or your custom password)

### Step 6: Development Commands
```bash
# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# View application logs
docker-compose logs stock-trader-ai -f

# Access container shell
docker-compose exec stock-trader-ai sh
```

### Alternative: Manual Docker Commands
```bash
# Build image
./docker-build.sh

# Run container
./docker-run.sh

# Or run manually
docker run -d \
  --name stock-trader-ai-app \
  -p 3000:3000 \
  --env-file .env.local \
  stock-trader-ai:latest
```

**✅ Your app is now running locally!** Access it at http://localhost:3000

---

## 🔧 Post-Deployment Steps

### Verify Deployment
1. **Health Check**: Visit `/api/test-env` endpoint
2. **Login Test**: Use provided credentials
3. **API Test**: Search for a stock (e.g., "AAPL")
4. **AI Test**: Get a trading recommendation

### Security Configuration
1. **Change Default Password**: Generate new hash with custom password
2. **Update Secrets**: Use platform-specific secret management
3. **Configure HTTPS**: Ensure SSL/TLS is properly configured
4. **Set CORS**: Update allowed origins for production domain

### Monitoring Setup
1. **Health Monitoring**: Set up uptime monitoring
2. **Log Aggregation**: Configure centralized logging
3. **Alerts**: Set up alerts for errors and downtime
4. **Performance**: Monitor response times and resource usage

---

## 🆘 Troubleshooting

### Common Issues

**Container Won't Start**
```bash
# Check logs
docker logs container-name

# Verify environment variables
docker exec container-name env | grep API_KEY
```

**API Connection Errors**
```bash
# Test API endpoints
curl http://localhost:3000/api/test-env

# Check external API connectivity
curl -I https://finnhub.io
```

**Authentication Issues**
```bash
# Verify password hash
node scripts/generate-hash.js your_password

# Check NextAuth configuration
echo $NEXTAUTH_SECRET | base64
```

**Memory/Performance Issues**
```bash
# Check resource usage
docker stats container-name

# Increase memory limits
docker update --memory=1g container-name
```

---

## 📞 Support

For deployment assistance:

1. **Check platform documentation**: Each platform has detailed guides
2. **Review logs**: Container logs provide detailed error information
3. **Test locally first**: Ensure the application works with Docker locally
4. **Verify environment variables**: Most issues are configuration-related
5. **Check API limits**: Ensure you're within API rate limits

---

*Last Updated: 2025-01-16 | Tutorials Version: 1.0*