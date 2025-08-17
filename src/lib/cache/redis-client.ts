import Redis from 'ioredis'

class RedisClient {
  private static instance: Redis | null = null
  private static isConnected = false

  static getInstance(): Redis {
    if (!this.instance) {
      this.instance = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        onConnect: () => {
          console.log('Redis connected successfully')
          this.isConnected = true
        },
        onError: (error) => {
          console.error('Redis connection error:', error)
          this.isConnected = false
        }
      })
    }
    return this.instance
  }

  static async connect(): Promise<void> {
    const client = this.getInstance()
    if (!this.isConnected) {
      try {
        await client.connect()
      } catch (error) {
        console.error('Failed to connect to Redis:', error)
        // Fallback to in-memory cache if Redis is not available
      }
    }
  }

  static async disconnect(): Promise<void> {
    if (this.instance && this.isConnected) {
      await this.instance.disconnect()
      this.instance = null
      this.isConnected = false
    }
  }

  static isReady(): boolean {
    return this.isConnected && this.instance?.status === 'ready'
  }
}

export default RedisClient