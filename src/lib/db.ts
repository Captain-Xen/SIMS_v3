import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Note: query logging intentionally disabled — it streamed every SQL
    // statement to stdout (constant IO/CPU churn) in exchange for no benefit
    // in normal operation.
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db