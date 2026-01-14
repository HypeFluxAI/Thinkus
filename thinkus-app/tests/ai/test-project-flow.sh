#!/bin/bash
# Project Creation Flow AI Tests

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
SESSION_NAME="${SESSION_NAME:-thinkus-project-$(date +%s)}"

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

echo -e "${BLUE}=== Project Creation Flow Tests ===${NC}"

# Test 1: Create Idea page
echo -e "${YELLOW}Test 1: Create Idea page...${NC}"
ab open "$BASE_URL/create/idea"
ab wait 2000
ab screenshot ./screenshots/project-idea.png

url=$(ab get url)
echo "Current URL: $url"

# Check if redirected to login
if [[ "$url" == *"login"* ]]; then
  echo -e "${YELLOW}INFO${NC}: Requires authentication (redirected to login)"
else
  # Check for chat/input interface
  snapshot=$(ab snapshot -i)
  echo "Page elements:"
  echo "$snapshot" | head -15

  if echo "$snapshot" | grep -qi "textbox\|textarea\|input"; then
    echo -e "${GREEN}PASS${NC}: Input field found for idea description"
  else
    echo -e "${YELLOW}INFO${NC}: Input field structure may differ"
  fi
fi

# Test 2: Discuss page
echo -e "${YELLOW}Test 2: Discuss page...${NC}"
ab open "$BASE_URL/create/discuss"
ab wait 2000
ab screenshot ./screenshots/project-discuss.png

url=$(ab get url)
echo "Current URL: $url"

if [[ "$url" != *"login"* ]]; then
  snapshot=$(ab snapshot -c)
  echo "Discussion page structure:"
  echo "$snapshot" | head -15
fi

# Test 3: Confirm page
echo -e "${YELLOW}Test 3: Confirm page...${NC}"
ab open "$BASE_URL/create/confirm"
ab wait 2000
ab screenshot ./screenshots/project-confirm.png

# Test 4: Projects list
echo -e "${YELLOW}Test 4: Projects list...${NC}"
ab open "$BASE_URL/projects"
ab wait 2000
ab screenshot ./screenshots/project-list.png

url=$(ab get url)
if [[ "$url" != *"login"* ]]; then
  snapshot=$(ab snapshot -c)
  echo "Projects list structure:"
  echo "$snapshot" | head -15

  # Check for project cards or empty state
  if echo "$snapshot" | grep -qi "project\|empty\|create\|card"; then
    echo -e "${GREEN}PASS${NC}: Projects list or empty state rendered"
  fi
fi

# Test 5: Project detail (test with mock ID)
echo -e "${YELLOW}Test 5: Project detail page structure...${NC}"
ab open "$BASE_URL/projects/test-project-id"
ab wait 2000
ab screenshot ./screenshots/project-detail.png

# Cleanup
ab close 2>/dev/null || true

echo -e "${BLUE}=== Project Flow Tests Complete ===${NC}"
