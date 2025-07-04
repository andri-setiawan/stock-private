#!/bin/bash
# AI Stock Trading Companion - Kubernetes Deployment Script

set -e

echo "🚀 Deploying AI Stock Trading Companion to Kubernetes..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if we're connected to a cluster
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Not connected to a Kubernetes cluster. Please configure kubectl."
    exit 1
fi

# Create namespace
echo "📦 Creating namespace..."
kubectl apply -f k8s/namespace.yaml

# Create configmap
echo "⚙️ Creating configmap..."
kubectl apply -f k8s/configmap.yaml

# Check if secret exists
if ! kubectl get secret stock-trader-secrets -n stock-trader &> /dev/null; then
    echo "❌ Secret 'stock-trader-secrets' not found!"
    echo "Please create the secret from the template:"
    echo "1. Copy k8s/secret.yaml.template to k8s/secret.yaml"
    echo "2. Replace placeholder values with base64-encoded secrets"
    echo "3. Apply with: kubectl apply -f k8s/secret.yaml"
    exit 1
fi

# Deploy application
echo "🚀 Deploying application..."
kubectl apply -f k8s/deployment.yaml

# Create service
echo "🌐 Creating service..."
kubectl apply -f k8s/service.yaml

# Create ingress (optional)
if [ -f "k8s/ingress.yaml" ]; then
    echo "🔗 Creating ingress..."
    kubectl apply -f k8s/ingress.yaml
fi

# Create HPA (optional)
if [ -f "k8s/hpa.yaml" ]; then
    echo "📈 Creating horizontal pod autoscaler..."
    kubectl apply -f k8s/hpa.yaml
fi

echo "✅ Deployment complete!"
echo ""
echo "📊 Checking deployment status..."
kubectl get pods -n stock-trader -l app=stock-trader-ai

echo ""
echo "🔍 Useful commands:"
echo "  kubectl get pods -n stock-trader              # View pods"
echo "  kubectl logs -f deployment/stock-trader-ai -n stock-trader  # View logs"
echo "  kubectl describe deployment stock-trader-ai -n stock-trader # View deployment details"
echo "  kubectl get ingress -n stock-trader           # View ingress"
echo "  kubectl get hpa -n stock-trader               # View autoscaler"

# Wait for deployment to be ready
echo ""
echo "⏳ Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/stock-trader-ai -n stock-trader

echo "✅ Deployment is ready!"

# Show service information
echo ""
echo "🌐 Service Information:"
kubectl get service stock-trader-service -n stock-trader

# Show ingress information if available
if kubectl get ingress stock-trader-ingress -n stock-trader &> /dev/null; then
    echo ""
    echo "🔗 Ingress Information:"
    kubectl get ingress stock-trader-ingress -n stock-trader
fi