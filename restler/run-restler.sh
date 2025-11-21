#!/bin/bash

# RESTler Run Script for Cuts.ae API
# This script compiles the OpenAPI spec and runs RESTler fuzzing tests

set -e

echo "=========================================="
echo "RESTler Fuzzing for Cuts.ae API"
echo "=========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Load environment variables
if [ -f .env.restler.local ]; then
    print_info "Loading custom environment from .env.restler.local"
    export $(cat .env.restler.local | grep -v '^#' | xargs)
elif [ -f .env.restler ]; then
    print_info "Loading default environment from .env.restler"
    export $(cat .env.restler | grep -v '^#' | xargs)
fi

# Set defaults if not provided
API_URL=${API_URL:-"http://localhost:45000/api/v1"}
RESTLER_TARGET_PORT=${RESTLER_TARGET_PORT:-45000}
RESTLER_TIME_BUDGET=${RESTLER_TIME_BUDGET:-3600}
RESTLER_MAX_SEQUENCE_LENGTH=${RESTLER_MAX_SEQUENCE_LENGTH:-100}

# Check if RESTler is installed
if ! command -v restler &> /dev/null; then
    print_error "RESTler is not installed. Please run ./setup.sh first."
    exit 1
fi

# Check if API is running
print_info "Checking if API server is running..."
if ! curl -s -f "http://localhost:${RESTLER_TARGET_PORT}/health" > /dev/null 2>&1; then
    print_error "API server is not responding at http://localhost:${RESTLER_TARGET_PORT}"
    echo ""
    echo "Please start the API server first:"
    echo "  cd .."
    echo "  npm run dev"
    echo ""
    exit 1
fi
print_success "API server is running"

# Parse command line arguments
CLEAN=false
COMPILE_ONLY=false
TEST_ONLY=false
FUZZ_MODE="directed-smoke-test"
SKIP_COMPILE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN=true
            shift
            ;;
        --compile-only)
            COMPILE_ONLY=true
            shift
            ;;
        --test-only)
            TEST_ONLY=true
            SKIP_COMPILE=true
            shift
            ;;
        --mode)
            FUZZ_MODE="$2"
            shift 2
            ;;
        --skip-compile)
            SKIP_COMPILE=true
            shift
            ;;
        --help)
            echo "Usage: ./run-restler.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --clean              Clean previous results before running"
            echo "  --compile-only       Only compile the OpenAPI spec, don't fuzz"
            echo "  --test-only          Skip compilation and run test with existing grammar"
            echo "  --skip-compile       Skip compilation step (use existing grammar)"
            echo "  --mode MODE          Set fuzzing mode (default: directed-smoke-test)"
            echo "                       Options: directed-smoke-test, bfs, bfs-cheap, random-walk"
            echo "  --help               Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./run-restler.sh                           # Full run with defaults"
            echo "  ./run-restler.sh --clean                   # Clean and run"
            echo "  ./run-restler.sh --compile-only            # Just compile"
            echo "  ./run-restler.sh --mode bfs                # Run with BFS mode"
            echo "  ./run-restler.sh --skip-compile --mode bfs # Skip compile, run BFS"
            echo ""
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Clean previous results if requested
if [ "$CLEAN" = true ]; then
    print_info "Cleaning previous results..."
    rm -rf Compile Test FuzzLean Logs
    mkdir -p Compile Test FuzzLean Logs
    print_success "Cleaned"
fi

# Ensure directories exist
mkdir -p Compile Test FuzzLean Logs

# Compile step
if [ "$SKIP_COMPILE" = false ]; then
    print_info "Compiling OpenAPI specification..."
    echo ""

    COMPILE_START=$(date +%s)

    restler compile --api_spec openapi.yaml --config config.json

    COMPILE_END=$(date +%s)
    COMPILE_TIME=$((COMPILE_END - COMPILE_START))

    if [ $? -eq 0 ]; then
        print_success "Compilation completed in ${COMPILE_TIME}s"

        # Check if grammar was generated
        if [ -f "Compile/grammar.py" ]; then
            GRAMMAR_SIZE=$(wc -l < Compile/grammar.py)
            print_info "Grammar file generated: ${GRAMMAR_SIZE} lines"
        fi
    else
        print_error "Compilation failed"
        exit 1
    fi
else
    print_info "Skipping compilation step (using existing grammar)"

    if [ ! -f "Compile/grammar.py" ]; then
        print_error "No compiled grammar found. Remove --skip-compile or run --compile-only first."
        exit 1
    fi
fi

# Exit if compile-only
if [ "$COMPILE_ONLY" = true ]; then
    echo ""
    print_success "Compilation complete. Grammar available in ./Compile/"
    echo ""
    echo "To run fuzzing, execute:"
    echo "  ./run-restler.sh --skip-compile --mode ${FUZZ_MODE}"
    echo ""
    exit 0
fi

# Test step
print_info "Running Test mode to validate API..."
echo ""

TEST_START=$(date +%s)

restler test \
    --grammar_file Compile/grammar.py \
    --dictionary_file Compile/dict.json \
    --settings Compile/engine_settings.json \
    --no_ssl \
    --target_port "${RESTLER_TARGET_PORT}" \
    --host localhost

TEST_END=$(date +%s)
TEST_TIME=$((TEST_END - TEST_START))

