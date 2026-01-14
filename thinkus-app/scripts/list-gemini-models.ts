import { GoogleGenerativeAI } from '@google/generative-ai'

// Load API key from environment
const apiKey = process.env.GOOGLE_API_KEY || ''

if (!apiKey) {
  console.error('GOOGLE_API_KEY not set')
  process.exit(1)
}

console.log('API Key prefix:', apiKey.substring(0, 10) + '...')

async function listModels() {
  try {
    // Try to fetch models list directly from API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    )

    if (!response.ok) {
      console.error('Failed to list models:', response.status, response.statusText)
      const text = await response.text()
      console.error('Response:', text)
      return
    }

    const data = await response.json()
    console.log('\nAvailable models:')

    if (data.models) {
      data.models.forEach((model: any) => {
        console.log(`  - ${model.name}`)
        console.log(`    Display: ${model.displayName}`)
        console.log(`    Supported methods: ${model.supportedGenerationMethods?.join(', ')}`)
        console.log('')
      })
    }

    // Also try a simple generation with each model that supports generateContent
    const genAI = new GoogleGenerativeAI(apiKey)

    const modelsToTest = [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro',
      'gemini-1.0-pro-latest',
    ]

    console.log('\n--- Testing model availability ---\n')

    for (const modelName of modelsToTest) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent('Say hello in one word')
        const text = result.response.text()
        console.log(`✅ ${modelName}: "${text.substring(0, 50)}"`)
      } catch (error: any) {
        console.log(`❌ ${modelName}: ${error.message.substring(0, 100)}`)
      }
    }

  } catch (error: any) {
    console.error('Error:', error.message)
  }
}

listModels()
