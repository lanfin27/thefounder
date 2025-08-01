// Working Redis Configuration
// Generated: 2025-08-01T03:44:46.584Z
// Method: Method 1: Minimal URL

const Redis = require('ioredis');
require('dotenv').config({ path: '.env.local' });

function createRedisClient() {
  async () => new Redis(REDIS_URL)
}

module.exports = { createRedisClient };
