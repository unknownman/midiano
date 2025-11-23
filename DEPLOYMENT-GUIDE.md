# 🚀 Deployment Guide - Launch to Production!

## Deployment Options

### Option 1: Vercel (Recommended for Web App) ⚡

**Best for:** Fast deployment, automatic HTTPS, global CDN

#### Setup

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel
```

#### Configuration

Create `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "client/dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Permissions-Policy",
          "value": "midi=*"
        }
      ]
    }
  ]
}
```

#### Deploy

```bash
# Production deployment
vercel --prod

# Your app will be live at:
# https://midi-keyboard-trainer.vercel.app
```

---

### Option 2: Netlify 🌐

**Best for:** Simple deployment, form handling, serverless functions

#### Setup

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize
netlify init
```

#### Configuration

Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "client/dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    Permissions-Policy = "midi=*"
```

#### Deploy

```bash
# Deploy to production
netlify deploy --prod

# Your app will be live at:
# https://midi-keyboard-trainer.netlify.app
```

---

### Option 3: GitHub Pages 📄

**Best for:** Free hosting, simple static sites

#### Setup

1. **Update `vite.config.js`:**
```javascript
export default defineConfig({
  base: '/keyboard-trainer/',  // Your repo name
  // ... rest of config
});
```

2. **Install gh-pages:**
```bash
npm install --save-dev gh-pages
```

3. **Add deploy script to `package.json`:**
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d client/dist"
  }
}
```

#### Deploy

```bash
# Deploy to GitHub Pages
npm run deploy

# Your app will be live at:
# https://yourusername.github.io/keyboard-trainer/
```

---

### Option 4: Railway 🚂

**Best for:** Full-stack apps with backend

#### Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init
```

#### Configuration

Create `railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run dev",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### Deploy

```bash
# Deploy
railway up

# Link to project
railway link

# Your app will be live at:
# https://your-app.up.railway.app
```

---

## Backend Deployment (Optional)

### Deploy WebSocket MIDI Bridge

If you need the WebSocket server for MIDI:

#### Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create midi-trainer-server

# Deploy
git push heroku main

# Your WebSocket server will be at:
# wss://midi-trainer-server.herokuapp.com
```

Create `Procfile`:
```
web: node server/index.js
```

#### Railway

```bash
# Deploy server separately
railway init

# Set start command
railway run node server/index.js
```

---

## Environment Variables

### Production Environment

Create `.env.production`:
```env
VITE_API_URL=https://your-api.com
VITE_WS_URL=wss://your-websocket.com
VITE_ENABLE_ANALYTICS=true
```

### Update Code

```javascript
// In your components
const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;
```

---

## Custom Domain

### Vercel

```bash
# Add custom domain
vercel domains add midi-trainer.com

# Configure DNS:
# Type: CNAME
# Name: @
# Value: cname.vercel-dns.com
```

### Netlify

```bash
# Add custom domain
netlify domains:add midi-trainer.com

# Configure DNS:
# Type: A
# Name: @
# Value: 75.2.60.5
```

---

## SSL/HTTPS

All modern hosting platforms provide free SSL:

- ✅ Vercel: Automatic
- ✅ Netlify: Automatic
- ✅ GitHub Pages: Automatic
- ✅ Railway: Automatic

**Note:** HTTPS is **required** for WebMIDI API!

---

## Performance Optimization

### 1. Build Optimization

```javascript
// vite.config.js
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Remove console.logs
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'tone': ['tone'],
          'vue': ['vue']
        }
      }
    }
  }
});
```

### 2. Asset Optimization

```bash
# Optimize images
npm install --save-dev vite-plugin-imagemin

# Add to vite.config.js
import viteImagemin from 'vite-plugin-imagemin';

export default defineConfig({
  plugins: [
    viteImagemin({
      gifsicle: { optimizationLevel: 7 },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.8, 0.9] },
      svgo: { plugins: [{ name: 'removeViewBox' }] }
    })
  ]
});
```

### 3. Code Splitting

```javascript
// Lazy load components
const ScoreRenderer = defineAsyncComponent(() =>
  import('./components/ScoreRenderer.vue')
);
```

### 4. CDN for Static Assets

```html
<!-- Use CDN for Tone.js -->
<script src="https://cdn.jsdelivr.net/npm/tone@latest/build/Tone.js"></script>
```

---

## Analytics (Optional)

### Google Analytics

```bash
npm install vue-gtag
```

```javascript
// main.js
import VueGtag from 'vue-gtag';

