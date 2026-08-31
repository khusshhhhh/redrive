# Listing walkaround video — upload options

## Purpose

Hosts want to add a short walkaround video to a listing, and guests want to watch
one before requesting. This document compares the realistic ways to let a host
**upload** a video from the Redrive web app and play it back on the listing page.

It is a decision aid only. No video upload is implemented yet — the schema, the
host-flow step and the listing embed described below are sketches, not shipped code.

## What Redrive already has for media

Images go through **one server-side route**, `app/api/upload/route.ts`:

- The client (`ImageUpload.tsx` / `ListingPhotoManager.tsx`) sends a `multipart/form-data`
  POST with the file and a `folder` name.
- The route authenticates the session, enforces a **10 MB** cap
  (`MAX_UPLOAD_BYTES`), runs `sanitizeImage()` (decode + re-encode to strip
  anything hidden in the file), then streams the buffer to Cloudinary with
  `cloudinary.uploader.upload_stream({ resource_type: "image", folder: "redrive/<folder>", ... })`.
- It returns `{ url, publicId }`; the URL is stored on the `Listing` (`imageSrcs[]`,
  `regoImage`).

Env already present: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
`CLOUDINARY_API_SECRET`.

Key constraint: **the file currently passes through the Next.js server process.**
That is fine for 10 MB images. Videos are 10–200 MB+, so the shortlist below is
really about *where the bytes go* and *who transcodes them*.

---

## Option 1 — Cloudinary video (recommended for now)

Reuse the existing vendor, auth and CDN. Two ways to get the bytes in:

**1a. Through our route (smallest change).** Add `resource_type: "video"` support to
`app/api/upload/route.ts`, a `listing-videos` folder, a raised cap (~100 MB), and a
duration guard (reject > ~90 s using the `duration` field Cloudinary returns).
Skip `sanitizeImage()` for video; rely on Cloudinary's `allowed_formats`
(`mp4`, `mov`, `webm`) and its own processing. Store `videoUrl` + `videoPublicId`
on the `Listing`.

Risk: a 100 MB upload holds a serverless function/socket open for the whole
transfer. On Vercel that can bump against function duration and body-size limits.
Acceptable at low volume; revisit if it becomes common.

**1b. Signed direct browser upload (better).** Add a tiny route that returns a
**signed upload signature** (`cloudinary.utils.api_sign_request`) scoped to the
`listing-videos` folder and `resource_type=video`. The browser POSTs the file
straight to `https://api.cloudinary.com/v1_1/<cloud>/video/upload` — bytes never
touch our server. On success the client sends `{ publicId }` back to a route that
validates it (fetch the asset via Admin API, check folder, duration, size) and
writes it to the `Listing`.

Playback: Cloudinary generates HLS/DASH on demand. Use an adaptive URL
(`.../video/upload/f_auto:video,q_auto/<publicId>.m3u8`) in a `<video>` tag with
`hls.js`, or the simpler MP4 rendition
(`.../video/upload/f_auto,q_auto,w_1280/<publicId>.mp4`) for a plain `<video>`
with no extra library. Cloudinary also gives you a poster frame
(`.../video/upload/so_2/<publicId>.jpg`).

| | |
|---|---|
| **Pros** | Same vendor/keys/CDN as images; adaptive streaming and poster frames for free; 1b keeps large files off our server; moderation add-ons available. |
| **Cons** | Video storage + egress is materially more expensive than images; ~100 MB practical ceiling on 1a; short transcoding delay before HLS is ready; still a general media host, not video-specialised. |
| **Effort** | 1a: ~half a day. 1b: ~1–1.5 days (signature route + validation route + client). |

## Option 2 — Mux (recommended if video becomes a core feature)

Purpose-built video pipeline.

1. Server calls `POST /video/uploads` (Mux SDK) → returns a one-time direct-upload URL.
2. Browser PUTs the file to that URL (bytes bypass our server).
3. Mux transcodes; a `video.asset.ready` **webhook** hits `app/api/webhooks/mux`
   with the `playback_id` → store it on the `Listing`.
4. Playback with `@mux/mux-player-react` (`<MuxPlayer playbackId={...} />`) — HLS,
   adaptive, thumbnails, and per-title view analytics built in.

