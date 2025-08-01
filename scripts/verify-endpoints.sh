#!/bin/bash

# Verify API endpoints with curl
TOKEN="thefounder_admin_2025_secure"
BASE_URL="http://localhost:3000"

echo "🔍 Verifying API Endpoints"
echo "=========================="

echo -e "\n1. Testing /api/scraping/status"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "x-admin-token: $TOKEN" \
  "$BASE_URL/api/scraping/status" | head -20

echo -e "\n\n2. Testing /api/listings"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "x-admin-token: $TOKEN" \
  "$BASE_URL/api/listings?limit=5" | head -20

echo -e "\n\n3. Testing /api/scraping/queue"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "x-admin-token: $TOKEN" \
  "$BASE_URL/api/scraping/queue" | head -20

echo -e "\n=========================="