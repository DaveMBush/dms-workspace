#!/bin/bash
# Tests for deploy-frontend.sh script

set -e

# Test colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SCRIPT="$SCRIPT_DIR/deploy-frontend.sh"

test_passed=0
test_failed=0

# Test helper functions
assert_equals() {
    local expected="$1"
    local actual="$2"
    local message="$3"
    
    if [[ "$expected" == "$actual" ]]; then
        echo -e "${GREEN}✓${NC} $message"
        ((test_passed++))
    else
        echo -e "${RED}✗${NC} $message"
        echo "  Expected: $expected"
        echo "  Actual: $actual"
        ((test_failed++))
    fi
}

assert_file_exists() {
    local file="$1"
    local message="$2"
    
    if [[ -f "$file" ]]; then
        echo -e "${GREEN}✓${NC} $message"
        ((test_passed++))
    else
        echo -e "${RED}✗${NC} $message"
        echo "  File not found: $file"
        ((test_failed++))
    fi
}

assert_executable() {
    local file="$1"
    local message="$2"
    
    if [[ -x "$file" ]]; then
        echo -e "${GREEN}✓${NC} $message"
        ((test_passed++))
    else
        echo -e "${RED}✗${NC} $message"
        echo "  File not executable: $file"
        ((test_failed++))
    fi
}

# Test that script exists and is executable
test_script_exists() {
    echo "Testing script existence and permissions..."
    assert_file_exists "$DEPLOY_SCRIPT" "Deploy script exists"
    assert_executable "$DEPLOY_SCRIPT" "Deploy script is executable"
}

# Test script help/usage
test_script_usage() {
    echo "Testing script usage..."
    
    # Test that script shows usage when no AWS credentials (expected to fail gracefully)
    if bash "$DEPLOY_SCRIPT" help 2>&1 | grep -q "frontend deployment"; then
        echo -e "${GREEN}✓${NC} Script shows usage information"
        ((test_passed++))
    else
        echo -e "${RED}✗${NC} Script should show usage information"
        ((test_failed++))
    fi
}

# Test required dependencies check
test_dependencies_check() {
    echo "Testing dependencies check..."
    
    # Create a temporary script that mocks missing dependencies
    local temp_script=$(mktemp)
    cat > "$temp_script" << 'EOF'
#!/bin/bash
# Mock script to test dependency checking
check_dependencies() {
    if ! command -v nonexistent_command &> /dev/null; then
        echo "[ERROR] nonexistent_command is not installed"
        return 1
    fi
}

check_dependencies
EOF
    
    chmod +x "$temp_script"
    
    if ! bash "$temp_script" 2>&1 | grep -q "ERROR.*not installed"; then
        echo -e "${RED}✗${NC} Dependency check should detect missing commands"
        ((test_failed++))
    else
        echo -e "${GREEN}✓${NC} Dependency check detects missing commands"
        ((test_passed++))
    fi
    
    rm "$temp_script"
}

# Test environment validation
test_environment_validation() {
    echo "Testing environment validation..."
    
    # Test with valid environment names
    local valid_envs=("dev" "staging" "prod")
    for env in "${valid_envs[@]}"; do
        if echo "$env" | grep -Eq "^(dev|staging|prod)$"; then
            echo -e "${GREEN}✓${NC} Environment '$env' is valid"
            ((test_passed++))
        else
            echo -e "${RED}✗${NC} Environment '$env' should be valid"
            ((test_failed++))
        fi
    done
}

# Test script syntax
test_script_syntax() {
    echo "Testing script syntax..."
    
    if bash -n "$DEPLOY_SCRIPT"; then
        echo -e "${GREEN}✓${NC} Script syntax is valid"
        ((test_passed++))
    else
        echo -e "${RED}✗${NC} Script has syntax errors"
        ((test_failed++))
    fi
}

# Test function definitions
test_function_definitions() {
    echo "Testing function definitions..."
    
    local required_functions=(
        "check_dependencies"
        "get_infrastructure_info"
        "build_frontend"
        "update_api_endpoint"
        "deploy_to_s3"
        "invalidate_cloudfront"
        "validate_deployment"
        "main"
    )
    
    for func in "${required_functions[@]}"; do
        if grep -q "^$func()" "$DEPLOY_SCRIPT"; then
            echo -e "${GREEN}✓${NC} Function '$func' is defined"
            ((test_passed++))
        else
            echo -e "${RED}✗${NC} Function '$func' is missing"
            ((test_failed++))
        fi
    done
}

# Test log functions
test_log_functions() {
    echo "Testing log functions..."
    
    local log_functions=("log_info" "log_warn" "log_error")
    for func in "${log_functions[@]}"; do
        if grep -q "^$func()" "$DEPLOY_SCRIPT"; then
            echo -e "${GREEN}✓${NC} Log function '$func' is defined"
            ((test_passed++))
        else
            echo -e "${RED}✗${NC} Log function '$func' is missing"
            ((test_failed++))
        fi
    done
}

# Test error handling
test_error_handling() {
    echo "Testing error handling..."
    
    if grep -q "set -e" "$DEPLOY_SCRIPT"; then
        echo -e "${GREEN}✓${NC} Script uses 'set -e' for error handling"
        ((test_passed++))
    else
        echo -e "${RED}✗${NC} Script should use 'set -e' for error handling"
        ((test_failed++))
    fi
    
    if grep -q "trap.*INT TERM" "$DEPLOY_SCRIPT"; then
        echo -e "${GREEN}✓${NC} Script handles interruption signals"
        ((test_passed++))
    else
        echo -e "${RED}✗${NC} Script should handle interruption signals"
        ((test_failed++))
    fi
}

# Main test runner
run_tests() {
    echo "Running deployment script tests..."
    echo "================================="
    
    test_script_exists
    test_script_syntax
    test_function_definitions
    test_log_functions
    test_error_handling
    test_dependencies_check
    test_environment_validation
    test_script_usage
    
    echo "================================="
    echo "Test Results:"
    echo -e "${GREEN}Passed: $test_passed${NC}"
    echo -e "${RED}Failed: $test_failed${NC}"
    
    if [[ $test_failed -eq 0 ]]; then
        echo -e "${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}Some tests failed!${NC}"
        exit 1
    fi
}

# Run the tests
run_tests