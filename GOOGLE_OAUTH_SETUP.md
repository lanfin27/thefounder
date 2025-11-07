# 🔐 Google OAuth Setup Guide for The Founder

## 🚨 Current Error

```
{"error_code":400,"error":"validation_failed","msg":"Unsupported provider, provider is not enabled"}
```

**Root Cause**: Google OAuth Provider is not enabled in Supabase Dashboard.

---

## ✅ Solution Overview

This guide will help you:
1. Configure Google OAuth in Google Cloud Console
2. Enable Google Provider in Supabase
3. Verify environment variables
4. Test the authentication flow

---

## 📋 Step 1: Google Cloud Console Setup

### 1.1 Create OAuth 2.0 Credentials

1. **Navigate to Google Cloud Console**
   - URL: https://console.cloud.google.com/
   - Select your project or create a new one

2. **Enable Google+ API** (if not already enabled)
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API"
   - Click **Enable**

3. **Configure OAuth Consent Screen**
   - Go to **APIs & Services** → **OAuth consent screen**
   - Choose **External** (for public apps) or **Internal** (for workspace)
   - Fill in required information:
     - **App name**: The Founder
     - **User support email**: your-email@example.com
     - **Developer contact email**: your-email@example.com
   - Add scopes:
     - `email`
     - `profile`
     - `openid`
   - Add test users (for development):
     - Add your Gmail accounts that you'll use for testing

4. **Create OAuth 2.0 Client ID**
   - Go to **APIs & Services** → **Credentials**
   - Click **+ CREATE CREDENTIALS** → **OAuth client ID**
   - Application type: **Web application**
   - Name: **The Founder**

   **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   https://[YOUR-DOMAIN].com
   ```

   **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback
   https://[YOUR-PROJECT-ID].supabase.co/auth/v1/callback
   https://[YOUR-DOMAIN].com/api/auth/callback
   ```

5. **Copy Credentials**
   - After creating, you'll see:
     - **Client ID**: `xxxxx.apps.googleusercontent.com`
     - **Client Secret**: `GOCSPX-xxxxx`
   - **IMPORTANT**: Save these - you'll need them for Supabase

---

## 📋 Step 2: Supabase Dashboard Setup

### 2.1 Enable Google Provider

1. **Navigate to Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Select your project: **The Founder**

2. **Go to Authentication Settings**
   - Click **Authentication** in left sidebar
   - Click **Providers** tab

3. **Configure Google Provider**
   - Find **Google** in the list
   - Toggle **Enable Sign in with Google** to **ON**
   - Paste your credentials from Google Cloud:
     - **Client ID (for OAuth)**: `xxxxx.apps.googleusercontent.com`
     - **Client Secret (for OAuth)**: `GOCSPX-xxxxx`
   - **Authorized Client IDs** (optional): Leave empty unless you have specific requirements
   - Click **Save**

### 2.2 Verify Redirect URLs

Make sure Supabase's redirect URL is added to Google Cloud Console:

```
https://[YOUR-PROJECT-ID].supabase.co/auth/v1/callback
```

You can find your project URL in:
- Supabase Dashboard → **Settings** → **API** → **Project URL**

---

## 📋 Step 3: Environment Variables

### 3.1 Check `.env.local`

Verify your `.env.local` file has these variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]

# Site URL (Important for OAuth callbacks)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional: Google OAuth (if you want to use them server-side)
GOOGLE_CLIENT_ID=[YOUR-CLIENT-ID]
GOOGLE_CLIENT_SECRET=[YOUR-CLIENT-SECRET]
```

### 3.2 Get Supabase Keys

You can find these in Supabase Dashboard:
- **Settings** → **API** → **Project API keys**
  - **Project URL**: Your `NEXT_PUBLIC_SUPABASE_URL`
  - **anon public**: Your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - **service_role secret**: Your `SUPABASE_SERVICE_ROLE_KEY`

---

## 📋 Step 4: Restart Development Server

After updating environment variables, restart your dev server:

```bash
# Stop the server (Ctrl+C)