app.use(VueGtag, {
  config: { id: 'G-XXXXXXXXXX' }
});
```

### Plausible (Privacy-friendly)

```html
<!-- In index.html -->
<script defer data-domain="midi-trainer.com" src="https://plausible.io/js/script.js"></script>
```

---

## Monitoring

### Sentry (Error Tracking)

```bash
npm install @sentry/vue
```

```javascript
// main.js
import * as Sentry from '@sentry/vue';

Sentry.init({
  app,
  dsn: 'your-sentry-dsn',
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0
});
```

---

## SEO Optimization

### Meta Tags

Update `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- SEO -->
  <title>MIDI Keyboard Trainer - Master Piano Chords</title>
  <meta name="description" content="Learn piano chords with real-time MIDI feedback. Interactive training with Melodics-style UI.">
  <meta name="keywords" content="MIDI, piano, keyboard, training, chords, music education">
  
  <!-- Open Graph -->
  <meta property="og:title" content="MIDI Keyboard Trainer">
  <meta property="og:description" content="Master piano chords with real-time feedback">
  <meta property="og:image" content="/og-image.png">
  <meta property="og:url" content="https://midi-trainer.com">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="MIDI Keyboard Trainer">
  <meta name="twitter:description" content="Master piano chords with real-time feedback">
  <meta name="twitter:image" content="/twitter-image.png">
  
  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

### Sitemap

Create `public/sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://midi-trainer.com/</loc>
    <lastmod>2025-01-01</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>
```

### robots.txt

Create `public/robots.txt`:
```
User-agent: *
Allow: /
Sitemap: https://midi-trainer.com/sitemap.xml
```

---

## Pre-Launch Checklist

```
□ Test on multiple browsers (Chrome, Firefox, Safari, Edge)
□ Test on mobile devices
□ Verify MIDI permissions work
□ Check audio playback
□ Test all animations
□ Verify HTTPS is enabled
□ Add analytics
□ Set up error tracking
□ Create social media images
□ Write documentation
□ Test performance (Lighthouse score >90)
□ Check accessibility (WCAG AA)
□ Verify SEO meta tags
□ Test on slow connections
□ Create backup/restore plan
```

---

## Launch Strategy

### Soft Launch

1. **Deploy to staging**
```bash
vercel --prod --scope=staging
```

2. **Test with beta users**
3. **Gather feedback**
4. **Fix critical issues**

### Public Launch

1. **Deploy to production**
```bash
vercel --prod
```

2. **Announce on:**
   - Product Hunt
   - Hacker News
   - Reddit (r/piano, r/musictheory)
   - Twitter/X
   - LinkedIn

3. **Monitor:**
   - Error rates (Sentry)
   - Performance (Vercel Analytics)
   - User feedback

---

## Post-Launch

### Updates

```bash
# Deploy updates
git push origin main

# Vercel/Netlify will auto-deploy
# Or manually:
vercel --prod
```

### Rollback

```bash
# Vercel
vercel rollback

# Netlify
netlify rollback
```

### Monitoring

```bash
# Check logs
vercel logs

# Check analytics
vercel analytics
```

---

## Cost Estimates

### Free Tier (Hobby Projects)

| Service | Free Tier | Limits |
|---------|-----------|--------|
| **Vercel** | ✅ Free | 100GB bandwidth/month |
| **Netlify** | ✅ Free | 100GB bandwidth/month |
| **GitHub Pages** | ✅ Free | 1GB storage |
| **Railway** | $5/month | 500 hours |

### Paid Tier (Production)

| Service | Cost | Features |
|---------|------|----------|
| **Vercel Pro** | $20/month | Unlimited bandwidth, analytics |
| **Netlify Pro** | $19/month | Unlimited bandwidth, forms |
| **Railway Pro** | $20/month | Dedicated resources |

---

## Backup Strategy

### Database Backup (if using)

```bash
# Automated daily backups
railway backup create --schedule=daily
```

### Code Backup

```bash
# Always use Git
git push origin main
git push backup main  # Secondary remote
```

---

**🚀 Your MIDI Trainer is Ready to Launch!**

Choose your platform, deploy, and start helping people learn piano! 🎹✨

---

## Quick Deploy Commands

```bash
# Vercel (Recommended)
npm install -g vercel
vercel login
vercel --prod

# Netlify
npm install -g netlify-cli
netlify login
netlify deploy --prod

# GitHub Pages
npm run deploy

# Railway
npm install -g @railway/cli
railway login
railway up
```

**That's it! Your app is live! 🎉**
