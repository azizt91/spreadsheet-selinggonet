# 🚀 Selinggonet ISP Management - Netlify Deployment Guide

## 📋 Prerequisites
1. GitHub account
2. Netlify account (https://app.netlify.com/)
3. Google Sheets API credentials

## 🔧 Step-by-Step Deployment

### 1. Prepare Your Code
- ✅ All Netlify functions are ready in `netlify/functions/`
- ✅ Configuration files created (`netlify.toml`, `package.json`)
- ✅ Frontend updated to use configurable API URLs

### 2. Set Up Git Repository
```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit - Selinggonet ISP Management System"

# Connect to GitHub repository (create one first on GitHub)
git remote add origin https://github.com/YOUR_USERNAME/selinggonet-isp.git
git branch -M main
git push -u origin main
```

### 3. Deploy to Netlify

#### Option A: GitHub Integration (Recommended)
1. Go to https://app.netlify.com/
2. Click "New site from Git"
3. Choose GitHub and authorize
4. Select your repository
5. Build settings:
   - Build command: `npm install`
   - Publish directory: `.` (current directory)
6. Click "Deploy site"

#### Option B: Manual Upload
1. Zip your entire project folder
2. Go to https://app.netlify.com/
3. Drag and drop your zip file

### 4. Configure Environment Variables
After deployment, set up environment variables in Netlify:

1. Go to Site settings → Environment variables
2. Add the following variable:
   - Key: `GOOGLE_CREDENTIALS`
   - Value: Copy the entire content of your `credentials.json` file

### 5. Update Domain (Optional)
1. Go to Site settings → Domain management
2. Change site name or add custom domain

## 🔒 Security Considerations

### IMPORTANT: Remove credentials.json from Git
Your `credentials.json` file contains sensitive data and should NOT be in your Git repository:

```bash
# Remove from git tracking if accidentally added
git rm --cached credentials.json
git commit -m "Remove credentials file"
```

### Environment Variables Setup
Copy your `credentials.json` content and paste it as the `GOOGLE_CREDENTIALS` environment variable in Netlify.

## 🌐 API Endpoints After Deployment
Your app will automatically use these endpoints:
- Login: `https://your-site.netlify.app/login`
- Customers: `https://your-site.netlify.app/pelanggan`
- Bills: `https://your-site.netlify.app/tagihan`
- Payments: `https://your-site.netlify.app/lunas`
- Expenses: `https://your-site.netlify.app/pengeluaran`

## 🔍 Testing
1. Visit your deployed site
2. Test login functionality
3. Verify all CRUD operations work
4. Check that Google Sheets integration is working

## 🐛 Troubleshooting

### Common Issues:
1. **Functions not working**: Check environment variables are set
2. **CORS errors**: Functions include CORS headers automatically
3. **Build fails**: Ensure all dependencies are in package.json
4. **Sheets API errors**: Verify credentials and API is enabled

### Logs:
- Check Netlify function logs: Site overview → Functions tab
- Browser console for frontend errors

## 📱 Progressive Web App (PWA)
Your app includes PWA features:
- Works offline (cached resources)
- Installable on mobile devices
- Push notification ready

## 🎉 You're Live!
Once deployed, your ISP management system will be accessible worldwide at your Netlify URL!