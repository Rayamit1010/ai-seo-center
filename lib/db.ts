import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveRuntimeDatabaseUrl() {
  const configured = process.env.DATABASE_URL;
  if (!configured?.startsWith("file:")) {
    return configured;
  }

  if (!process.env.VERCEL) {
    return configured;
  }

  const configuredPath = configured.slice("file:".length);
  const sourceCandidates = [
    path.resolve(process.cwd(), configuredPath),
    path.resolve(process.cwd(), "prisma", path.basename(configuredPath)),
  ];
  const sourcePath = sourceCandidates.find((candidate) => fs.existsSync(candidate));

  if (!sourcePath) {
    console.warn("SQLite source database was not found for Vercel runtime.", {
      configured,
      checked: sourceCandidates,
    });
    return configured;
  }

  const targetDir = path.join(os.tmpdir(), "seo-command-center");
  const targetPath = path.join(targetDir, path.basename(sourcePath));

  fs.mkdirSync(targetDir, { recursive: true });

  if (!fs.existsSync(targetPath)) {
    fs.copyFileSync(sourcePath, targetPath);
  }

  const runtimeUrl = `file:${targetPath}`;
  process.env.DATABASE_URL = runtimeUrl;
  return runtimeUrl;
}

resolveRuntimeDatabaseUrl();

/** Prisma client singleton — prevents multiple instances in development */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
