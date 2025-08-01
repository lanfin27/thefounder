# API Authentication Guide

## Overview

The TheFounder Flippa scraping system uses admin token authentication for all API endpoints. This document explains how authentication works and how to use it.

## Authentication Method

All scraping API endpoints require an admin token to be passed in the request headers.

### Required Header

```
x-admin-token: your_admin_token_here
```

### Environment Variables

The admin token is configured through environment variables in `.env.local`:

```env
ADMIN_TOKEN=thefounder_admin_2025_secure
NEXT_PUBLIC_ADMIN_TOKEN=thefounder_admin_2025_secure
FLIPPA_ADMIN_TOKEN=thefounder_admin_2025_secure
```

## API Endpoints

All endpoints under `/api/scraping/` require authentication:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scraping/test` | GET | Test scraping functionality |
| `/api/scraping/jobs` | GET | List all scraping jobs |
| `/api/scraping/jobs` | POST | Create a new scraping job |
| `/api/scraping/jobs/[id]` | GET | Get specific job details |
| `/api/scraping/jobs/[id]` | DELETE | Cancel a scraping job |
| `/api/scraping/queue` | GET | Get queue statistics |
| `/api/scraping/queue` | POST | Manage queue (pause/resume) |
| `/api/scraping/stats` | GET | Get scraping statistics |
| `/api/scraping/auth-test` | GET | Test authentication |

## Usage Examples

### Using cURL

```bash
# Test authentication
curl -H "x-admin-token: thefounder_admin_2025_secure" \
  http://localhost:3000/api/scraping/auth-test

# Create a scraping job
curl -X POST \
  -H "x-admin-token: thefounder_admin_2025_secure" \
  -H "Content-Type: application/json" \
  -d '{"jobType":"listing_scan","config":{"category":"saas","maxPages":1}}' \
  http://localhost:3000/api/scraping/jobs
```

### Using JavaScript/Axios

```javascript
const axios = require('axios');

const adminToken = process.env.ADMIN_TOKEN || 'thefounder_admin_2025_secure';

// List jobs
const response = await axios.get('http://localhost:3000/api/scraping/jobs', {
  headers: {
    'x-admin-token': adminToken
  }
});

// Create job
const jobResponse = await axios.post(
  'http://localhost:3000/api/scraping/jobs',
  {
    jobType: 'listing_scan',
    config: {
      category: 'saas',
      maxPages: 1
    }
  },
  {
    headers: {
      'x-admin-token': adminToken,
      'Content-Type': 'application/json'
    }
  }
);
```

## Authentication Flow

1. **Client sends request** with `x-admin-token` header
2. **API extracts token** using `extractAdminToken()` function
3. **Token is verified** against environment variables
4. **Access granted** if token matches, otherwise 401 Unauthorized

## Alternative Authentication Methods

The authentication system also supports these alternative methods (though `x-admin-token` is preferred):

- Authorization Bearer header: `Authorization: Bearer your_token`
- Alternative headers: `X-Admin-Token`, `Admin-Token`, `x-api-key`
- Query parameter (not recommended): `?token=your_token`

## Troubleshooting

### Authentication Failed

If you receive a 401 Unauthorized error:

1. **Check token value**: Ensure the token in your request matches the one in `.env.local`
2. **Check header name**: Use lowercase `x-admin-token`
3. **Test with auth endpoint**: `GET /api/scraping/auth-test` provides debug info
4. **Run diagnostics**: `npm run test:auth`

### Common Issues

1. **Missing .env.local file**: Create it from `.env.example`
2. **Token not loaded**: Restart the Next.js server after changing `.env.local`
3. **Wrong header format**: Don't include "Bearer" prefix with `x-admin-token`
4. **Case sensitivity**: Headers are case-insensitive but tokens are case-sensitive

## Security Notes

- **Keep tokens secret**: Never commit actual tokens to version control
- **Use HTTPS in production**: Tokens are sent in plain text over HTTP
- **Rotate tokens regularly**: Change admin tokens periodically
- **Monitor access**: Check logs for unauthorized access attempts

## Testing Authentication

Run the authentication test suite:

```bash
# Test all endpoints
npm run test:auth

# Quick verification
npm run scrape:start
```

The test will verify that all endpoints are properly authenticated and the scraping system can create jobs successfully.