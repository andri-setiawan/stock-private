# 🌐 Network Access & Firewall Configuration Guide

## Overview
This guide ensures your Stock Trader AI application is accessible from all required IP addresses and domains without firewall blocking issues.

## 🚀 Quick Start

### 1. Configure Firewall
```bash
# Run the firewall configuration script
./scripts/configure-firewall.sh

# Or manually configure your firewall to allow:
# - TCP Port 3000 (inbound from anywhere)
# - TCP Port 3001 (inbound from anywhere)
# - Outbound HTTPS (443) to finnhub.io and googleapis.com
```

### 2. Start the Application
```bash
# Development mode (permissive CORS)
NODE_ENV=development npm run dev

# Production mode (secure CORS)
NODE_ENV=production npm run start
```

### 3. Verify Access
The application will be accessible from:
- **Localhost**: http://localhost:3001
- **Local Network**: http://192.168.110.83:3001
- **Public IP**: http://110.81.15.51:3001
- **Domain**: https://stocks.YOUR_USERNAME.com

## 🔧 Server Configuration

### CORS Policy
The server is configured with comprehensive CORS headers to allow access from:

**Allowed Origins (Development):**
- All localhost variations (localhost, 127.0.0.1)
- All private network ranges (192.168.x.x, 10.x.x.x)
- Specific IP: 110.81.15.51
- Domain: stocks.YOUR_USERNAME.com

**Allowed Origins (Production):**
- Specific whitelist of trusted origins
- Domain with HTTPS enforcement

### Network Binding
- Server binds to `0.0.0.0` (all network interfaces)
- Accessible from any IP address on the network
- No host header restrictions in development

## 🔐 Firewall Configuration

### Ubuntu/Debian (UFW)
```bash
sudo ufw enable
sudo ufw allow 22/tcp        # SSH
sudo ufw allow 80/tcp        # HTTP
sudo ufw allow 443/tcp       # HTTPS
sudo ufw allow 3000/tcp      # App port 1
sudo ufw allow 3001/tcp      # App port 2
```

### CentOS/RHEL/Fedora (firewalld)
```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### Generic Linux (iptables)
```bash
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

## 🌍 DNS Configuration

### Domain Setup (stocks.YOUR_USERNAME.com)
1. **A Record**: Point to public IP `110.81.15.51`
2. **AAAA Record**: (If IPv6 available)
3. **TTL**: Set to 300 seconds for testing, 3600 for production

### Example DNS Records
```
Type  Name                    Value           TTL
A     stocks.YOUR_USERNAME.com  110.81.15.51   3600
A     *.stocks.YOUR_USERNAME.com 110.81.15.51   3600
```

## 🔍 Testing Network Access

### Local Testing
```bash
# Test localhost
curl -I http://localhost:3001

# Test local network
curl -I http://192.168.110.83:3001

# Test with different ports
curl -I http://127.0.0.1:3000
curl -I http://127.0.0.1:3001
```

### Remote Testing
```bash
# Test public IP
curl -I http://110.81.15.51:3001

# Test domain
curl -I http://stocks.YOUR_USERNAME.com
curl -I https://stocks.YOUR_USERNAME.com
```

### Browser Testing
Open these URLs in different browsers and devices:
- http://localhost:3001
- http://192.168.110.83:3001
- http://110.81.15.51:3001
- https://stocks.YOUR_USERNAME.com

## 🛡️ Security Considerations

### Development Mode (Permissive)
- Allows access from any local network IP
- CORS wildcard for development convenience
- Detailed logging for debugging

### Production Mode (Secure)
- Specific origin whitelist
- HTTPS enforcement
- Security headers enabled
- Rate limiting recommended

### Recommended Security Headers
```javascript
// Production security headers
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('Strict-Transport-Security', 'max-age=31536000');
res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port
lsof -ti:3001
# Kill process
kill -9 $(lsof -ti:3001)
```

#### 2. Firewall Blocking
```bash
# Check firewall status
sudo ufw status
sudo firewall-cmd --list-all
sudo iptables -L
```

#### 3. CORS Errors
- Check browser console for specific CORS errors
- Verify Origin header in network tab
- Ensure server is sending correct CORS headers

#### 4. DNS Issues
```bash
# Test DNS resolution
nslookup stocks.YOUR_USERNAME.com
dig stocks.YOUR_USERNAME.com

# Check hosts file
cat /etc/hosts
```

### Debug Commands
```bash
# Check if application is listening
netstat -tlnp | grep :3001
ss -tlnp | grep :3001

# Test connectivity
telnet localhost 3001
nc -zv localhost 3001

# Check server logs
journalctl -u stock-trader-ai -f
```

## 📋 Deployment Checklist

### Pre-deployment
- [ ] Configure firewall rules
- [ ] Set up DNS records
- [ ] Configure SSL certificates (production)
- [ ] Test from different networks

### Post-deployment
- [ ] Verify access from all intended IPs
- [ ] Test CORS functionality
- [ ] Monitor application logs
- [ ] Set up monitoring/alerting

### Production Ready
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] Monitoring setup
- [ ] Backup strategy in place

## 🆘 Support

If you encounter network access issues:

1. **Check server logs** for detailed error messages
2. **Run the firewall script** to ensure proper configuration
3. **Test step by step** from localhost → local network → public IP → domain
4. **Use browser dev tools** to inspect network requests and CORS headers
5. **Verify DNS resolution** for domain access

## 📞 Emergency Access

If locked out due to firewall issues:
```bash
# Reset UFW (Ubuntu/Debian)
sudo ufw --force reset

# Reset firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --remove-all
sudo firewall-cmd --reload

# Flush iptables (Generic Linux)
sudo iptables -F
sudo iptables -X
```

---

**⚠️ Important**: Always test firewall changes from a local session before applying to remote servers to avoid locking yourself out!