# Restart
npm run dev
```

---

## 📋 Step 5: Test the Flow

### 5.1 Test Signup with Google

1. Navigate to: http://localhost:3000/auth/signup
2. Click **Google로 계속하기** button
3. Select your Google account
4. Grant permissions
5. You should be redirected to homepage
6. Check if you're logged in (profile icon in header)

### 5.2 Test Login with Google

1. Navigate to: http://localhost:3000/auth/login
2. Click **Google로 계속하기** button
3. Select your Google account
4. You should be redirected to homepage
5. Verify logged in state

---

## 🔍 Troubleshooting

### Error 1: "Unsupported provider, provider is not enabled"

**Solution**:
- Go to Supabase Dashboard → Authentication → Providers
- Enable Google Provider
- Add Client ID and Client Secret
- Click Save

### Error 2: "redirect_uri_mismatch"

**Solution**:
- Go to Google Cloud Console → Credentials
- Edit your OAuth 2.0 Client ID
- Add missing redirect URI:
  ```
  https://[YOUR-PROJECT-ID].supabase.co/auth/v1/callback
  ```

### Error 3: "Access blocked: This app's request is invalid"

**Solution**:
- Check OAuth consent screen is properly configured
- Add test users in Google Cloud Console
- Make sure you're signing in with a test user account

### Error 4: "invalid_request"

**Solution**:
- Check `NEXT_PUBLIC_SITE_URL` in `.env.local`
- Restart dev server after changing environment variables
- Clear browser cache and cookies

### Error 5: After login, redirected to error page

**Solution**:
- Check `/api/auth/callback/route.ts` exists
- Verify middleware is properly configured in `src/middleware.ts`
- Check console for error messages

---

## ✅ Verification Checklist

Before testing, make sure:

### Google Cloud Console
- [ ] OAuth 2.0 Client ID created
- [ ] OAuth consent screen configured
- [ ] Authorized redirect URIs include:
  - [ ] `http://localhost:3000/api/auth/callback`
  - [ ] `https://[PROJECT-ID].supabase.co/auth/v1/callback`
- [ ] Test users added (for development)

### Supabase Dashboard
- [ ] Google Provider enabled
- [ ] Client ID added
- [ ] Client Secret added
- [ ] Configuration saved

### Environment Variables
- [ ] `.env.local` file exists
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `NEXT_PUBLIC_SITE_URL` set to `http://localhost:3000`
- [ ] Dev server restarted after changes

### Code Files (Already Updated)
- [x] `/src/lib/auth/oauth.ts` - Google query params added
- [x] `/src/app/api/auth/callback/route.ts` - Callback handler exists
- [x] `/src/middleware.ts` - Session refresh configured
- [x] `/src/components/auth/OAuthButtons.tsx` - Buttons configured

---

## 📊 OAuth Flow Diagram

```
User clicks "Google로 계속하기"
    ↓
signInWithOAuth() in oauth.ts
    ↓
Redirect to Google login page
    ↓
User selects Google account
    ↓
User grants permissions
    ↓
Google redirects to:
https://[PROJECT-ID].supabase.co/auth/v1/callback?code=...
    ↓
Supabase processes code
    ↓
Supabase redirects to:
http://localhost:3000/api/auth/callback?code=...&next=/
    ↓
/api/auth/callback/route.ts exchanges code for session
    ↓
User redirected to home page (/)
    ↓
User is logged in ✅
```

---

## 🎯 Quick Test Commands

```bash
# 1. Check environment variables are loaded
echo $NEXT_PUBLIC_SUPABASE_URL

# 2. Verify OAuth callback route exists
ls src/app/api/auth/callback/route.ts

# 3. Check middleware exists
ls src/middleware.ts

# 4. Start dev server
npm run dev

# 5. Open browser
# http://localhost:3000/auth/signup
```

---

## 📝 Additional Resources

- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth
- **Google OAuth 2.0 Docs**: https://developers.google.com/identity/protocols/oauth2
- **Next.js Env Variables**: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables

---

## 🚀 Production Deployment

When deploying to production, remember to:

1. Add production URL to Google Cloud Console redirect URIs:
   ```
   https://[YOUR-DOMAIN].com/api/auth/callback
   ```

2. Update `.env.production`:
   ```
   NEXT_PUBLIC_SITE_URL=https://[YOUR-DOMAIN].com
   ```

3. Remove test users and publish OAuth consent screen in Google Cloud Console

---

**Last Updated**: 2025-11-05
**Status**: ✅ Code Updated | ⚠️ Requires Supabase + Google Cloud Setup
