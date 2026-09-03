# Backups & restore-drill

## 1. Enable Atlas backups (one-time, dashboard)

MongoDB Atlas backup configuration is not expressible in code — set it once in
the Atlas UI:

1. **Atlas → Clusters → (production cluster) → Backup → Enable Cloud Backup.**
2. Set the **snapshot schedule**: hourly snapshots, 2-day retention; daily, 7-day;
   weekly, 4-week; monthly, 12-month. (Atlas default policy is fine for us.)
3. Turn on **Continuous Cloud Backup** (point-in-time restore) — this is what
   lets us roll back to any second within the retention window after a bad
   deploy or a destructive bug.
4. Confirm the cluster tier is **M10 or above** (M0/M2/M5 shared tiers do not
   support Cloud Backup).

## 2. Monthly automated restore-drill (CI)

Backups that have never been restored are not backups. `.github/workflows/backup-restore-drill.yml`
runs `scripts/restore-drill.mjs` on the 1st of every month (and on demand via
**Actions → Backup restore-drill → Run workflow**).

The drill:

1. `mongodump`s the production database from a **read-only** source URI.
2. `mongorestore`s it into a uniquely-named scratch database on a disposable
   scratch cluster.
3. Verifies the restore: collection count, presence of the core collections
   (`User`, `Listing`, `Reservation`, `Account`), non-zero document totals,
   index counts, and that a real `User` document reads back end-to-end.
4. Drops the scratch database.

A failure emits a GitHub `::error::` annotation and fails the workflow, which
notifies whoever owns the Actions notifications for the repo.

### Required GitHub Actions secrets

| Secret | What it is |
| --- | --- |
| `RESTORE_DRILL_SOURCE_URI` | `mongodb+srv://…` for a **read-only** user against the production cluster (ideally pinned to a secondary with `readPreference=secondary`), or an Atlas backup-download connection string. |
| `RESTORE_DRILL_TARGET_URI` | `mongodb+srv://…` for a small, dedicated **scratch** cluster used only for drills. Never point this at production or staging. |

Optional overrides (env): `RESTORE_DRILL_SOURCE_DB`, `RESTORE_DRILL_MIN_COLLECTIONS`.

### Running it locally

```bash
export RESTORE_DRILL_SOURCE_URI="mongodb+srv://readonly:…@prod.xxxx.mongodb.net/redrive"
export RESTORE_DRILL_TARGET_URI="mongodb+srv://drill:…@scratch.xxxx.mongodb.net/"
node scripts/restore-drill.mjs
```

Needs `mongodump`/`mongorestore` (`brew install mongodb-database-tools` / the
`.deb` the workflow installs).

## 3. If the drill fails

1. Check whether the failure is the drill infrastructure (scratch cluster down,
   secret rotated) or a real backup problem.
2. If real: open the Atlas Backup tab, confirm recent snapshots exist and their
   status is `completed`. Try a manual restore of the latest snapshot to the
   scratch cluster from the UI.
3. Escalate to the infra owner if snapshots are missing or stale — the RPO is
   broken until fixed.
