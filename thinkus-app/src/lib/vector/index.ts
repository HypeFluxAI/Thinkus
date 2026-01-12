// Pinecone配置
export {
  getPineconeClient,
  getPineconeIndex,
  generateNamespace,
  PINECONE_INDEX_NAME,
  VECTOR_DIMENSION,
  type MemoryType,
  type MemoryMetadata,
  type VectorRecord,
} from './pinecone'

// 嵌入服务
export {
  generateEmbedding,
  generateEmbeddings,
  cosineSimilarity,
  EMBEDDING_MODEL,
} from './embedding'

// 记忆服务
export {
  storeMemory,
  storeMemories,
  retrieveMemories,
  retrieveUserPreferences,
  deleteMemory,
  deleteUserMemories,
  formatMemoriesAsContext,
  type MemoryEntry,
} from './memory-service'
