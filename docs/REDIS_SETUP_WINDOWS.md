# Redis Setup for Windows - TheFounder Scraping System

## Option 1: Redis with Windows Subsystem for Linux (WSL) - Recommended

### Step 1: Install WSL
```powershell
# Run in PowerShell as Administrator
wsl --install
```

### Step 2: Install Redis in WSL
```bash
# In WSL terminal
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

### Step 3: Configure Redis for external access
```bash
# Edit Redis config
sudo nano /etc/redis/redis.conf
# Change: bind 127.0.0.1 ::1
# To: bind 0.0.0.0 ::1

# Restart Redis
sudo service redis-server restart
```

## Option 2: Native Windows Redis (Using Memurai)

### Step 1: Download Memurai
Visit: https://www.memurai.com/get-memurai

### Step 2: Install Memurai
- Run the installer
- Choose "Developer Edition" (free)
- Default port: 6379

### Step 3: Start Memurai Service
```powershell
# Check service status
Get-Service Memurai

# Start if not running
Start-Service Memurai
```

## Option 3: Redis Cloud (Free Tier)

### Step 1: Sign up for Redis Cloud
Visit: https://redis.com/try-free/

### Step 2: Create Free Database
- Choose "Fixed" plan (30MB free)
- Select closest region
- Note your endpoint and password

### Step 3: Update .env.local
```bash
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_ENDPOINT:PORT
```

## Quick Start Commands

### For WSL Redis:
```bash
# Start Redis
wsl -e sudo service redis-server start

# Test connection
wsl -e redis-cli ping
```

### For Memurai:
```powershell
# Start service
Start-Service Memurai

# Test connection (requires redis-cli)
redis-cli ping
```

## Verify Installation

Run the test script:
```bash
npm run test:redis
```

Expected output:
```
✅ Redis connection successful
✅ Redis read/write test: test_value
✅ Redis queue test: test_job
🚀 Redis is ready for job queue system!
```