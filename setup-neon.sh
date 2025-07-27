# 1. Install Neon CLI (optional)
npm install -g @neondatabase/cli

# 2. Update your environment variables
# Add to .env.local:
# DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
# NEXTAUTH_URL="https://your-app.vercel.app"
# NEXTAUTH_SECRET="your-secret-key"

# 3. Deploy database schema
npx prisma db push

# 4. Seed the database
npx prisma db seed
