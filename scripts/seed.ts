/**
 * Standalone seed runner.
 *
 * Usage:
 *   bun run scripts/seed.ts
 *
 * Wipes and re-seeds the Cirkle Social database, then prints the counts.
 */
import { seedDatabase } from "../src/lib/social/seed-data";

async function main() {
  console.log("Seeding Cirkle Social database…");
  const result = await seedDatabase();
  console.log(JSON.stringify(result, null, 2));
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    // Dynamic import so we don't pull Prisma at parse-time of scripts dir.
    const { db } = await import("../src/lib/db");
    await db.$disconnect();
  });
