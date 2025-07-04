#!/bin/bash

# Stock Trader AI - Firewall Configuration Script
# This script configures the firewall to allow access from all IPs

echo "🔥 Configuring firewall for Stock Trader AI..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "⚠️  This script should not be run as root for security reasons"
   echo "Run as regular user with sudo permissions"
   exit 1
fi

# Function to configure ufw (Ubuntu/Debian)
configure_ufw() {
    echo "📋 Configuring UFW (Ubuntu/Debian)..."
    
    # Enable UFW if not already enabled
    sudo ufw --force enable
    
    # Allow SSH (important to not lock yourself out)
    sudo ufw allow 22/tcp
    
    # Allow HTTP and HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Allow our application ports
    sudo ufw allow 3000/tcp comment "Stock Trader AI - Port 3000"
    sudo ufw allow 3001/tcp comment "Stock Trader AI - Port 3001"
    
    # Allow from specific subnets (more secure)
    sudo ufw allow from 192.168.0.0/16 to any port 3000,3001 comment "Local network access"
    sudo ufw allow from 10.0.0.0/8 to any port 3000,3001 comment "Private network access"
    
    # Show status
    sudo ufw status verbose
    
    echo "✅ UFW configuration complete"
}

# Function to configure firewalld (CentOS/RHEL/Fedora)
configure_firewalld() {
    echo "📋 Configuring firewalld (CentOS/RHEL/Fedora)..."
    
    # Start and enable firewalld
    sudo systemctl start firewalld
    sudo systemctl enable firewalld
    
    # Allow SSH
    sudo firewall-cmd --permanent --add-service=ssh
    
    # Allow HTTP and HTTPS
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    
    # Allow our application ports
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --permanent --add-port=3001/tcp
    
    # Reload firewall
    sudo firewall-cmd --reload
    
    # Show status
    sudo firewall-cmd --list-all
    
    echo "✅ firewalld configuration complete"
}

# Function to configure iptables (Generic Linux)
configure_iptables() {
    echo "📋 Configuring iptables (Generic Linux)..."
    
    # Allow established connections
    sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
    
    # Allow loopback
    sudo iptables -A INPUT -i lo -j ACCEPT
    
    # Allow SSH
    sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
    
    # Allow HTTP and HTTPS
    sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
    sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
    
    # Allow our application ports
    sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
    sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
    
    # Save iptables rules (varies by distribution)
    if command -v iptables-save >/dev/null 2>&1; then
        sudo iptables-save > /etc/iptables/rules.v4 2>/dev/null || \
        sudo iptables-save > /etc/iptables.rules 2>/dev/null || \
        echo "⚠️  Please manually save iptables rules for your distribution"
    fi
    
    echo "✅ iptables configuration complete"
}

# Detect the system and configure accordingly
if command -v ufw >/dev/null 2>&1; then
    configure_ufw
elif command -v firewall-cmd >/dev/null 2>&1; then
    configure_firewalld
elif command -v iptables >/dev/null 2>&1; then
    configure_iptables
else
    echo "❌ No supported firewall found. Please configure manually:"
    echo "   - Allow inbound TCP traffic on ports 3000 and 3001"
    echo "   - Allow outbound traffic for API calls to finnhub.io and googleapis.com"
fi

# Additional security recommendations
echo ""
echo "🔒 Additional Security Recommendations:"
echo "1. Configure fail2ban to protect against brute force attacks"
echo "2. Set up SSL/TLS certificates for production domain"
echo "3. Consider using a reverse proxy (nginx) for production"
echo "4. Monitor logs regularly for suspicious activity"
echo "5. Keep system and packages updated"

# Network diagnostics
echo ""
echo "🔍 Network Diagnostics:"
echo "Checking if ports are accessible..."

# Check if ports are listening
netstat -tlnp 2>/dev/null | grep -E ":(3000|3001) " || \
ss -tlnp 2>/dev/null | grep -E ":(3000|3001) " || \
echo "⚠️  Application ports not yet listening - start the app first"

echo ""
echo "🌐 To test external access:"
echo "From another machine, try:"
echo "  curl -I http://$(hostname -I | awk '{print $1}'):3001"
echo "  curl -I http://110.81.15.51:3001"
echo ""
echo "✅ Firewall configuration script completed!"