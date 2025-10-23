#!/bin/bash

# AWS EC2 Deployment Script for cuts.ae API
# Run this script on your EC2 instance after SSH

set -e  # Exit on any error

echo "🚀 Starting deployment of cuts.ae API..."

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
echo "📦 Installing Git..."
sudo apt-get install -y git

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt-get install -y nginx

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Clone repository (update with your actual repo URL)
echo "📂 Cloning repository..."
cd /home/ubuntu
if [ -d "api" ]; then
  echo "📂 Repository already exists, pulling latest..."
  cd api
  git pull
else
  git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git api
  cd api
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Create .env file
echo "⚙️  Creating environment file..."
cat > .env << EOF
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
pm2 delete api 2>/dev/null || true

# Start app with PM2
echo "🚀 Starting application with PM2..."
pm2 start dist/index.js --name api --env production

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Set up PM2 to start on boot
echo "🔧 Configuring PM2 startup..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 save

# Configure Nginx
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/api > /dev/null << 'EOF'
server {
    listen 80;
    server_name api.yourdomain.com;  # Change this to your domain

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
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
echo "🔧 Testing Nginx configuration..."
sudo nginx -t
sudo systemctl restart nginx

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Status:"
pm2 status
echo ""
echo "📝 Next steps:"
echo "1. Point your domain (api.yourdomain.com) to this server's IP"
echo "2. Update FRONTEND_URL in /home/ubuntu/api/.env"
echo "3. Update server_name in /etc/nginx/sites-available/api"
echo "4. Run: sudo certbot --nginx -d api.yourdomain.com (for SSL)"
echo ""
echo "🔗 Your API is running at:"
echo "   http://$(curl -s ifconfig.me):80"
echo ""
echo "📋 Useful commands:"
echo "   pm2 logs api          - View logs"
echo "   pm2 restart api       - Restart app"
echo "   pm2 status            - Check status"
echo "   sudo nginx -t         - Test nginx config"
echo "   sudo systemctl status nginx - Check nginx status"
echo ""
