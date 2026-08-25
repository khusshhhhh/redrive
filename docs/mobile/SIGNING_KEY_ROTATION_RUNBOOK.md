# Mobile Signing and Session-Key Rotation Runbook

This runbook separates three unrelated key systems. Never solve one by rotating
another: Redrive API access-token keys, Apple distribution/signing credentials,
and Android app-signing/upload keys.

## A. Mobile API access-token signing key

1. Open an approved change record. Record environment, current `kid`, proposed
   `kid`, owner, start time, rollback owner, and the maximum access-token TTL.
2. Generate a new RSA key pair in the approved secret-management process. Never
   generate it in the repository or paste the private key into chat/tickets.
3. Add the **new public key** to `MOBILE_ACCESS_TOKEN_PUBLIC_KEYS` while keeping
   the current public key. Deploy this verifier-only change first.
4. Confirm all instances accept test tokens signed by both old and new keys and
   still reject unknown key IDs, wrong issuer/audience, and altered signatures.
5. Add the new private key to secret storage and switch
   `MOBILE_ACCESS_TOKEN_KEY_ID`/private key together. Deploy and confirm new
   tokens carry the new `kid`.
6. Observe authentication errors for at least the maximum access-token lifetime
   plus deployment propagation margin.
7. Remove the old private key immediately after issuance has stopped. Remove the
   old public key only after no valid old-key token can remain.
8. Preserve audit evidence without key material. Roll back by restoring issuance
   to the old key only while its private key remains approved and uncompromised.
9. If compromise is suspected, do not use a normal overlap: switch issuance,
   remove the compromised public key, revoke mobile sessions as required, force
   sign-in, notify incident owners, and preserve evidence.

## B. Android app signing and upload keys

1. Determine whether the affected key is the Google Play App Signing key or the
   separate upload key. They have different recovery/rotation procedures.
2. Record the current and next SHA-256 fingerprints. Add both fingerprints to
   `MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS` and verify `assetlinks.json` before
   distributing a build signed by the next key.
3. Use the organization-owned Play Console/EAS credential workflow. Do not
   export keystores into the repository or ordinary workstation folders.
4. Test App Links with a release-signed internal build and Play-installed build.
5. After the store-controlled transition and installed-base plan permit it,
   remove the retired fingerprint from the association response.
6. For a lost upload key, use the Play Console upload-key reset process; do not
   change package name or create a second production app as an improvised fix.

## C. Apple distribution credentials and associated domains

1. Identify whether the event concerns a distribution certificate, provisioning
   profile, APNs key, merchant/payment certificate, or Apple account access.
2. Confirm the production bundle ID remains `au.com.redrive.app` and the Team ID
   remains correct in the AASA response.
3. Rotate/revoke only through the organization-owned Apple Developer account and
   EAS credential workflow with two authorized people for recovery assurance.
4. Rebuild the native binary when entitlements, signing, APNs, merchant identity,
   or associated domains change. An over-the-air update is insufficient.
5. Install the signed build fresh and retest Universal Links, push, Stripe return,
   and store/TestFlight processing before rollout.

## Lost device and logout-all response

1. From a trusted session, use **Profile → Security and devices** to revoke the
   named device, or **Sign out everywhere** when device identity is uncertain.
2. Confirm the relevant `MobileSession` family is revoked and matching push token
   rows have `disabledAt` set. Do not rely only on local app deletion.
3. Change the account password if credentials may be known; this revokes web and
   mobile sessions. Secure the email account first if email compromise is likely.
4. Review security audit events for unexpected login, refresh reuse, password,
   OTP, or device changes. Escalate anomalies under the incident plan.
5. The app should clear local refresh/session values. A stolen offline device may
   retain encrypted local material until it reconnects, but server revocation
   prevents new access/refresh when the backend receives the request.
