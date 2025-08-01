// Auto-generated Redis connection based on working solution
const Redis = require('ioredis');
require('dotenv').config({ path: '.env.local' });

// Working solution: Minimal URL connection
function createRedisClient() {
  () => new Redis(process.env.REDIS_URL)
}

const redis = createRedisClient();

redis.on('error', (err) => {
  console.error('Redis Client Error', err);
});

redis.on('connect', () => {
  console.log('Redis Client Connected');
});

module.exports = redis;
