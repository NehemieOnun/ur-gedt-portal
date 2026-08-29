import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    transactionOptions: {
      // Neon's serverless connections (cold starts + network latency) can make even
      // small transactions take longer than Prisma's 5s default. Give more headroom.
      maxWait: 15000,
      timeout: 20000
    }
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Validates database connectivity. On SQLite in development only, will attempt to
 * auto-heal a corrupted file (delete + rebuild + reseed). On PostgreSQL, or in
 * production, never deletes or destructively rebuilds data — a transient connection
 * error must not trigger data loss.
 */
export async function checkAndHealDatabase() {
  console.log("[DATABASE-HEALER] Running database health check...");
  const isSqlite = (process.env.DATABASE_URL || "").startsWith("file:") || !process.env.DATABASE_URL;
  const canSelfHeal = isSqlite && process.env.NODE_ENV !== "production";

  try {
    // 1. Attempt a simple query to verify database integrity
    await prisma.user.count();
    console.log("[DATABASE-HEALER] Database integrity verified: OK.");

    // 2. SQLite-only: apply stable pragmas to prevent OverlayFS corruption.
    //    Skipped entirely for PostgreSQL, which has no equivalent pragmas.
    if (isSqlite) {
      try {
        await prisma.$queryRawUnsafe("PRAGMA journal_mode=DELETE;");
        await prisma.$queryRawUnsafe("PRAGMA mmap_size=0;");
        await prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL;");
        await prisma.$queryRawUnsafe("PRAGMA busy_timeout=10000;");
        console.log("[DATABASE-HEALER] Stable SQLite pragmas applied successfully.");
      } catch (pragmaErr) {
        console.error("[DATABASE-HEALER] Warning: Failed to apply connection pragmas:", pragmaErr);
      }
    }
  } catch (err: any) {
    const errMsg = String(err.message || err).toLowerCase();
    console.error("[DATABASE-HEALER] Database is unreachable or errored! Error message:", errMsg);

    if (!canSelfHeal) {
      console.error(
        "[DATABASE-HEALER] Self-healing is disabled (PostgreSQL and/or production). " +
        "Refusing to delete or rebuild data automatically. Check DATABASE_URL and DB availability."
      );
      return;
    }

    const isCorruption =
      errMsg.includes("malformed") ||
      errMsg.includes("corrupt") ||
      errMsg.includes("connector") ||
      errMsg.includes("disk image") ||
      errMsg.includes("sqlite");

    if (isCorruption) {
      console.warn("[DATABASE-HEALER] Critical: Detected malformed SQLite file! Initiating self-healing process...");
      
      try {
        // Disconnect current Prisma client to release any file handles
        await prisma.$disconnect();
        
        const dbDir = path.join(process.cwd(), "prisma");
        const filesToDelete = ["dev.db", "dev.db-journal", "dev.db-wal", "dev.db-shm"];
        
        for (const file of filesToDelete) {
          const filePath = path.join(dbDir, file);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              console.log(`[DATABASE-HEALER] Removed file: ${filePath}`);
            } catch (delErr) {
              console.error(`[DATABASE-HEALER] Failed to remove ${file}:`, delErr);
            }
          }
        }

        // Recreate the database schema from scratch
        console.log("[DATABASE-HEALER] Rebuilding database tables via prisma db push...");
        execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });

        // Seed with pristine default data
        console.log("[DATABASE-HEALER] Re-seeding database from pristine legacy JSON backup...");
        execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });

        console.log("[DATABASE-HEALER] Self-healing completed! Database fully restored.");
      } catch (healErr) {
        console.error("[DATABASE-HEALER] CRITICAL: Failed to self-heal the database:", healErr);
      }
    } else {
      console.error("[DATABASE-HEALER] Non-corruption error detected. Skipping database rebuild.");
    }
  }
}

