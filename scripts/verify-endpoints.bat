@echo off
echo Testing API Endpoints
echo ====================

set TOKEN=thefounder_admin_2025_secure
set BASE_URL=http://localhost:3000

echo.
echo 1. Testing /api/scraping/status
curl -s -H "x-admin-token: %TOKEN%" "%BASE_URL%/api/scraping/status"

echo.
echo.
echo 2. Testing /api/listings
curl -s -H "x-admin-token: %TOKEN%" "%BASE_URL%/api/listings?limit=2"

echo.
echo.
echo 3. Testing /api/scraping/queue
curl -s -H "x-admin-token: %TOKEN%" "%BASE_URL%/api/scraping/queue"

echo.
echo ====================
pause