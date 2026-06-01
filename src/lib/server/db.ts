import { PrismaClient } from '@prisma/client';
import { dev } from '$app/environment';

/**
 * Singleton Prisma client.
 *
 * In development, SvelteKit's HMR re-evaluates modules which can spawn many
 * Prisma instances and exhaust the database connection pool. We cache the
 * client on `globalThis` to survive reloads. In production a single module
 * instance is created normally.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: dev ? ['query', 'warn', 'error'] : ['warn', 'error']
  });

if (dev) globalForPrisma.prisma = db;
