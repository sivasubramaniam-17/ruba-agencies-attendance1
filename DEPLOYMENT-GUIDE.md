# 🚀 Deployment Guide - Ruba Attendance System

## Step 1: Create Neon Database (FREE)

1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub
3. Create new project
4. Copy the connection string

## Step 2: Deploy to Vercel

1. Push code to GitHub
2. Connect GitHub to Vercel
3. Import your repository
4. Add environment variables:

\`\`\`env
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="your-super-secret-key-here"
\`\`\`

## Step 3: Setup Database

\`\`\`bash
# After deployment, run these commands:
npx prisma db push
npx prisma db seed
\`\`\`

## Step 4: Access Your App

- **Web**: https://your-app.vercel.app
- **Mobile**: Install as PWA from browser
- **Desktop**: Install from Chrome/Edge

## Default Login Credentials

**Admin:**
- Email: admin@rubaagencies.com
- Password: admin123

**Employee:**
- Email: employee@rubaagencies.com
- Password: employee123

## Features Available

✅ Employee Management
✅ Attendance Tracking
✅ Leave Management
✅ Salary Management
✅ Reports & Analytics
✅ Mobile PWA
✅ Real-time Updates
✅ Offline Support

## Support

For any issues, check the logs in Vercel dashboard or contact support.
