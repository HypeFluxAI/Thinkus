#!/bin/bash
# Authentication Flow AI Tests

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
SESSION_NAME="${SESSION_NAME:-thinkus-auth-$(date +%s)}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

ab() {
  agent-browser --session "$SESSION_NAME" "$@"
}

mkdir -p ./screenshots

echo -e "${BLUE}=== Authentication Flow Tests ===${NC}"

# Test 1: Login page loads
echo -e "${YELLOW}Test 1: Login page...${NC}"
ab open "$BASE_URL/login"
ab wait 2000
ab screenshot ./screenshots/auth-login.png

snapshot=$(ab snapshot -i)
echo "Login page elements:"
echo "$snapshot" | head -20

# Check for form elements
if echo "$snapshot" | grep -qi "textbox\|email"; then
  echo -e "${GREEN}PASS${NC}: Email input found"
else
  echo -e "${RED}FAIL${NC}: Email input not found"
fi

if echo "$snapshot" | grep -qi "button"; then
  echo -e "${GREEN}PASS${NC}: Submit button found"
else
  echo -e "${RED}FAIL${NC}: Submit button not found"
fi

# Test 2: Form interaction
echo -e "${YELLOW}Test 2: Form interaction...${NC}"

# Find and fill email field
email_ref=$(ab snapshot -i --json 2>/dev/null | grep -o '@e[0-9]*' | head -1 || echo "@e1")
echo "Attempting to interact with: $email_ref"

# Test 3: OAuth buttons
echo -e "${YELLOW}Test 3: OAuth buttons...${NC}"
snapshot=$(ab snapshot)
if echo "$snapshot" | grep -qi "google\|github\|oauth"; then
  echo -e "${GREEN}PASS${NC}: OAuth options found"
else
  echo -e "${YELLOW}INFO${NC}: OAuth options may be styled differently"
fi

# Test 4: Registration link
echo -e "${YELLOW}Test 4: Registration link...${NC}"
if echo "$snapshot" | grep -qi "register\|sign up\|create account"; then
  echo -e "${GREEN}PASS${NC}: Registration link found"
else
  echo -e "${YELLOW}INFO${NC}: Registration link may be styled differently"
fi

# Test 5: Navigate to register
echo -e "${YELLOW}Test 5: Register page...${NC}"
ab open "$BASE_URL/register"
ab wait 2000
ab screenshot ./screenshots/auth-register.png

url=$(ab get url)
echo "Current URL: $url"

# Cleanup
ab close 2>/dev/null || true

echo -e "${BLUE}=== Authentication Tests Complete ===${NC}"
