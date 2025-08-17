import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Connection test function
export async function connectToDatabase() {
  try {
    await db.$connect()
    console.log('✅ Connected to MongoDB Atlas')
    return true
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB Atlas:', error)
    return false
  }
}

// Graceful shutdown
export async function disconnectFromDatabase() {
  await db.$disconnect()
}

// Convenience accessor that ensures a connection before returning the client
export async function getDb() {
  try {
    // Attempt to connect; if already connected, Prisma will no-op
    await db.$connect()
  } catch (err) {
    // Log and rethrow to let callers decide fallback behavior
    console.error('getDb: failed to connect to database', err)
    throw err
  }
  return db
}

// Generic retry wrapper for DB operations with simple exponential backoff
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  label: string = 'DB Operation',
  maxRetries: number = 2,
  baseDelayMs: number = 200
): Promise<T> {
  let attempt = 0
  let lastError: unknown
  while (attempt <= maxRetries) {
    try {
      if (attempt > 0) {
        console.warn(`${label}: retry attempt ${attempt}/${maxRetries}`)
      }
      const result = await fn()
      return result
    } catch (err) {
      lastError = err
      if (attempt === maxRetries) break
      const delay = baseDelayMs * Math.pow(2, attempt)
      await new Promise((res) => setTimeout(res, delay))
      attempt++
    }
  }
  console.error(`${label}: failed after ${maxRetries + 1} attempts`, lastError)
  throw lastError
}