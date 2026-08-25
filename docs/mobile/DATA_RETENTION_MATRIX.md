# Mobile Data Retention and Deletion Matrix

**Status:** engineering draft—periods and legal bases require business owner and
qualified Australian legal/privacy approval before external testing.

| Data class | Systems | Current engineering behavior | Required decision/evidence |
|---|---|---|---|
| Account/profile/contact | MongoDB, backups, SMTP history | App-controlled record deleted when no blocker exists; backup copies age out separately | Approved active/closed-account period, backup expiry, email-provider metadata period |
| Mobile sessions and auth challenges | MongoDB, device SecureStore | Revocable; maintenance cron removes expired records; local refresh token cleared on logout/deletion | Exact expired/revoked audit-retention period and lawful basis |
| Security/audit/rate-limit events | MongoDB/monitoring | Privacy-minimized identifiers and security events retained independently of ordinary UI | Approved fraud/security period, access roles, deletion/anonymization rule |
| Licence identity data/media | MongoDB, Cloudinary, Google Vision processing | Restricted media and encrypted/hashed fields; app upload UI remains disabled | Exact active/expired/deleted periods, processor locations, cache/log guarantees, legal basis |
| Listings and ordinary media | MongoDB, Cloudinary, backups | Managed media deleted with account/listing where safe | Orphan cleanup SLA, backup expiry, dispute hold behavior |
| Reservations, quotes, handovers, incidents | MongoDB, Cloudinary, Stripe references | Deletion blocked for unresolved obligations; some records may require retention | Consumer, insurance, evidence, limitation, and tax/accounting periods |
| Payments/payouts/refunds | MongoDB references, Stripe | Stripe is payment truth; provider/legal records may remain | Exact Redrive vs Stripe retention, access, deletion, dispute and tax periods |
| Chats and attachments | MongoDB, Cloudinary, device memory/cache | Participant-authorized; push must not contain message body | Retention after trip/account deletion, safety/dispute hold, attachment expiry, cache policy |
| Notifications and push tokens | MongoDB, Expo, APNs/FCM, OS history | Tokens disabled on logout; payload limited to type + opaque ID | Notification record period, invalid receipt cleanup SLA, provider/OS disclosure |
| Saved searches/favourites | MongoDB, query cache | Removed with account; cache cleared on sign-out | Cache persistence decision and deletion verification |
| Crash/health telemetry | Monitoring provider | Provider not activated until redaction rules are approved | Event schema, sampling, retention, region, access, deletion/export path |
| Email delivery | SMTP provider | Verification/security/operational messages sent through configured provider | Provider logs/content period, suppression list behavior, deletion limits |
| Backups | MongoDB/approved backup storage | Backup/restore scripts exist; restore must target disposable named database | Backup frequency, encryption, immutability, retention, restore RTO/RPO, deletion propagation |

For every row, the final owner-approved record must name: purpose, legal basis,
fields, processor, region, encryption, access roles, active retention, backup
retention, deletion/anonymization action, holds/exceptions, data-subject response,
evidence owner, and last review date.
