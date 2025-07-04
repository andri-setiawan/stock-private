# 🐳 Docker Deployment Guide
## AI Stock Trading Companion - Container Platform Deployment

This comprehensive guide covers deploying the AI Stock Trading Companion to various container platforms including local Docker, cloud platforms, and container orchestration systems.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Docker Setup](#local-docker-setup)
3. [Railway Deployment](#railway-deployment)
4. [Heroku Container Deployment](#heroku-container-deployment)
5. [DigitalOcean App Platform](#digitalocean-app-platform)
6. [Google Cloud Run](#google-cloud-run)
7. [AWS ECS](#aws-ecs)
8. [Azure Container Instances](#azure-container-instances)
9. [Kubernetes Deployment](#kubernetes-deployment)
10. [Production Best Practices](#production-best-practices)
11. [Monitoring & Maintenance](#monitoring--maintenance)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### API Keys Required
- **Finnhub API Key**: Register at [finnhub.io](https://finnhub.io/register)
- **Google Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

---

## Local Docker Setup

### 🚀 Quick Start (Recommended)

```bash
# 1. Clone the repository
git clone <repository-url>
cd stock-trader-ai

# 2. Copy environment configuration
cp .env.docker .env.local

# 3. Edit environment file with your API keys
nano .env.local

# 4. Build and run with Docker Compose
docker-compose up -d

# 5. Access the application
open http://localhost:3000
```

### Manual Docker Commands

```bash
# Build the image
./docker-build.sh

# Run the container
./docker-run.sh

# Or run manually
docker run -d \
  --name stock-trader-ai-app \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_key \
  -e NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key \
  -e NEXTAUTH_SECRET=your_secret_key \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e USER_PASSWORD_HASH=your_password_hash \
  -v stock-trader-data:/app/data \
  stock-trader-ai:latest
```

### Production Setup with Nginx

```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d
```

---

## Railway Deployment

Railway provides simple container deployment with automatic HTTPS and domain management.

### 📊 Setup Steps

1. **Install Railway CLI**
```bash
npm install -g @railway/cli
railway login
```

2. **Create Railway Project**
```bash
railway create stock-trader-ai
cd stock-trader-ai
```

3. **Configure Environment Variables**
```bash
# Set environment variables
railway env set NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_key
railway env set NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key
railway env set NEXTAUTH_SECRET=$(openssl rand -base64 32)
railway env set USER_PASSWORD_HASH='$2a$10$N9qo8uLOickgx2ZMRZoMye/jZGfEOw5Gk4IfzKHhvOaANEfmSVsqW'
railway env set NODE_ENV=production
railway env set PORT=3000
```

4. **Deploy**
```bash
railway up
```

5. **Set Custom Domain (Optional)**
```bash
railway domain
# Follow the prompts to add your custom domain
```

### Railway Configuration File

Create `railway.toml`:
```toml
[build]
builder = "DOCKER"
dockerfilePath = "Dockerfile"

[deploy]
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[environments.production.variables]
NODE_ENV = "production"
PORT = "3000"
NEXT_TELEMETRY_DISABLED = "1"
```

---

## Heroku Container Deployment

Heroku Container Registry allows you to deploy Docker images directly.

### 🚀 Setup Steps

1. **Install Heroku CLI**
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Ubuntu/Debian
curl https://cli-assets.heroku.com/install.sh | sh
```

2. **Login and Setup**
```bash
heroku login
heroku container:login
```

3. **Create Heroku App**
```bash
heroku create your-stock-trader-app
```

4. **Set Environment Variables**
```bash
heroku config:set NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_key -a your-stock-trader-app
heroku config:set NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key -a your-stock-trader-app
heroku config:set NEXTAUTH_SECRET=$(openssl rand -base64 32) -a your-stock-trader-app
heroku config:set USER_PASSWORD_HASH='$2a$10$N9qo8uLOickgx2ZMRZoMye/jZGfEOw5Gk4IfzKHhvOaANEfmSVsqW' -a your-stock-trader-app
heroku config:set NODE_ENV=production -a your-stock-trader-app
```

5. **Deploy Container**
```bash
heroku container:push web -a your-stock-trader-app
heroku container:release web -a your-stock-trader-app
```

6. **Open Application**
```bash
heroku open -a your-stock-trader-app
```

### Heroku-Specific Dockerfile (Optional)

Create `Dockerfile.heroku`:
```dockerfile
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules

RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE $PORT

CMD ["node", "server.js"]
```

---

## DigitalOcean App Platform

DigitalOcean App Platform provides managed container hosting with automatic scaling.

### 🌊 Setup Steps

1. **Install doctl CLI**
```bash
# macOS
brew install doctl

# Ubuntu/Debian
wget https://github.com/digitalocean/doctl/releases/latest/download/doctl-*-linux-amd64.tar.gz
tar xf doctl-*-linux-amd64.tar.gz
sudo mv doctl /usr/local/bin
```

2. **Authenticate**
```bash
doctl auth init
```

3. **Create App Spec File**

Create `.do/app.yaml`:
```yaml
name: stock-trader-ai
services:
- name: web
  source_dir: /
  github:
    repo: your-username/stock-trader-ai
    branch: main
  run_command: node server.js
  build_command: npm run build
  dockerfile_path: Dockerfile
  http_port: 3000
  instance_count: 1
  instance_size_slug: basic-xxs
  env_vars:
  - key: NODE_ENV
    value: production
  - key: NEXT_PUBLIC_FINNHUB_API_KEY
    value: your_finnhub_key
    type: SECRET
  - key: NEXT_PUBLIC_GEMINI_API_KEY
    value: your_gemini_key
    type: SECRET
  - key: NEXTAUTH_SECRET
    value: your_secret_key
    type: SECRET
  - key: USER_PASSWORD_HASH
    value: your_password_hash
    type: SECRET
  - key: PORT
    value: "3000"
```

4. **Deploy**
```bash
doctl apps create .do/app.yaml
```

5. **Get App Info**
```bash
doctl apps list
doctl apps get <app-id>
```

---

## Google Cloud Run

Google Cloud Run provides serverless container deployment with automatic scaling.

### ☁️ Setup Steps

1. **Install Google Cloud SDK**
```bash
# macOS
brew install google-cloud-sdk

# Ubuntu/Debian
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

2. **Authenticate and Setup**
```bash
gcloud auth login
gcloud config set project your-project-id
gcloud auth configure-docker
```

3. **Build and Push to Container Registry**
```bash
# Build for Cloud Run
docker build -t gcr.io/your-project-id/stock-trader-ai .

# Push to registry
docker push gcr.io/your-project-id/stock-trader-ai
```

4. **Deploy to Cloud Run**
```bash
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
  --port 3000
```

5. **Custom Domain (Optional)**
```bash
gcloud run domain-mappings create \
  --service stock-trader-ai \
  --domain stocks.yourdomain.com \
  --region us-central1
```

### Cloud Run Service Configuration

Create `cloudrun.yaml`:
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: stock-trader-ai
  labels:
    cloud.googleapis.com/location: us-central1
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/cpu-throttling: "false"
        run.googleapis.com/memory: "512Mi"
    spec:
      containerConcurrency: 80
      timeoutSeconds: 300
      containers:
      - image: gcr.io/your-project-id/stock-trader-ai
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: PORT
          value: "3000"
        resources:
          limits:
            cpu: "1000m"
            memory: "512Mi"
```

---

## AWS ECS

Amazon Elastic Container Service provides managed container orchestration.

### 🚀 Setup Steps

1. **Install AWS CLI**
```bash
# macOS
brew install awscli

# Ubuntu/Debian
sudo apt-get install awscli
```

2. **Configure AWS**
```bash
aws configure
```

3. **Create ECR Repository**
```bash
aws ecr create-repository --repository-name stock-trader-ai
```

4. **Build and Push to ECR**
```bash
# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account-id.dkr.ecr.us-east-1.amazonaws.com

# Build and tag
docker build -t stock-trader-ai .
docker tag stock-trader-ai:latest your-account-id.dkr.ecr.us-east-1.amazonaws.com/stock-trader-ai:latest

# Push
docker push your-account-id.dkr.ecr.us-east-1.amazonaws.com/stock-trader-ai:latest
```

5. **Create ECS Task Definition**

Create `task-definition.json`:
```json
{
  "family": "stock-trader-ai",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::your-account-id:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "stock-trader-ai",
      "image": "your-account-id.dkr.ecr.us-east-1.amazonaws.com/stock-trader-ai:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
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

6. **Deploy to ECS**
```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster your-cluster-name \
  --service-name stock-trader-ai \
  --task-definition stock-trader-ai:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
```

---

## Azure Container Instances

Azure Container Instances provides simple container deployment without orchestration.

### 🔷 Setup Steps

1. **Install Azure CLI**
```bash
# macOS
brew install azure-cli

# Ubuntu/Debian
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

2. **Login to Azure**
```bash
az login
```

3. **Create Resource Group**
```bash
az group create --name stock-trader-rg --location eastus
```

4. **Create Container Registry**
```bash
az acr create --resource-group stock-trader-rg --name stocktraderregistry --sku Basic
```

5. **Build and Push to ACR**
```bash
# Login to registry
az acr login --name stocktraderregistry

# Build and push
az acr build --registry stocktraderregistry --image stock-trader-ai:latest .
```

6. **Deploy Container**
```bash
az container create \
  --resource-group stock-trader-rg \
  --name stock-trader-ai \
  --image stocktraderregistry.azurecr.io/stock-trader-ai:latest \
  --dns-name-label stock-trader-ai \
  --ports 3000 \
  --environment-variables \
    NODE_ENV=production \
    PORT=3000 \
  --secure-environment-variables \
    NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_key \
    NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key \
    NEXTAUTH_SECRET=your_secret_key \
    USER_PASSWORD_HASH=your_password_hash \
  --registry-login-server stocktraderregistry.azurecr.io \
  --registry-username stocktraderregistry \
  --registry-password $(az acr credential show --name stocktraderregistry --query passwords[0].value -o tsv)
```

---

## Kubernetes Deployment

For production-scale deployments with high availability and auto-scaling.

### ⚓ Setup Files

**1. Namespace**
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: stock-trader
```

**2. ConfigMap**
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: stock-trader-config
  namespace: stock-trader
data:
  NODE_ENV: "production"
  PORT: "3000"
  NEXT_TELEMETRY_DISABLED: "1"
```

**3. Secret**
```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: stock-trader-secrets
  namespace: stock-trader
type: Opaque
data:
  NEXT_PUBLIC_FINNHUB_API_KEY: <base64-encoded-key>
  NEXT_PUBLIC_GEMINI_API_KEY: <base64-encoded-key>
  NEXTAUTH_SECRET: <base64-encoded-secret>
  USER_PASSWORD_HASH: <base64-encoded-hash>
```

**4. Deployment**
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stock-trader-ai
  namespace: stock-trader
spec:
  replicas: 3
  selector:
    matchLabels:
      app: stock-trader-ai
  template:
    metadata:
      labels:
        app: stock-trader-ai
    spec:
      containers:
      - name: stock-trader-ai
        image: stock-trader-ai:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: stock-trader-config
        - secretRef:
            name: stock-trader-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/test-env
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/test-env
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

**5. Service**
```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: stock-trader-service
  namespace: stock-trader
spec:
  selector:
    app: stock-trader-ai
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

**6. Ingress**
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: stock-trader-ingress
  namespace: stock-trader
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - stocks.yourdomain.com
    secretName: stock-trader-tls
  rules:
  - host: stocks.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: stock-trader-service
            port:
              number: 80
```

**Deploy to Kubernetes**
```bash
kubectl apply -f k8s/
```

---

## Production Best Practices

### 🔒 Security

1. **Environment Variables**
```bash
# Generate secure secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)
USER_PASSWORD_HASH=$(node scripts/generate-hash.js your_secure_password)
```

2. **Use Secret Management**
- AWS: Systems Manager Parameter Store
- Google Cloud: Secret Manager
- Azure: Key Vault
- Kubernetes: Secrets

3. **Enable HTTPS**
```bash
# Update NEXTAUTH_URL
NEXTAUTH_URL=https://your-domain.com
```

### 📊 Monitoring

1. **Health Checks**
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/test-env"]
  interval: 30s
  timeout: 10s
  retries: 3
```

2. **Logging**
```bash
# View container logs
docker logs stock-trader-ai-app -f

# With docker-compose
docker-compose logs -f
```

### 🚀 Performance

1. **Resource Limits**
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

2. **Auto-scaling**
```yaml
# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: stock-trader-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: stock-trader-ai
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## Monitoring & Maintenance

### 📊 Container Health

```bash
# Check container status
docker ps
docker stats stock-trader-ai-app

# Health check
curl http://localhost:3000/api/test-env

# View logs
docker logs stock-trader-ai-app --tail 50
```

### 🔄 Updates

```bash
# Pull latest image
docker pull stock-trader-ai:latest

# Restart with new image
docker-compose up -d --force-recreate

# Or using rolling update
docker service update --image stock-trader-ai:latest stock-trader-service
```

### 💾 Backup

```bash
# Backup persistent data
docker run --rm -v stock-trader-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/stock-trader-backup-$(date +%Y%m%d).tar.gz -C /data .
```

---

## Troubleshooting

### Common Issues

**1. Container Won't Start**
```bash
# Check logs
docker logs stock-trader-ai-app

# Check environment variables
docker exec stock-trader-ai-app env | grep -E '(API_KEY|SECRET)'

# Verify image
docker inspect stock-trader-ai:latest
```

**2. API Errors**
```bash
# Test API endpoints
curl http://localhost:3000/api/test-env

# Check API keys
docker exec stock-trader-ai-app sh -c 'echo $NEXT_PUBLIC_FINNHUB_API_KEY'
```

**3. Memory Issues**
```bash
# Check memory usage
docker stats stock-trader-ai-app

# Increase memory limit
docker update --memory=1g stock-trader-ai-app
```

**4. Port Conflicts**
```bash
# Check what's using port 3000
sudo lsof -i :3000

# Use different port
docker run -p 3001:3000 stock-trader-ai:latest
```

---

## 🎯 Default Credentials

- **Username**: `YOUR_USERNAME`
- **Password**: `YOUR_PASSWORD`

**⚠️ Security Note**: Change the default password in production!

```bash
# Generate new password hash
node scripts/generate-hash.js your_new_password
```

---

## 📞 Support

For deployment issues:

1. **Check logs**: `docker logs container-name -f`
2. **Verify environment**: Review environment variables
3. **Test APIs**: Use `/api/test-env` endpoint
4. **Resource monitoring**: Check CPU/memory usage
5. **Network connectivity**: Test external API access

---

*Last Updated: 2025-01-16 | Version: 2.0.0*