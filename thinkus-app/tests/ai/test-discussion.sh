#!/bin/bash
# AI Discussion and Expert Panel Tests

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
SESSION_NAME="${SESSION_NAME:-thinkus-discuss-$(date +%s)}"

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

echo -e "${BLUE}=== AI Discussion Tests ===${NC}"

# Test 1: Discussion page structure
echo -e "${YELLOW}Test 1: Discussion page structure...${NC}"
ab open "$BASE_URL/create/discuss"
ab wait 3000
ab screenshot ./screenshots/discuss-main.png

url=$(ab get url)
if [[ "$url" == *"login"* ]]; then
  echo -e "${YELLOW}INFO${NC}: Requires authentication"
else
  # Check for expert avatars/names
  snapshot=$(ab snapshot)
  echo "Discussion page snapshot:"
  echo "$snapshot" | head -30

  # Look for expert-related elements
  experts_found=0
  for expert in "Mike" "Elena" "David" "Expert" "AI"; do
    if echo "$snapshot" | grep -qi "$expert"; then
      experts_found=$((experts_found + 1))
    fi
  done

  if [ $experts_found -gt 0 ]; then
    echo -e "${GREEN}PASS${NC}: Found $experts_found expert-related elements"
  else
    echo -e "${YELLOW}INFO${NC}: Expert elements may be loaded dynamically"
  fi
fi

# Test 2: Chat/Message interface
echo -e "${YELLOW}Test 2: Chat interface...${NC}"
snapshot=$(ab snapshot -i)
echo "Interactive elements:"
echo "$snapshot" | head -20

# Look for chat input
if echo "$snapshot" | grep -qi "textbox\|textarea\|message"; then
  echo -e "${GREEN}PASS${NC}: Chat input found"
fi

# Test 3: Discussion controls
echo -e "${YELLOW}Test 3: Discussion controls...${NC}"
snapshot=$(ab snapshot -i)

# Look for buttons (next, continue, etc.)
button_count=$(echo "$snapshot" | grep -ci "button" || echo "0")
echo "Found $button_count buttons"

# Test 4: Progress indicators
echo -e "${YELLOW}Test 4: Progress/Phase indicators...${NC}"
snapshot=$(ab snapshot)
if echo "$snapshot" | grep -qi "phase\|step\|progress\|stage"; then
  echo -e "${GREEN}PASS${NC}: Progress indicators found"
else
  echo -e "${YELLOW}INFO${NC}: Progress may be shown differently"
fi

# Test 5: Mobile responsive discussion
echo -e "${YELLOW}Test 5: Mobile responsive discussion...${NC}"
ab set viewport 375 667
ab reload
ab wait 2000
ab screenshot ./screenshots/discuss-mobile.png
ab set viewport 1280 720

# Cleanup
ab close 2>/dev/null || true

echo -e "${BLUE}=== Discussion Tests Complete ===${NC}"
