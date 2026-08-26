# Automatic session timeout

Redrive signs users out after 60 minutes without meaningful activity by
default. Set `SESSION_IDLE_TIMEOUT_MINUTES` to a whole number from 15 through
10,080 to tune the policy without changing code.

## Web sessions

- Every successful sign-in creates a durable `UserSession` record.
- The signed JWT carries the session record identifier, and the server checks
  that durable record on authenticated requests.
- Pointer, keyboard, touch, and wheel interaction updates server activity at
  most once per minute.
- Presence heartbeats, notification polling, and an inactive open tab do not
  keep the session alive.
- Activity is shared between tabs in the same browser so an inactive tab cannot
  sign out a user who is actively using another tab.
- On timeout, the server denies the session, the browser clears its session
  cookie, and the user sees an inactivity message.
- Web sessions also expire absolutely after seven days, even with activity.

## Native sessions

- Mobile access tokens remain short lived and refresh tokens continue rotating.
- Refresh is rejected and the complete token family is revoked when the latest
  session activity is older than the configured timeout.
- Returning the app from the background performs an immediate refresh check.
- A timed-out session clears tokens, user-scoped query caches, and protected
  navigation state before returning to the login screen.

The native refresh token still has a 30-day absolute lifetime, but the shorter
idle timeout is checked first. Reopening an app after days of inactivity cannot
silently restore the old account.

## Deployment

Add the same value to Preview and Production in Vercel, then redeploy. The
default applies if the variable is absent. No Prisma schema change is required
because the existing `UserSession` and `MobileSession` collections contain the
required timestamps and revocation fields.

Changing the value affects the next session check. Reducing it may immediately
sign out sessions whose last activity is older than the new limit.
