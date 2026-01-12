import OpenAI from 'openai'

// OpenAI客户端单例
let openaiClient: OpenAI | null = null

/**
 * 获取OpenAI客户端
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }

    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  return openaiClient
}

// 默认嵌入模型
export const EMBEDDING_MODEL = 'text-embedding-3-small'

/**
 * 生成文本嵌入向量
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient()

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  })

  return response.data[0].embedding
}

/**
 * 批量生成嵌入向量
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const client = getOpenAIClient()

  // OpenAI支持批量嵌入，最多2048个文本
  const batchSize = 100
  const allEmbeddings: number[][] = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)

    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    })

    const embeddings = response.data
      .sort((a, b) => a.index - b.index)
      .map(item => item.embedding)

    allEmbeddings.push(...embeddings)
  }

  return allEmbeddings
}

/**
 * 计算两个向量的余弦相似度
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
