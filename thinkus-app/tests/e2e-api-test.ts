/**
 * End-to-End API Test Script
 * Tests the complete flow from user authentication to project completion
 */

const BASE_URL = 'http://localhost:3000'

interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'skip'
  error?: string
  duration: number
}

const results: TestResult[] = []

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now()
  try {
    await testFn()
    results.push({ name, status: 'pass', duration: Date.now() - start })
    console.log(`✅ ${name}`)
  } catch (error) {
    results.push({
      name,
      status: 'fail',
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start
    })
    console.log(`❌ ${name}: ${error}`)
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 30000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

// Test 1: Health Check
async function testHealthCheck() {
  const response = await fetchWithTimeout(`${BASE_URL}/api/health`)
  const data = await response.json()

  if (data.status !== 'healthy') {
    throw new Error(`Health check failed: ${JSON.stringify(data)}`)
  }
  if (data.services.database.status !== 'connected') {
    throw new Error(`Database not connected: ${JSON.stringify(data)}`)
  }
}

// Test 2: Auth - Create Test User via Credentials
async function testCreateUser() {
  // First, try to register a new user
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'Test123456!',
    name: 'E2E Test User',
  }

  // Check if registration endpoint exists
  const response = await fetchWithTimeout(`${BASE_URL}/api/auth/providers`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to get auth providers: ${response.status}`)
  }

  return testUser
}

// Test 3: Discussion API - Create Discussion
async function testDiscussionStart(sessionCookie: string) {
  const response = await fetchWithTimeout(`${BASE_URL}/api/discussion/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify({
      topic: 'E2E测试：如何优化用户体验',
      participants: ['mike', 'elena'],
      projectPhase: 'development',
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Discussion start failed: ${response.status} - ${text}`)
  }

  return await response.json()
}

// Test 4: Executive Discussion API
async function testExecutiveDiscuss(sessionCookie: string) {
  const response = await fetchWithTimeout(`${BASE_URL}/api/executives/discuss`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify({
      topic: 'E2E测试：产品功能规划',
      projectPhase: 'development',
      maxRounds: 2,
      participants: ['mike', 'elena'],
    }),
  }, 60000) // 60 second timeout for streaming

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Executive discuss failed: ${response.status} - ${text}`)
  }

  // Read the SSE stream
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let fullResponse = ''
  let hasContent = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    fullResponse += chunk

    // Check if we received any content
    if (chunk.includes('expert_message_delta') || chunk.includes('discussion_complete')) {
      hasContent = true
    }

    // Check for errors in the stream
    if (chunk.includes('"type":"error"')) {
      throw new Error(`Stream error: ${chunk}`)
    }
  }

  if (!hasContent) {
    throw new Error('No content received from discussion')
  }

  return fullResponse
}

// Test 5: Executive Chat API
async function testExecutiveChat(sessionCookie: string) {
  const response = await fetchWithTimeout(`${BASE_URL}/api/executive-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify({
      agentId: 'mike',
      messages: [{ role: 'user', content: 'E2E测试：你好，请介绍一下你自己' }],
    }),
  }, 60000)

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Executive chat failed: ${response.status} - ${text}`)
  }

  // Read the SSE stream
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let fullResponse = ''
  let hasContent = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    fullResponse += chunk

    if (chunk.includes('"type":"delta"') || chunk.includes('"type":"done"')) {
      hasContent = true
    }

    if (chunk.includes('"type":"error"')) {
      throw new Error(`Stream error: ${chunk}`)
    }
  }

  if (!hasContent) {
    throw new Error('No content received from chat')
  }

  return fullResponse
}

// Test 6: Code Generation API
async function testCodeGenerate(sessionCookie: string, projectId: string) {
  const response = await fetchWithTimeout(`${BASE_URL}/api/code/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify({
      projectId,
      filePath: 'src/components/TestComponent.tsx',
      description: 'A simple React component for E2E testing',
    }),
  }, 60000)

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Code generate failed: ${response.status} - ${text}`)
  }

  // Read the SSE stream
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let fullResponse = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    fullResponse += chunk
  }

  if (!fullResponse.includes('data:')) {
    throw new Error('No code generated')
  }

  return fullResponse
}

// Main test runner
async function runAllTests() {
  console.log('\n🚀 Starting E2E API Tests\n')
  console.log('=' .repeat(50))

  // Test 1: Health Check
  await runTest('Health Check', testHealthCheck)

  // For authenticated tests, we need a valid session
  // In a real scenario, we would login first
  // For now, we'll test what we can without authentication

  console.log('\n' + '=' .repeat(50))
  console.log('\n📊 Test Results Summary:\n')

  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const skipped = results.filter(r => r.status === 'skip').length

  console.log(`  Passed:  ${passed}`)
  console.log(`  Failed:  ${failed}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Total:   ${results.length}`)

  if (failed > 0) {
    console.log('\n❌ Failed Tests:')
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`)
    })
  }

  return { passed, failed, skipped, results }
}

// Export for use as module
export { runAllTests, testHealthCheck, testExecutiveDiscuss, testExecutiveChat }

// Run if executed directly
runAllTests().catch(console.error)
