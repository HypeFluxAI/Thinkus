#!/bin/bash
# Analytics Dashboard AI Tests

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
SESSION_NAME="${SESSION_NAME:-thinkus-analytics-$(date +%s)}"

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

echo -e "${BLUE}=== Analytics Dashboard Tests ===${NC}"

# Test 1: Analytics page access
echo -e "${YELLOW}Test 1: Analytics page access...${NC}"
ab open "$BASE_URL/projects/test-id/analytics"
ab wait 2000
ab screenshot ./screenshots/analytics-main.png

url=$(ab get url)
echo "Current URL: $url"

if [[ "$url" == *"login"* ]]; then
  echo -e "${YELLOW}INFO${NC}: Requires authentication"
else
  # Check page structure
  snapshot=$(ab snapshot -c)
  echo "Analytics page structure:"
  echo "$snapshot" | head -20
fi

# Test 2: Dashboard widgets
echo -e "${YELLOW}Test 2: Dashboard widgets...${NC}"
snapshot=$(ab snapshot)

# Look for common analytics terms
for term in "users" "views" "sessions" "conversion" "trend" "chart" "graph"; do
  if echo "$snapshot" | grep -qi "$term"; then
    echo -e "${GREEN}Found${NC}: $term"
  fi
done

# Test 3: Interactive elements in dashboard
echo -e "${YELLOW}Test 3: Interactive elements...${NC}"
interactive=$(ab snapshot -i)
echo "Interactive elements:"
echo "$interactive" | head -15

# Check for date pickers, filters, etc.
if echo "$interactive" | grep -qi "select\|dropdown\|date\|filter"; then
  echo -e "${GREEN}PASS${NC}: Filter controls found"
fi

# Test 4: Different viewport sizes
echo -e "${YELLOW}Test 4: Responsive analytics...${NC}"

# Tablet
ab set viewport 768 1024
ab reload
ab wait 2000
ab screenshot ./screenshots/analytics-tablet.png

# Mobile
ab set viewport 375 667
ab reload
ab wait 2000
ab screenshot ./screenshots/analytics-mobile.png

# Reset
ab set viewport 1280 720

# Cleanup
ab close 2>/dev/null || true

echo -e "${BLUE}=== Analytics Tests Complete ===${NC}"
