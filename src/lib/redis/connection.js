// Enhanced Redis connection handler for Redis Cloud
const Redis = require('ioredis');
require('dotenv').config({ path: '.env.local' });

class RedisConnection {
  constructor() {
    this.client = null;
    this.config = {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    };
  }

  async connect() {
    if (this.client && this.client.status === 'ready') {
      return this.client;
    }

    try {
      // Use minimal URL connection - proven to work with Redis Cloud
      console.log('🔄 Connecting to Redis Cloud...');
      this.client = new Redis(this.config.url);

      // Add event handlers
      this.client.on('connect', () => {
        console.log('🔗 Redis client connected');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis client ready');
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis client error:', err.message);
      });

      this.client.on('close', () => {
        console.log('🔒 Redis connection closed');
      });

      this.client.on('reconnecting', (delay) => {
        console.log(`🔄 Redis reconnecting in ${delay}ms`);
      });

      // Test the connection
      const pong = await this.client.ping();
      if (pong !== 'PONG') {
        throw new Error('Redis ping test failed');
      }

      console.log('✅ Redis connection established and verified');
      return this.client;

    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      console.log('👋 Redis disconnected');
    }
  }

  getClient() {
    if (!this.client || this.client.status !== 'ready') {
      throw new Error('Redis client not connected. Call connect() first.');
    }
    return this.client;
  }

  async isConnected() {
    try {
      if (!this.client) return false;
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
const redisConnection = new RedisConnection();

module.exports = {
  redisConnection,
  RedisConnection,
  
  // Helper function for quick connection
  async getRedisClient() {
    await redisConnection.connect();
    return redisConnection.getClient();
  }
};