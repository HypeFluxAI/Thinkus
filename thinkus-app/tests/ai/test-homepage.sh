#!/bin/bash
# Homepage and Navigation AI Tests

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
SESSION_NAME="${SESSION_NAME:-thinkus-homepage-$(date +%s)}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

ab() {
  agent-browser --session "$SESSION_NAME" "$@"
}

echo -e "${BLUE}=== Homepage Tests ===${NC}"

# Test 1: Open homepage and verify title
echo "Test 1: Homepage title..."
ab open "$BASE_URL"
ab wait 2000
title=$(ab get title)
if [[ "$title" == *"Thinkus"* ]]; then
  echo -e "${GREEN}PASS${NC}: Title contains 'Thinkus'"
else
  echo -e "${RED}FAIL${NC}: Title is '$title'"
fi

# Test 2: Take snapshot and analyze structure
echo "Test 2: Page structure..."
snapshot=$(ab snapshot -c)
echo "Accessibility tree snapshot:"
echo "$snapshot" | head -30

# Test 3: Check for interactive elements
echo "Test 3: Interactive elements..."
interactive=$(ab snapshot -i)
button_count=$(echo "$interactive" | grep -ci "button" || echo "0")
link_count=$(echo "$interactive" | grep -ci "link" || echo "0")
echo "Found $button_count buttons, $link_count links"

# Test 4: Navigation links
echo "Test 4: Navigation links..."
ab snapshot -i | grep -i "link" | head -10

# Test 5: Screenshot
echo "Test 5: Taking screenshot..."
mkdir -p ./screenshots
ab screenshot ./screenshots/homepage-test.png
echo -e "${GREEN}Screenshot saved${NC}"

# Cleanup
ab close 2>/dev/null || true

echo -e "${BLUE}=== Homepage Tests Complete ===${NC}"
