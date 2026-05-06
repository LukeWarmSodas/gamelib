import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const isDev = process.env.NODE_ENV !== "production";

const isWindows = process.platform === "win32";
const envDatabaseUrl = process.env.DATABASE_URL;
const hasContainerPathOnWindows =
  isWindows && typeof envDatabaseUrl === "string" && envDatabaseUrl.includes("/app/data/");

const defaultDatabaseUrl = isDev ? "file:./dev.db" : undefined;
const databaseUrl = hasContainerPathOnWindows
  ? defaultDatabaseUrl
  : envDatabaseUrl ?? defaultDatabaseUrl;

if (databaseUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: databaseUrl,
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

if (isDev) {
  globalForPrisma.prisma = prisma;
}