if [ $? -eq 0 ]; then
    print_success "Test mode completed in ${TEST_TIME}s"
else
    print_warning "Test mode encountered issues"
fi

# Exit if test-only
if [ "$TEST_ONLY" = true ]; then
    echo ""
    print_success "Test complete. Results available in ./Test/"
    echo ""
    exit 0
fi

# Fuzzing step
print_info "Running ${FUZZ_MODE} fuzzing..."
echo ""
echo "This will run for up to ${RESTLER_TIME_BUDGET} seconds ($(( RESTLER_TIME_BUDGET / 60 )) minutes)"
echo "Press Ctrl+C to stop early"
echo ""

FUZZ_START=$(date +%s)

restler fuzz-lean \
    --grammar_file Compile/grammar.py \
    --dictionary_file Compile/dict.json \
    --settings Compile/engine_settings.json \
    --no_ssl \
    --target_port "${RESTLER_TARGET_PORT}" \
    --host localhost \
    --time_budget "${RESTLER_TIME_BUDGET}" \
    --fuzzing_mode "${FUZZ_MODE}"

FUZZ_END=$(date +%s)
FUZZ_TIME=$((FUZZ_END - FUZZ_START))

if [ $? -eq 0 ]; then
    print_success "Fuzzing completed in ${FUZZ_TIME}s ($(( FUZZ_TIME / 60 )) minutes)"
else
    print_warning "Fuzzing stopped with errors"
fi

# Generate summary report
echo ""
echo "=========================================="
echo "Fuzzing Summary"
echo "=========================================="
echo ""

# Find the latest experiment directory
LATEST_EXPERIMENT=$(ls -td FuzzLean/RestlerResults/experiment*/ 2>/dev/null | head -1)

if [ -n "$LATEST_EXPERIMENT" ]; then
    print_info "Results directory: ${LATEST_EXPERIMENT}"

    # Look for bug buckets
    if [ -d "${LATEST_EXPERIMENT}bug_buckets" ]; then
        BUG_COUNT=$(find "${LATEST_EXPERIMENT}bug_buckets" -name "*.txt" 2>/dev/null | wc -l)
        if [ $BUG_COUNT -gt 0 ]; then
            print_warning "Found ${BUG_COUNT} bug bucket(s)!"
            echo ""
            echo "Bug buckets found in: ${LATEST_EXPERIMENT}bug_buckets/"
            ls -lh "${LATEST_EXPERIMENT}bug_buckets/"
        else
            print_success "No bugs found!"
        fi
    fi

    # Look for logs
    if [ -f "${LATEST_EXPERIMENT}logs/main.txt" ]; then
        TOTAL_REQUESTS=$(grep -c "Sending:" "${LATEST_EXPERIMENT}logs/main.txt" 2>/dev/null || echo "0")
        print_info "Total requests sent: ${TOTAL_REQUESTS}"
    fi

    # Look for network logs
    if [ -f "${LATEST_EXPERIMENT}logs/network.testing.*.txt" ]; then
        RESPONSE_500=$(grep -c "500" "${LATEST_EXPERIMENT}logs/network.testing."*.txt 2>/dev/null || echo "0")
        RESPONSE_400=$(grep -c "400" "${LATEST_EXPERIMENT}logs/network.testing."*.txt 2>/dev/null || echo "0")
        RESPONSE_401=$(grep -c "401" "${LATEST_EXPERIMENT}logs/network.testing."*.txt 2>/dev/null || echo "0")
        RESPONSE_403=$(grep -c "403" "${LATEST_EXPERIMENT}logs/network.testing."*.txt 2>/dev/null || echo "0")
        RESPONSE_404=$(grep -c "404" "${LATEST_EXPERIMENT}logs/network.testing."*.txt 2>/dev/null || echo "0")

        echo ""
        echo "Response Status Summary:"
        echo "  500 Internal Server Error: ${RESPONSE_500}"
        echo "  400 Bad Request: ${RESPONSE_400}"
        echo "  401 Unauthorized: ${RESPONSE_401}"
        echo "  403 Forbidden: ${RESPONSE_403}"
        echo "  404 Not Found: ${RESPONSE_404}"
    fi

    # Coverage information
    if [ -f "${LATEST_EXPERIMENT}logs/specdiff.json" ]; then
        print_info "Spec diff report available: ${LATEST_EXPERIMENT}logs/specdiff.json"
    fi

    echo ""
    echo "To analyze results in detail:"
    echo "  cd ${LATEST_EXPERIMENT}"
    echo "  cat logs/main.txt"
    echo "  cat logs/specdiff.json"
    echo ""

    if [ $BUG_COUNT -gt 0 ]; then
        echo "To investigate bugs:"
        echo "  cd ${LATEST_EXPERIMENT}bug_buckets/"
        echo "  cat *.txt"
        echo ""
    fi
else
    print_warning "Could not find experiment results directory"
fi

echo "=========================================="
print_success "RESTler fuzzing complete!"
echo "=========================================="
echo ""
echo "Execution time summary:"
if [ "$SKIP_COMPILE" = false ]; then
    echo "  Compilation: ${COMPILE_TIME}s"
fi
echo "  Testing:     ${TEST_TIME}s"
echo "  Fuzzing:     ${FUZZ_TIME}s ($(( FUZZ_TIME / 60 ))m)"
echo ""
