#!/bin/bash

# Stock Trader AI - Network Access Testing Script
echo "🧪 Testing Network Access for Stock Trader AI"
echo "============================================="

PORT=3001
TIMEOUT=5

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test URL accessibility
test_url() {
    local url=$1
    local description=$2
    
    echo -n "Testing ${description}: "
    
    if curl -s --max-time $TIMEOUT -I "$url" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Accessible${NC}"
        return 0
    else
        echo -e "${RED}❌ Not accessible${NC}"
        return 1
    fi
}

# Function to test CORS headers
test_cors() {
    local url=$1
    local origin=$2
    
    echo -n "Testing CORS from ${origin}: "
    
    response=$(curl -s --max-time $TIMEOUT -H "Origin: ${origin}" -I "$url" 2>/dev/null)
    
    if echo "$response" | grep -q "Access-Control-Allow-Origin"; then
        echo -e "${GREEN}✅ CORS enabled${NC}"
        return 0
    else
        echo -e "${RED}❌ CORS issue${NC}"
        return 1
    fi
}

echo -e "${BLUE}📍 Testing Local Access${NC}"
echo "------------------------"
test_url "http://localhost:$PORT" "Localhost"
test_url "http://127.0.0.1:$PORT" "127.0.0.1"

echo ""
echo -e "${BLUE}📍 Testing Network Access${NC}"
echo "-------------------------"
test_url "http://192.168.110.83:$PORT" "Local Network IP"
test_url "http://110.81.15.51:$PORT" "Public IP"

echo ""
echo -e "${BLUE}📍 Testing Domain Access${NC}"
echo "------------------------"
test_url "http://stocks.andrisetiawan.com" "HTTP Domain"
test_url "https://stocks.andrisetiawan.com" "HTTPS Domain"

echo ""
echo -e "${BLUE}🔀 Testing CORS Headers${NC}"
echo "-----------------------"
test_cors "http://localhost:$PORT" "http://localhost:3000"
test_cors "http://localhost:$PORT" "http://192.168.110.83:3000"
test_cors "http://localhost:$PORT" "https://stocks.andrisetiawan.com"

echo ""
echo -e "${BLUE}🔍 Server Status Check${NC}"
echo "--------------------"

# Check if server is running
if pgrep -f "node server.js" >/dev/null; then
    echo -e "${GREEN}✅ Server process running${NC}"
else
    echo -e "${RED}❌ Server process not found${NC}"
fi

# Check if port is listening
if netstat -tlnp 2>/dev/null | grep -q ":$PORT " || ss -tlnp 2>/dev/null | grep -q ":$PORT "; then
    echo -e "${GREEN}✅ Port $PORT is listening${NC}"
else
    echo -e "${RED}❌ Port $PORT not listening${NC}"
fi

echo ""
echo -e "${BLUE}🌐 Network Information${NC}"
echo "---------------------"
echo "Server IP addresses:"
hostname -I 2>/dev/null | tr ' ' '\n' | grep -v '^$' | while read ip; do
    echo "  - http://$ip:$PORT"
done

echo ""
echo -e "${BLUE}🔧 Firewall Status${NC}"
echo "-----------------"

# Check UFW status
if command -v ufw >/dev/null 2>&1; then
    if sudo ufw status 2>/dev/null | grep -q "Status: active"; then
        echo -e "${GREEN}✅ UFW is active${NC}"
        if sudo ufw status 2>/dev/null | grep -q "$PORT"; then
            echo -e "${GREEN}✅ Port $PORT allowed in UFW${NC}"
        else
            echo -e "${YELLOW}⚠️  Port $PORT not explicitly allowed in UFW${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  UFW is inactive${NC}"
    fi
fi

# Check firewalld status
if command -v firewall-cmd >/dev/null 2>&1; then
    if sudo firewall-cmd --state 2>/dev/null | grep -q "running"; then
        echo -e "${GREEN}✅ firewalld is running${NC}"
        if sudo firewall-cmd --list-ports 2>/dev/null | grep -q "$PORT"; then
            echo -e "${GREEN}✅ Port $PORT allowed in firewalld${NC}"
        else
            echo -e "${YELLOW}⚠️  Port $PORT not explicitly allowed in firewalld${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  firewalld is not running${NC}"
    fi
fi

echo ""
echo -e "${BLUE}📱 Mobile Testing URLs${NC}"
echo "--------------------"
echo "Test these URLs on mobile devices:"
echo "  📱 http://192.168.110.83:$PORT"
echo "  📱 http://110.81.15.51:$PORT"
echo "  📱 https://stocks.andrisetiawan.com"

echo ""
echo -e "${BLUE}🚀 Quick Start Commands${NC}"
echo "----------------------"
echo "To start the server:"
echo "  npm run dev                    # Development mode"
echo "  PORT=$PORT npm run dev         # Custom port"
echo "  NODE_ENV=production npm start  # Production mode"

echo ""
echo -e "${BLUE}🆘 Troubleshooting${NC}"
echo "---------------"
echo "If tests fail:"
echo "1. Run: ./scripts/configure-firewall.sh"
echo "2. Check server logs for errors"
echo "3. Verify DNS settings for domain access"
echo "4. Test step by step: localhost → local IP → public IP → domain"

echo ""
echo "✅ Network access testing completed!"