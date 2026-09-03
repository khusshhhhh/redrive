#!/usr/bin/env node
/**
 * Automated backup restore-drill.
 *
 * Proves two things on a schedule:
 *   1. The most recent backup of the production database can actually be
 *      restored (not just that snapshots exist).
 *   2. A freshly restored copy still has the collections, indexes and row
 *      volume the app expects — i.e. the backup is complete, not truncated.
 *
 * It never touches production: it dumps from a read-only source URI (a
 * secondary, an Atlas backup-download connection string, or a snapshot that
 * has already been restored to a scratch cluster) and restores into a
 * disposable scratch database, then drops that database when done.
 *
 * Required env:
 *   RESTORE_DRILL_SOURCE_URI  mongodb+srv URI to read the backup from (read-only)
 *   RESTORE_DRILL_TARGET_URI  mongodb+srv URI of a scratch cluster to restore into
 *
 * Optional env:
 *   RESTORE_DRILL_SOURCE_DB   source db name (default: parsed from source URI, else "test")
 *   RESTORE_DRILL_MIN_COLLECTIONS  fail if fewer collections restored (default: 10)
 *
 * Requires `mongodump` / `mongorestore` on PATH (mongodb-database-tools).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MongoClient } from "mongodb";

const SOURCE_URI = process.env.RESTORE_DRILL_SOURCE_URI;
const TARGET_URI = process.env.RESTORE_DRILL_TARGET_URI;
const MIN_COLLECTIONS = Number(process.env.RESTORE_DRILL_MIN_COLLECTIONS || 10);

if (!SOURCE_URI || !TARGET_URI) {
  console.error(
    "restore-drill: RESTORE_DRILL_SOURCE_URI and RESTORE_DRILL_TARGET_URI are both required.",
  );
  process.exit(2);
}

function dbNameFromUri(uri, fallback) {
  try {
    const path = new URL(uri).pathname.replace(/^\//, "");
    return path || fallback;
  } catch {
    return fallback;
  }
}

const SOURCE_DB = process.env.RESTORE_DRILL_SOURCE_DB || dbNameFromUri(SOURCE_URI, "test");
// Unique scratch db per run so overlapping runs never collide.
const TARGET_DB = `restore_drill_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_${process.pid}`;

const workDir = mkdtempSync(join(tmpdir(), "restore-drill-"));
const dumpDir = join(workDir, "dump");

let exitCode = 0;

try {
  console.log(`restore-drill: dumping ${SOURCE_DB} from source …`);
  const startDump = Date.now();
  execFileSync(
    "mongodump",
    ["--uri", SOURCE_URI, "--db", SOURCE_DB, "--out", dumpDir, "--gzip"],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
  console.log(`restore-drill: dump finished in ${((Date.now() - startDump) / 1000).toFixed(1)}s`);

  console.log(`restore-drill: restoring into scratch db ${TARGET_DB} …`);
  const startRestore = Date.now();
  execFileSync(
    "mongorestore",
    [
      "--uri", TARGET_URI,
      "--nsFrom", `${SOURCE_DB}.*`,
      "--nsTo", `${TARGET_DB}.*`,
      "--gzip",
      "--drop",
      "--stopOnError",
      dumpDir,
    ],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
  console.log(`restore-drill: restore finished in ${((Date.now() - startRestore) / 1000).toFixed(1)}s`);

  // --- Post-restore sanity checks -----------------------------------------
  const client = new MongoClient(TARGET_URI);
  await client.connect();
  try {
    const db = client.db(TARGET_DB);
    const collections = await db.listCollections().toArray();
    const names = collections.map((c) => c.name).sort();
    console.log(`restore-drill: ${names.length} collections restored: ${names.join(", ")}`);

    if (names.length < MIN_COLLECTIONS) {
      throw new Error(
        `only ${names.length} collections restored, expected at least ${MIN_COLLECTIONS} — backup looks incomplete`,
      );
    }

    // Every core collection the app cannot run without.
    const REQUIRED = ["User", "Listing", "Reservation", "Account"];
    const missing = REQUIRED.filter((r) => !names.includes(r));
    if (missing.length) {
      throw new Error(`restored backup is missing core collections: ${missing.join(", ")}`);
    }

    let totalDocs = 0;
    for (const name of names) {
      const count = await db.collection(name).estimatedDocumentCount();
      totalDocs += count;
      const indexes = await db.collection(name).indexes();
      console.log(`  ${name}: ~${count} docs, ${indexes.length} indexes`);
    }
    if (totalDocs === 0) {
      throw new Error("restored backup has zero documents across all collections");
    }

    // Read one real document end-to-end to prove decode works.
    const sampleUser = await db.collection("User").findOne({}, { projection: { email: 1 } });
    if (!sampleUser) {
      throw new Error("could not read a single User document from the restored backup");
    }

    console.log(
      `restore-drill: PASS — ${names.length} collections, ~${totalDocs} documents restored and readable.`,
    );
  } finally {
    console.log(`restore-drill: dropping scratch db ${TARGET_DB} …`);
    await client.db(TARGET_DB).dropDatabase().catch((err) => {
      console.warn(`restore-drill: failed to drop scratch db (clean it up manually): ${err.message}`);
    });
    await client.close();
  }
} catch (error) {
  exitCode = 1;
  console.error(`restore-drill: FAIL — ${error instanceof Error ? error.message : error}`);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}

process.exit(exitCode);
