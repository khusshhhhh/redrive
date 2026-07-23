# 🐛 REDRIVE Bug Report

## Summary

This report tracks bugs identified in the REDRIVE vehicle sharing platform. Updated after a full stabilization pass: config fixes, removal of the broken dual-database subsystem, dark/light theme support, responsive fixes, navigation fixes, and an env var audit.

---

## ✅ Resolved

1. **Build failure** — `tsconfig.json` had `ignoreDeprecations: "6.0"`, an invalid value for the installed `typescript@5.7.3` (only `"5.0"` is accepted pre-6.0). Fixed to `"5.0"`.
2. **Tailwind v3/v4 config conflict** — `tailwindcss@3` (used by `tailwind.config.ts` and the `@tailwind` directives in `globals.css`) coexisted with the v4-only `@tailwindcss/postcss` plugin and two competing `postcss.config.*` files. Removed the v4 plugin and the duplicate config; `darkMode: "class"` added to the single remaining `tailwind.config.ts`.
3. **Broken "dual database" (Supabase) subsystem — this was the actual cause of the reported "no delete function" bug.** `/api/listings-dual/[id]` was called by delete-listing, edit-utility, confirm-reservation, and the image gallery, but no `[id]` route existed for it (404 on every call), while a fully working plain Prisma/Mongo route sat unused right next to it. Removed the entire Supabase/dual-database subsystem (`app/libs/{supabase,supabase-service,dual-database,migration-helper,error-handling}.ts`, the `-dual` API routes, `supabase/schema.sql`, the Supabase setup docs) and rewired every caller to the working plain routes.
4. **Cloudinary secret exposure risk** — `app/api/upload/route.ts` read `NEXT_PUBLIC_CLOUDINARY_API_SECRET`; any `NEXT_PUBLIC_*` var gets inlined into client bundles by Next.js. Renamed to server-only `CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET`.
5. **Hardcoded JWT fallback secret** — `auth-middleware.ts` and `api/auth/login/route.ts` fell back to the literal string `"fallback-secret"` when `NEXTAUTH_SECRET` was unset. Now fails loudly instead.
6. **Missing `.env.example`** — the repo had an empty `.env` and no documentation of required variables (referenced by `SUPABASE_SETUP.md` but never committed). Added `.env.example` documenting every variable the code actually reads.
7. **Zero dark mode support** — added `next-themes`, a navbar theme toggle, and a full `dark:` class sweep across every page and component.
8. **Mobile navigation gap** — the logo was `hidden md:block` (invisible below 768px, leaving mobile users with no way back to `/`). Now visible at all breakpoints with responsive sizing.
9. **Dead upload path** — `app/hooks/useCloudinaryUpload.ts` sent a JSON body to a route that expects `FormData`, and was unused dead code (the real upload path is `next-cloudinary`'s `CldUploadWidget` + a local `uploadImageToCloudinary` in `RentModal.tsx`). Deleted.
10. **Various `any` types, unused imports/vars, missing `react-hooks/exhaustive-deps`** in touched files — `npm run lint` is now fully clean (0 warnings, 0 errors).
11. **Responsive bugs** — fixed-height `ListingMap.tsx` (`400px` → `45vh`, matching `Map.tsx`), fixed-pixel `RentModal.tsx` image thumbnails (now fluid `aspect-square`), unclamped `ListingReservation.tsx` insurance popover (now capped to viewport width), inconsistent grid breakpoints across Trips/Properties/Reservations (unified), tight sub-`md` padding on the listing detail page.
12. **Dead-end homepage cards** — "Explore Categories" and "Popular Destinations" on the homepage had no click handlers and used category labels (`"Cars"`) that didn't match real filter values (`"Car"`). Now linked to real `/?category=`/`/?state=` filters with correct values.
13. **Mobile navbar overflow (found via live browser testing)** — on screens ≤400px wide, the search bar's `w-full` inner box had no shrinkable ancestor, pushing the notification bell/theme toggle/user menu completely off-screen to the right (invisible, unreachable). Fixed by giving the Logo/Search/UserMenu row proper `flex-1 min-w-0` / `shrink-0` constraints.
14. **Modal title/close-button collision on narrow screens (found via live browser testing)** — long modal titles (e.g. "Welcome back to Redrive!") could visually overlap the absolutely-positioned close (X) button. Fixed with `truncate` + padding on the title and repositioning the button.
15. **Dark-mode logo illegibility** — the logo PNG is dark artwork, nearly invisible on dark backgrounds. Fixed with a `dark:invert` CSS filter.

---

## ⚠️ Known limitations (not fixed — out of scope for this pass)

- **`SmartRecommendations.tsx`** renders entirely hardcoded mock listings (fake IDs, fake Unsplash images) rather than a real recommendation engine. It's presented as a demo component; wiring it to real data/an actual algorithm would be a separate feature project.
- **Dual auth mechanisms** — `pages/api/auth/[...nextauth].ts` (NextAuth, used by the browser app) and `app/api/auth/login/route.ts` (a parallel bcrypt+JWT endpoint used only by `testsprite_tests/*`) still both exist. Left in place so the test suite keeps working, but they don't share session state.
- **react-select theming** (`CountrySelect.tsx`, `StateSelector.tsx`, `SuburbSelector.tsx`) uses the library's own `styles`/`theme` API rather than Tailwind classes; dark-mode styling for these was left as a `// TODO` rather than guessed at.
- **Deprecated/vulnerable dependencies** — `npm audit` still reports pre-existing vulnerabilities in transitive dependencies. Run `npm audit fix` cautiously (some fixes may be breaking) if you want to address these.

---

*Last updated after the stabilization/dark-mode/responsive pass described above.*
