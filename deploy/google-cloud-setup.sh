#!/bin/bash

# Google Cloud Compute Engine Deployment Script for cuts.ae API
# Run this script on your Google Cloud VM instance

set -e  # Exit on any error

echo "Starting deployment of cuts.ae API on Google Cloud..."

# Update system
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20.x (latest LTS)
echo "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node installation
echo "Node.js version:"
node --version
npm --version

# Install Git
echo "Installing Git..."
sudo apt-get install -y git

# Install Nginx
echo "Installing Nginx..."
sudo apt-get install -y nginx

# Install PM2 globally
echo "Installing PM2..."
sudo npm install -g pm2

# Navigate to home directory
cd ~

# Clone repository (update with your actual repo URL)
echo "Setting up application..."
REPO_DIR="cuts-api"

if [ -d "$REPO_DIR" ]; then
  echo "Repository already exists, pulling latest..."
  cd $REPO_DIR
  git pull
else
  echo "Cloning repository..."
  # TODO: Replace with your actual GitHub repo URL
  git clone https://github.com/YOUR-USERNAME/cuts.ae.git $REPO_DIR
  cd $REPO_DIR/api
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Create .env file
echo "Creating environment file..."
echo "IMPORTANT: You need to update these values with your actual database credentials"
cat > .env << 'EOF'
# PostgreSQL Database (Google Cloud SQL)
DB_HOST=YOUR_GOOGLE_CLOUD_SQL_IP
DB_PORT=5432
DB_NAME=cuts_ae
DB_USER=postgres
DB_PASSWORD=YOUR_DATABASE_PASSWORD

# JWT Secret
JWT_SECRET=baqir-osaed-ayush-arryan

# Server
PORT=45000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
EOF

echo ""
echo "STOP! You must edit the .env file with your actual database credentials:"
echo "  nano ~/cuts-api/api/.env"
echo ""
echo "Update these values:"
echo "  - DB_HOST (your Google Cloud SQL IP)"
echo "  - DB_PASSWORD (your database password)"
echo ""
read -p "Press Enter after you have updated the .env file..."

# Stop existing PM2 process if running
echo "Stopping existing process..."
pm2 delete cuts-api 2>/dev/null || true

# Start app with PM2
echo "Starting application with PM2..."
pm2 start dist/index.js --name cuts-api --env production

# Save PM2 configuration
echo "Saving PM2 configuration..."
pm2 save

# Set up PM2 to start on boot
echo "Configuring PM2 startup..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
pm2 save

# Configure Nginx
echo "Configuring Nginx..."
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
echo "Testing Nginx configuration..."
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Configure Google Cloud firewall with ufw
echo "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 45000/tcp # API (for debugging)
sudo ufw status

echo ""
echo "Deployment complete!"
echo ""
echo "Application Status:"
pm2 status
echo ""
echo "System Info:"
echo "   CPU Cores: $(nproc)"
echo "   Total RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo "   Available RAM: $(free -h | awk '/^Mem:/ {print $7}')"
echo "   Architecture: $(uname -m)"
echo ""
echo "Your API is running at:"
echo "   External IP: $(curl -s ifconfig.me)"
echo "   API Endpoint: http://$(curl -s ifconfig.me):45000"
echo ""
echo "Next steps:"
echo ""
echo "1. In Google Cloud Console:"
echo "   - Go to VPC Network > Firewall"
echo "   - Firewall rules should already allow HTTP/HTTPS"
echo "   - If not, create rules for tcp:80,443"
echo ""
echo "2. Point your domain (api.yourdomain.com) to: $(curl -s ifconfig.me)"
echo ""
echo "3. Update .env file:"
echo "   - Edit ~/cuts-api/api/.env"
echo "   - Change FRONTEND_URL to your actual domain"
echo "   - pm2 restart cuts-api"
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
echo "Useful commands:"
echo "   pm2 logs cuts-api        - View application logs"
echo "   pm2 restart cuts-api     - Restart application"
echo "   pm2 stop cuts-api        - Stop application"
echo "   pm2 status               - Check PM2 status"
echo "   sudo systemctl status nginx - Check Nginx status"
echo "   sudo nginx -t            - Test Nginx config"
echo "   sudo ufw status          - Check firewall status"
echo ""
echo "Quick deploy command (for future updates):"
echo "   cd ~/cuts-api && git pull && cd api && npm install && npm run build && pm2 restart cuts-api"
echo ""
echo "Your Google Cloud server is ready!"
echo ""
