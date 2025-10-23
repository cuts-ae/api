#!/bin/bash

# Oracle Cloud ARM Deployment Script for cuts.ae API
# Run this script on your Oracle Cloud ARM instance

set -e  # Exit on any error

echo "🚀 Starting deployment of cuts.ae API on Oracle Cloud ARM..."

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 18.x for ARM
echo "📦 Installing Node.js 18 for ARM64..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node installation
echo "✅ Node.js version:"
node --version
npm --version

# Install Git
echo "📦 Installing Git..."
sudo apt-get install -y git

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt-get install -y nginx

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Navigate to home directory
cd ~

# Clone repository (update with your actual repo URL)
echo "📂 Setting up application..."
REPO_DIR="cuts-api"

if [ -d "$REPO_DIR" ]; then
  echo "📂 Repository already exists, pulling latest..."
  cd $REPO_DIR
  git pull
else
  echo "📂 Cloning repository..."
  # TODO: Replace with your actual GitHub repo URL
  git clone https://github.com/YOUR-USERNAME/cuts.ae.git $REPO_DIR
  cd $REPO_DIR/api
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Create .env file
echo "⚙️  Creating environment file..."
cat > .env << 'EOF'
SUPABASE_URL=https://rqrzcxwcgcyzewnkxfgd.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxcnpjeHdjZ2N5emV3bmt4ZmdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTIyNDMsImV4cCI6MjA3NjcyODI0M30.FDW60VKZIV8htPXXWZWXMwgjsaI6zKt-3yGI3B92RsU
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxcnpjeHdjZ2N5emV3bmt4ZmdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE1MjI0MywiZXhwIjoyMDc2NzI4MjQzfQ.5lXw4SgNW3hPF5d_APjLqiZKXM4YSup3KEH6aeQ45Ck
JWT_SECRET=baqir-osaed-ayush-arryan
PORT=45000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
EOF

# Stop existing PM2 process if running
echo "🔄 Stopping existing process..."
pm2 delete cuts-api 2>/dev/null || true

# Start app with PM2
echo "🚀 Starting application with PM2..."
pm2 start dist/index.js --name cuts-api --env production

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Set up PM2 to start on boot
echo "🔧 Configuring PM2 startup..."
pm2 startup systemd -u $USER --hp $HOME
pm2 save

# Configure Nginx
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/cuts-api > /dev/null << 'NGINX_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name api.yourdomain.com;  # Change this to your actual domain

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:45000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINX_EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/cuts-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
echo "🔧 Testing Nginx configuration..."
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Configure firewall (Oracle Cloud uses iptables)
echo "🔥 Configuring firewall..."
# Oracle Cloud VMs come with firewall rules, but let's add iptables rules too
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || true

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Application Status:"
pm2 status
echo ""
echo "💻 System Info:"
echo "   CPU Cores: $(nproc)"
echo "   Total RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo "   Available RAM: $(free -h | awk '/^Mem:/ {print $7}')"
echo "   Architecture: $(uname -m)"
echo ""
echo "🔗 Your API is running at:"
echo "   http://$(curl -s ifconfig.me)"
echo ""
echo "📝 Next steps:"
echo "1. In Oracle Cloud Console:"
echo "   - Go to Networking → Virtual Cloud Networks"
echo "   - Select your VCN → Security Lists"
echo "   - Add Ingress Rules for ports 80 and 443"
echo ""
echo "2. Point your domain (api.yourdomain.com) to: $(curl -s ifconfig.me)"
echo ""
echo "3. Update .env file:"
echo "   - Edit ~/cuts-api/api/.env"
echo "   - Change FRONTEND_URL to your actual domain"
echo ""
echo "4. Update Nginx config:"
echo "   - sudo nano /etc/nginx/sites-available/cuts-api"
echo "   - Change server_name to your actual domain"
echo "   - sudo systemctl restart nginx"
echo ""
echo "5. Install SSL certificate (after DNS is pointed):"
echo "   sudo apt-get install -y certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d api.yourdomain.com"
echo ""
echo "📋 Useful commands:"
echo "   pm2 logs cuts-api        - View application logs"
echo "   pm2 restart cuts-api     - Restart application"
echo "   pm2 stop cuts-api        - Stop application"
echo "   pm2 status               - Check PM2 status"
echo "   sudo systemctl status nginx - Check Nginx status"
echo "   sudo nginx -t            - Test Nginx config"
echo ""
echo "🎉 Your Oracle Cloud server with 24GB RAM is ready to rock!"
echo ""
