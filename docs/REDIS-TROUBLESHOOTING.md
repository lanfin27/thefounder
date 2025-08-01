# Redis Connection Troubleshooting Guide

## ✅ ISSUE RESOLVED

The Redis connection issue has been successfully resolved. The problem was with the `enableOfflineQueue: false` option in the ioredis configuration, which conflicts with Redis Cloud's connection behavior.

## Working Solution

Use the minimal connection approach:

```javascript
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);
```

## What Was Wrong

The original configuration had conflicting options:

```javascript
// ❌ This causes "Stream isn't writeable" error
const redis = new Redis(process.env.REDIS_URL, {
  enableOfflineQueue: false,  // This was the problem
  // ... other options
});
```

## Verified Working Methods

From our testing, these methods all work successfully:

1. **Minimal URL** (Recommended)
   ```javascript
   const redis = new Redis(process.env.REDIS_URL);
   ```

2. **Cloud Optimized**
   ```javascript
   const redis = new Redis(process.env.REDIS_URL, {
     maxRetriesPerRequest: 3,
     retryDelayOnFailover: 100,
     enableOfflineQueue: true,  // Note: true, not false
     connectTimeout: 10000
   });
   ```

3. **IPv4 Only**
   ```javascript
   const redis = new Redis({
     host: process.env.REDIS_HOST,
     port: parseInt(process.env.REDIS_PORT),
     password: process.env.REDIS_PASSWORD,
     username: 'default',
     family: 4,
     connectTimeout: 10000
   });
   ```

## Environment Variables

Ensure these are set in `.env.local`:

```bash
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT
REDIS_HOST=YOUR_HOST
REDIS_PORT=YOUR_PORT
REDIS_PASSWORD=YOUR_PASSWORD
REDIS_DB=0
```

## Testing Commands

1. **Basic Redis Test**
   ```bash
   npm run test:redis
   ```

2. **Enhanced Redis Test**
   ```bash
   npm run test:redis-enhanced
   ```

3. **Complete System Validation**
   ```bash
   node scripts/complete-system-validation.js
   ```

## Common Issues and Solutions

### Issue: "Stream isn't writeable and enableOfflineQueue options is false"
**Solution**: Remove `enableOfflineQueue: false` from your Redis configuration or set it to `true`.

### Issue: Connection timeout
**Solution**: Ensure your firewall/antivirus isn't blocking the connection. Try using a VPN or different network.

### Issue: Authentication failed
**Solution**: Verify your Redis Cloud credentials are correct and include the `default:` username in the URL.

## Monitoring Redis Connection

Check Redis connection health:

```javascript
async function checkRedisHealth() {
  try {
    const redis = new Redis(process.env.REDIS_URL);
    const pong = await redis.ping();
    console.log('Redis is healthy:', pong === 'PONG');
    await redis.quit();
  } catch (error) {
    console.error('Redis health check failed:', error.message);
  }
}
```

## Production Recommendations

1. Use connection pooling for high-traffic applications
2. Implement proper error handling and reconnection logic
3. Monitor Redis memory usage and performance
4. Set up alerts for connection failures
5. Use Redis persistence options for critical data

## Support

If you encounter issues:
1. Run the validation script: `node scripts/complete-system-validation.js`
2. Check the detailed report in `validation-report.json`
3. Verify Redis Cloud dashboard shows the database as active
4. Test with redis-cli: `redis-cli -u YOUR_REDIS_URL ping`