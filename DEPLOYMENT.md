# MoonCreditFi - Vercel Deployment Guide

This guide will walk you through deploying the MoonCreditFi DeFi platform to Vercel.

## Prerequisites

- GitHub account with the repository: https://github.com/Zakariasisu5/Mooncreditfi-sui-move.git
- Vercel account (sign up at https://vercel.com)
- Node.js 18+ installed locally (for testing)

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

#### Step 1: Sign in to Vercel
1. Go to https://vercel.com
2. Click "Sign Up" or "Log In"
3. Sign in with your GitHub account

#### Step 2: Import Your Repository
1. Click "Add New..." → "Project"
2. Select "Import Git Repository"
3. Find and select your repository: `Zakariasisu5/Mooncreditfi-sui-move`
4. Click "Import"

#### Step 3: Configure Project Settings
Vercel will auto-detect the Vite framework. Verify these settings:

**Build & Development Settings:**
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

**Root Directory:**
- Leave as `.` (root)

#### Step 4: Environment Variables (Optional)
If you have any environment variables (like API keys), add them:
1. Click "Environment Variables"
2. Add any required variables
3. Click "Add"

**Note:** Currently, all configuration is in `src/config/sui.js`, so no environment variables are needed.

#### Step 5: Deploy
1. Click "Deploy"
2. Wait for the build to complete (usually 2-3 minutes)
3. Once deployed, you'll get a URL like: `https://mooncreditfi-sui-move.vercel.app`

#### Step 6: Verify Deployment
1. Click on the deployment URL
2. Test the following:
   - ✅ Homepage loads correctly
   - ✅ Wallet connection works
   - ✅ DePIN Finance page shows all 6 projects
   - ✅ Lend/Borrow pages load
   - ✅ All blockchain interactions work

---

### Option 2: Deploy via Vercel CLI

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

#### Step 2: Login to Vercel
```bash
vercel login
```

#### Step 3: Deploy from Project Directory
```bash
# Navigate to your project directory
cd path/to/mooncreditfi-sui-move

# Deploy to production
vercel --prod
```

#### Step 4: Follow CLI Prompts
- Set up and deploy: `Y`
- Which scope: Select your account
- Link to existing project: `N` (first time)
- Project name: `mooncreditfi-sui-move`
- Directory: `./`
- Override settings: `N`

---

### Option 3: Deploy via GitHub Integration (Automatic)

#### Step 1: Connect GitHub Repository
1. In Vercel Dashboard, go to your project
2. Go to Settings → Git
3. Connect your GitHub repository

#### Step 2: Configure Auto-Deploy
- **Production Branch:** `main`
- **Deploy Hooks:** Enabled

#### Step 3: Automatic Deployments
Now, every time you push to `main` branch:
- Vercel automatically builds and deploys
- You get a preview URL for each commit
- Production URL updates on successful build

---

## Post-Deployment Configuration

### Custom Domain (Optional)

#### Step 1: Add Domain
1. Go to Project Settings → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `mooncreditfi.com`)

#### Step 2: Configure DNS
Add these DNS records at your domain provider:

**For root domain:**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

#### Step 3: Verify Domain
- Wait for DNS propagation (5-30 minutes)
- Vercel will automatically issue SSL certificate

---

## Troubleshooting

### Build Fails

**Issue:** Build fails with module errors
**Solution:**
```bash
# Locally test the build
npm install
npm run build

# If successful, commit and push
git add .
git commit -m "Fix build issues"
git push origin main
```

### Wallet Connection Issues

**Issue:** Wallet doesn't connect on deployed site
**Solution:**
- Ensure you're using HTTPS (Vercel provides this automatically)
- Check browser console for errors
- Verify Sui wallet extension is installed

### Blockchain Data Not Loading

**Issue:** Projects or data don't load
**Solution:**
- Check `src/config/sui.js` has correct contract addresses
- Verify network is set to `testnet`
- Check browser console for API errors

### 404 Errors on Page Refresh

**Issue:** Getting 404 when refreshing pages
**Solution:**
- Verify `vercel.json` exists with rewrites configuration
- The provided `vercel.json` should handle this automatically

---

## Performance Optimization

### Enable Caching
The `vercel.json` file includes cache headers for static assets.

### Enable Analytics
1. Go to Project Settings → Analytics
2. Enable Web Analytics
3. Monitor performance metrics

### Enable Speed Insights
1. Install package: `npm install @vercel/speed-insights`
2. Add to `src/main.jsx`:
```javascript
import { SpeedInsights } from '@vercel/speed-insights/react';

// Add <SpeedInsights /> component to your app
```

---

## Monitoring & Maintenance

### View Deployment Logs
1. Go to Deployments tab
2. Click on any deployment
3. View build logs and runtime logs

### Rollback Deployment
1. Go to Deployments tab
2. Find previous successful deployment
3. Click "..." → "Promote to Production"

### Set Up Notifications
1. Go to Project Settings → Notifications
2. Configure email/Slack notifications for:
   - Deployment failures
   - Deployment success
   - Performance issues

---

## Environment-Specific Deployments

### Preview Deployments
- Every branch gets a preview URL
- Test features before merging to main
- Preview URL format: `mooncreditfi-sui-move-git-branch-name.vercel.app`

### Production Deployment
- Only `main` branch deploys to production
- Production URL: `mooncreditfi-sui-move.vercel.app`

---

## Security Best Practices

1. **Never commit sensitive keys** to the repository
2. **Use environment variables** for API keys (if needed in future)
3. **Enable Vercel Authentication** for preview deployments (optional)
4. **Monitor deployment logs** for suspicious activity
5. **Keep dependencies updated** regularly

---

## Useful Commands

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# View deployment logs
vercel logs

# List all deployments
vercel ls

# Remove a deployment
vercel rm [deployment-url]

# Open project in browser
vercel open
```

---

## Support & Resources

- **Vercel Documentation:** https://vercel.com/docs
- **Vite Documentation:** https://vitejs.dev
- **Sui Documentation:** https://docs.sui.io
- **Project Repository:** https://github.com/Zakariasisu5/Mooncreditfi-sui-move.git

---

## Quick Deployment Checklist

- [ ] Repository pushed to GitHub
- [ ] Signed in to Vercel
- [ ] Imported repository to Vercel
- [ ] Verified build settings
- [ ] Deployed successfully
- [ ] Tested wallet connection
- [ ] Verified all pages load
- [ ] Tested blockchain interactions
- [ ] (Optional) Added custom domain
- [ ] (Optional) Enabled analytics

---

## Expected Build Output

```
✓ Building for production...
✓ 1250 modules transformed
✓ Rendering chunks...
✓ dist/index.html                   0.45 kB
✓ dist/assets/index-a1b2c3d4.css   125.32 kB
✓ dist/assets/index-e5f6g7h8.js    850.15 kB
✓ Build completed in 45s
```

Your MoonCreditFi DeFi platform is now live! 🚀
