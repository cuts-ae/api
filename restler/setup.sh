#!/bin/bash

# RESTler Setup Script for macOS
# This script installs RESTler and its dependencies for the Cuts.ae API

set -e

echo "=========================================="
echo "RESTler Setup for Cuts.ae API"
echo "=========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "[INFO] $1"
}

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "This script is designed for macOS. For other platforms, please refer to RESTler documentation."
    exit 1
fi

print_info "Checking prerequisites..."

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    print_error "Homebrew is not installed. Please install Homebrew first:"
    echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi
print_success "Homebrew found"

# Check for .NET SDK
if ! command -v dotnet &> /dev/null; then
    print_warning ".NET SDK not found. Installing..."
    brew install --cask dotnet-sdk

    # Verify installation
    if ! command -v dotnet &> /dev/null; then
        print_error "Failed to install .NET SDK. Please install manually:"
        echo "  brew install --cask dotnet-sdk"
        exit 1
    fi
    print_success ".NET SDK installed"
else
    DOTNET_VERSION=$(dotnet --version)
    print_success ".NET SDK found (version $DOTNET_VERSION)"
fi

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    print_warning "Python 3 not found. Installing..."
    brew install python3

    if ! command -v python3 &> /dev/null; then
        print_error "Failed to install Python 3. Please install manually:"
        echo "  brew install python3"
        exit 1
    fi
    print_success "Python 3 installed"
else
    PYTHON_VERSION=$(python3 --version)
    print_success "Python 3 found ($PYTHON_VERSION)"
fi

# Install Python dependencies
print_info "Installing Python dependencies..."
python3 -m pip install --upgrade pip
python3 -m pip install requests pyyaml

# Create RESTler directory structure
print_info "Setting up directory structure..."
mkdir -p Compile
mkdir -p Test
mkdir -p FuzzLean
mkdir -p Logs
print_success "Directory structure created"

# Download and install RESTler
RESTLER_VERSION="9.2.3"
RESTLER_DIR="$HOME/.restler"
RESTLER_BIN="$RESTLER_DIR/restler_bin"

print_info "Checking for existing RESTler installation..."

if [ -d "$RESTLER_BIN" ]; then
    print_warning "RESTler appears to be already installed at $RESTLER_BIN"
    read -p "Do you want to reinstall? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Using existing RESTler installation"
    else
        print_info "Removing existing installation..."
        rm -rf "$RESTLER_DIR"
    fi
fi

if [ ! -d "$RESTLER_BIN" ]; then
    print_info "Downloading RESTler v$RESTLER_VERSION..."

    mkdir -p "$RESTLER_DIR"
    cd "$RESTLER_DIR"

    # Download RESTler release
    RESTLER_URL="https://github.com/microsoft/restler-fuzzer/releases/download/v${RESTLER_VERSION}/restler_bin_osx.zip"

    if curl -L -o restler.zip "$RESTLER_URL"; then
        print_success "RESTler downloaded"

        print_info "Extracting RESTler..."
        unzip -q restler.zip
        rm restler.zip

        # Make RESTler executable
        chmod +x "$RESTLER_BIN/restler/Restler"

        print_success "RESTler installed to $RESTLER_BIN"
    else
        print_error "Failed to download RESTler. Please check your internet connection and try again."
        print_info "You can also download manually from: $RESTLER_URL"
        exit 1
    fi
fi

# Create symbolic link to RESTler binary
if [ ! -L "/usr/local/bin/restler" ]; then
    print_info "Creating symbolic link to RESTler..."
    sudo ln -sf "$RESTLER_BIN/restler/Restler" /usr/local/bin/restler
    print_success "Symbolic link created at /usr/local/bin/restler"
fi

# Create authentication token script
print_info "Creating authentication token helper script..."
cat > get_token.py << 'EOF'
#!/usr/bin/env python3
"""
Authentication token generator for RESTler
This script obtains a JWT token from the Cuts.ae API for authenticated requests
"""

import json
import sys
import os
import requests

API_URL = os.getenv('API_URL', 'http://localhost:45000/api/v1')
TEST_EMAIL = os.getenv('RESTLER_TEST_EMAIL', 'test@cuts.ae')
TEST_PASSWORD = os.getenv('RESTLER_TEST_PASSWORD', 'TestPassword123!')

def get_auth_token():
    """Obtain JWT token from the API"""
    try:
        # First, try to register the test user (may fail if already exists)
        register_payload = {
            'email': TEST_EMAIL,
            'password': TEST_PASSWORD,
            'first_name': 'RESTler',
            'last_name': 'Test',
            'role': 'customer'
        }

        requests.post(
            f'{API_URL}/auth/register',
            json=register_payload,
            headers={'Content-Type': 'application/json'}
        )
        # Ignore the result as user might already exist

    except Exception:
        pass  # User might already exist

    # Now login to get the token
    try:
        login_payload = {
            'email': TEST_EMAIL,
            'password': TEST_PASSWORD
        }

        response = requests.post(
            f'{API_URL}/auth/login',
            json=login_payload,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            token = data.get('token')
            if token:
                # RESTler expects the token in a specific format
                print(f'Bearer {token}')
                return 0
            else:
                print('Error: No token in response', file=sys.stderr)
                return 1
        else:
            print(f'Error: Login failed with status {response.status_code}', file=sys.stderr)
            print(response.text, file=sys.stderr)
            return 1

    except Exception as e:
        print(f'Error: Failed to get authentication token: {str(e)}', file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(get_auth_token())
EOF

chmod +x get_token.py
print_success "Token helper script created"

# Create environment file template
print_info "Creating environment configuration template..."
cat > .env.restler << 'EOF'
# RESTler Environment Configuration
# Copy this file to .env.restler.local and customize for your environment

# API Configuration
API_URL=http://localhost:45000/api/v1

# Test User Credentials (used for authenticated requests)
RESTLER_TEST_EMAIL=test@cuts.ae
RESTLER_TEST_PASSWORD=TestPassword123!

# RESTler Execution Settings
RESTLER_TIME_BUDGET=3600
RESTLER_MAX_SEQUENCE_LENGTH=100
RESTLER_TARGET_PORT=45000
EOF

print_success "Environment template created"

# Verify installation
print_info "Verifying RESTler installation..."
if command -v restler &> /dev/null; then
    print_success "RESTler is ready to use!"
    echo ""
    echo "RESTler version:"
    restler --version 2>&1 | head -n 1 || echo "  Unable to display version"
else
    print_error "RESTler installation verification failed"
    exit 1
fi

echo ""
echo "=========================================="
print_success "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Ensure your API server is running: npm run dev"
echo "  2. Configure test credentials in .env.restler.local (optional)"
echo "  3. Run the fuzzing script: ./run-restler.sh"
echo ""
echo "For more information, see README.md"
echo ""
