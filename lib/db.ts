import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let dbUrl = 'file:./dev.db'

if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  const srcPath = path.join(process.cwd(), 'prisma', 'dev.db')
  const destPath = '/tmp/dev.db'
  
  try {
    // If the destination doesn't exist, copy from source
    if (!fs.existsSync(destPath)) {
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath)
        console.log('Successfully copied SQLite template database to /tmp/dev.db')
      } else {
        console.warn('Source SQLite database template not found at:', srcPath)
      }
    }
    dbUrl = `file:${destPath}`
  } catch (err) {
    console.error('Failed to copy SQLite database to /tmp:', err)
    dbUrl = `file:${srcPath}` // Fallback to read-only template
  }
} else {
  // Local development
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
  dbUrl = `file:${dbPath}`
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