| | |
|---|---|
| **Pros** | Best playback quality and UX; automatic thumbnails/storyboards; signed playback URLs; engagement analytics; scales without us thinking about it. |
| **Cons** | New vendor + new secrets (`MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, webhook secret); webhook infra and the "asset processing" waiting state to handle in UI; another line item. |
| **Effort** | ~2–3 days (upload route, webhook handler + signature verification, player, processing-state UI). |

## Option 3 — S3 (or R2) presigned PUT + optional transcode

Cheapest storage at scale, most control, most to build.

1. Server issues a presigned `PUT` URL (`@aws-sdk/client-s3` + `getSignedUrl`),
   key like `listing-videos/<listingId>/<uuid>.mp4`, content-type and
   max-size conditions attached.
2. Browser PUTs directly to S3.
3. Either serve the raw MP4 via CloudFront (no adaptive bitrate, one quality), or
   wire an **S3 event → AWS MediaConvert** job to produce HLS renditions and a
   poster, then store the manifest URL.

| | |
|---|---|
| **Pros** | Lowest cost per GB stored/served; full control over lifecycle, retention, signing; no per-minute encoding vendor markup. |
| **Cons** | We own transcoding/packaging, poster generation, format validation, and the moderation story; MediaConvert is fiddly; more moving parts to monitor. Cloudflare R2 removes egress cost but you still own transcoding. |
| **Effort** | Raw MP4 only: ~1–2 days. With MediaConvert HLS: ~1 week. |

## Option 4 — External unlisted link (YouTube / Vimeo)

No upload at all: host pastes a URL, we validate it's a YouTube/Vimeo link and
render the provider's `<iframe>` embed.

| | |
|---|---|
| **Pros** | Zero infra, zero storage/egress cost, ~1–2 hours of work. |
| **Cons** | Third-party branding, "up next" recommendations and possible ads on our listing page; weaker trust signal (feels off-platform); depends on the host already having a YouTube/Vimeo account; embeds can be geo/privacy-blocked; not really "upload in our app". |

---

## Recommendation

- **Now:** Option **1 (Cloudinary video)**, starting with **1a** if we want it live
  this week, or going straight to **1b** if we can spend the extra day — 1b is the
  right shape long-term and avoids large uploads through the server.
- **Later, if walkaround video proves valuable:** migrate playback to **Option 2
  (Mux)**. The `Listing` fields below are provider-agnostic enough that a migration
  is a data backfill plus a player swap.
- Avoid Option 3 until video volume is large enough that Cloudinary/Mux egress is a
  real cost line. Avoid Option 4 except as a throwaway experiment.

## Sketch — how it would slot into the codebase

**Schema** (`prisma/schema.prisma`, `model Listing`):

```prisma
videoUrl       String?   // playable URL (Cloudinary .m3u8/.mp4) or Mux playback id
videoPublicId  String?   // Cloudinary public_id / Mux asset id, for deletion & re-checks
videoPosterUrl String?   // generated poster frame
```

Add `videoUrl`, `videoPublicId`, `videoPosterUrl` to `LISTING_EXTRA_FIELDS` /
`sanitizeListingExtras` in `app/libs/listingExtras.ts` so the create/update routes
pick them up with no route changes.

**Client** — a `VideoUpload.tsx` mirroring `ImageUpload.tsx`: file picker →
(1a) POST to `/api/upload` with `folder: "listing-videos"`, or (1b) fetch a
signature, upload to Cloudinary, POST the `publicId` back for validation → on
success call `onChange({ url, publicId, posterUrl })`.

**Host flow** (`app/host/HostFlow.tsx`) — add a `video` step in the "Make it stand
out" phase (`PHASES[1].steps`), between `photos` and `title`, rendering
`<VideoUpload />`. It is optional; no `validateStep` entry.

**Edit page** (`app/edit-utility/[listingId]/page.tsx`) — one more card with the
same `<VideoUpload />` plus a "Remove video" button.

**Listing page** — in `app/components/listings/ListingHead.tsx` (or a new
`ListingVideo.tsx` rendered by `ListingClient.tsx` above `ListingInfo`):

```tsx
{listing.videoUrl && (
  <video
    controls
    playsInline
    preload="none"
    poster={listing.videoPosterUrl ?? undefined}
    className="w-full rounded-xl border border-hairline-soft bg-black"
    src={listing.videoUrl}          // MP4 rendition; use hls.js for the .m3u8 variant
  />
)}
```

**Deletion** — when a host removes the video or deletes the listing, call
`cloudinary.uploader.destroy(videoPublicId, { resource_type: "video" })` (or the
Mux asset delete) so storage is reclaimed. The listing `DELETE` route in
`app/api/listings/[listingId]/route.ts` is the place for it.

**Moderation** — video is higher-risk than photos. At minimum, keep the video
hidden behind the same "listing pending review" gate registration already uses, or
enable Cloudinary/Mux automated moderation add-ons before showing it publicly.
