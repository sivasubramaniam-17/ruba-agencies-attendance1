import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// Connection pool optimization
prisma.$connect().catch((error) => {
  console.error("Failed to connect to database:", error)
})

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect()
})

// Query optimization middleware
prisma.$use(async (params, next) => {
  const before = Date.now()
  const result = await next(params)
  const after = Date.now()

  if (process.env.NODE_ENV === "development") {
    console.log(`Query ${params.model}.${params.action} took ${after - before}ms`)
  }

  return result
})

export default prisma
