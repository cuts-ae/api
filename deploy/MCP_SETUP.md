# AWS MCP Setup for Claude Code

This will let Claude deploy and manage your AWS infrastructure directly from chat.

## Step 1: Install AWS MCP Server

```bash
# Install the community AWS MCP server
npx -y @modelcontextprotocol/create-server aws

# Or clone the repo
git clone https://github.com/Flux159/mcp-server-aws.git
cd mcp-server-aws
npm install
npm run build
```

## Step 2: Configure AWS Credentials

```bash
# Install AWS CLI if you haven't
brew install awscli  # macOS
# or
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: us-east-1 (or your preferred region)
# - Default output: json
```

## Step 3: Add MCP to Claude Code Config

Add this to your Claude Code MCP settings:

**Location:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "aws": {
      "command": "node",
      "args": ["/path/to/mcp-server-aws/build/index.js"],
      "env": {
        "AWS_PROFILE": "default",
        "AWS_REGION": "us-east-1"
      }
    }
  }
}
```

## Step 4: Restart Claude Code

Close and reopen Claude Code for MCP to load.

## Step 5: Test It

In this chat, I should now be able to:
- List your EC2 instances
- Launch new instances
- Deploy your app
- Check logs
- Manage resources

## What You Need from AWS Console:

1. **Create IAM User** (if you don't have one):
   - Go to AWS Console → IAM → Users → Create User
   - Name: `claude-deploy`
   - Enable: Programmatic access
   - Attach policies: `AmazonEC2FullAccess`, `AmazonS3FullAccess`
   - Save the Access Key ID and Secret Access Key

2. **Use those credentials** in `aws configure`

## Alternative: Simpler MCP Setup

If the above doesn't work, we can use the simpler approach:

```bash
# Install official MCP CLI
npm install -g @modelcontextprotocol/cli

# Create AWS MCP config
cat > ~/aws-mcp-config.json << 'EOF'
{
  "aws": {
    "region": "us-east-1",
    "credentials": {
      "accessKeyId": "YOUR_ACCESS_KEY",
      "secretAccessKey": "YOUR_SECRET_KEY"
    }
  }
}
EOF
```

## Security Notes:

⚠️ **IMPORTANT:**
- Keep your AWS credentials safe
- Use IAM user with limited permissions (not root)
- Consider using temporary credentials (STS)
- Don't commit credentials to Git

## After Setup:

Once MCP is configured, you can just tell me:
- "Deploy the API to AWS EC2"
- "Check server logs"
- "Restart the API"
- "Scale up to 2 instances"

And I'll do it through the MCP.

---

**Ready? Let me know when you've:**
1. ✅ Installed AWS CLI
2. ✅ Configured credentials (`aws configure`)
3. ✅ Added MCP to Claude config
4. ✅ Restarted Claude Code

Then I can start deploying directly from this chat!
