# Thinkus AI Testing

AI-powered browser testing using [agent-browser](https://github.com/vercel-labs/agent-browser).

## Prerequisites

```bash
# Install agent-browser
npm install -g agent-browser

# Install browser (Chromium)
agent-browser install
```

## Run Tests

```bash
# Run all tests
./run-ai-tests.sh

# Run specific test suite
./test-homepage.sh
./test-auth.sh
./test-project-flow.sh
./test-discussion.sh

# Run with headed browser (visible)
./run-ai-tests.sh --headed

# Run against production
BASE_URL=https://thinkus.ai ./run-ai-tests.sh
```

## Test Structure

- `test-homepage.sh` - Homepage and navigation tests
- `test-auth.sh` - Authentication flow tests
- `test-project-flow.sh` - Project creation flow tests
- `test-discussion.sh` - AI discussion flow tests
- `test-analytics.sh` - Analytics dashboard tests

## How It Works

agent-browser provides:
- `snapshot` - Accessibility tree with element refs (@e1, @e2...)
- `click @ref` - Click by reference
- `fill @ref "text"` - Fill input by reference
- `get text @ref` - Get element text
- `screenshot` - Capture screenshots

The tests use these commands to navigate and verify the UI programmatically.
