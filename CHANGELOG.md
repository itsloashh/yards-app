# Yard$ changelog

## v1.20.0 — Seller tools and analytics

**Posting a sale**
- Draft autosave: an unfinished new listing is saved on the phone as you type. Close the app and come back and it's still there, with a "Start over" button.
- Photos upload in the background the moment you pick them, so posting no longer waits on photos.
- Photos are sharper: saved at up to 1400px (was 800px).
- A photo that fails to upload shows "Retry" on that photo. Before, the sale posted without it and nobody was told.
- The form scrolls to the problem when an address or a photo needs fixing.

**Repost**
- Past sales in My Sales have a "Repost" button. It opens a new listing with everything filled in (photos included) except the date.

**Seller analytics (real counts only)**
- My Sales shows, per sale: views, saves, direction taps, shares and route adds, plus totals across all your sales.
- Each action counts once per person per day, and a seller's own taps never count.
- When buyers have saved a sale that isn't boosted, a line under it says how many and suggests boosting.

**Tidy-up**
- The quick filter chips only show on the home feed and the map, so other screens get their space back.

**Database**
- `migrations/020_seller_analytics.sql` — run BEFORE pushing.

## v1.19.0 — Speed and feel

**Faster**
- Live updates now change just the one sale that changed. Before, every change to any sale (even a view count) made every open phone re-download the whole list and re-drop every map pin.
- Sale pages load their own sale directly, so a shared link opens without waiting for the full list, never flashes "Sale Not Found", and sales older than 30 days still open.
- The splash and the Yard$ / Yard$ Golf chooser play once per visit, on the home screen only. Shared links and moving around the app skip them.
- Golf, admin and city landing pages no longer load the sale list, live updates or GPS in the background (so no location prompt on a page from Google).
- The list refreshes itself when the app comes back to the front after being asleep or offline.

**Search and filters (now working)**
- The search box searches titles, descriptions, addresses, categories and featured items.
- The category filter filters.
- New quick filters: Open now, Today, This weekend, Ending soon (closing within 2 hours).
- All of these apply to the map as well as the list.
- A "No Matches" screen with a one-tap "Clear search & filters".

**Map**
- The map is built once and updated in place instead of being rebuilt on every location refresh.
- Pins close together merge into a numbered bubble; tap it to zoom in. Featured (boosted) pins always stay visible on their own.
- Only new pins drop in; existing pins stay put.
- The radius circle is now the right size in kilometres, and hidden for "Anywhere".
- The map fits its space exactly, so the "sales nearby" label is no longer pushed off-screen.
- OpenStreetMap credit restored (their licence requires it).

**Fixes**
- Kilometres: "10 km" now means 10 km (it was filtering about 16 km).
- Posting after 7 pm: you can pick today as the start date again.
- iPhone no longer zooms the page when you tap a form field (fields use 16px text on phones).
- Pinch-to-zoom is allowed again.
- Addresses and descriptions on a sale page can be selected and copied.
- Directions on iPhone, iPad and Mac open Apple Maps.
- Removed the "[debug]" error text from the connection banner.
- A sale page that can't load on bad signal says so and offers "Try again".

**Account**
- "Forgot password?" on the sign-in screen, plus a `/reset-password` page for the email link.

**Setup**
- No database changes.
- Supabase: add `https://shopyards.ca/reset-password` under Authentication → URL Configuration → Redirect URLs.
- One new free library: `leaflet.markercluster` (pin grouping).

## v1.18.1 — Deploy fix

- The v1.18.0 deploy failed on Vercel while downloading fonts from Google (Google changed its font file links, which this version of Next.js can't read). Nothing in the app was at fault, but no new version could go live.
- The two fonts (Outfit and Fraunces) are now bundled with the app in `app/fonts`, so builds no longer depend on Google. Same typefaces, same look.
- No database changes.

## v1.18.0 — Security lockdown

No feature changes. This release closes the holes found in the audit.

**Accounts & money**
- Users can no longer make themselves admin, or edit their own rating, review count or sales count.
- Sellers can no longer give themselves a free boost or fake their view count. Boosts only come from a paid Stripe checkout.
- Boost checkout now checks who you are from your login, not from a value the page sends.
- A repeated Stripe notification can no longer add boost time twice. Boosts only switch on once the payment is actually paid.
- Abandoned checkouts are marked "failed" instead of sitting as "pending" forever (never counted as revenue).
- One account can start at most 8 unpaid checkouts per hour.

**Privacy**
- Emails, phone numbers and home locations are no longer readable by the public. The app reads a safe public profile (name, photo, rating) instead. A seller's phone is still shown under "Contact Seller", only while they have a current sale.

**Code injection**
- Sale titles, addresses and tags are now shown as plain text in map popups.
- The hidden search-engine data on sale pages and city pages can no longer be broken out of.

**Golf**
- Setting up holes and the jackpot hole now requires admin.
- A bag tag always resolves to the newest tournament, so a reused tag number can't send scores to an old event.
- Guessing many different bag tags from one device pauses that device for 10 minutes.

**Abuse limits**
- Photo uploads: images only, 8 MB max, only into your own folder.
- Length limits on sale titles (150), descriptions (5,000), addresses, bios and reviews.
- Views count once per person, per sale, per day.
- Daily caps: 15 reports, 10 new reviews per account.
- The admin "Backfill city data" action now requires an admin login on the server.

**Reliability**
- A crashed screen now shows "Something went wrong — Try again" instead of a blank page. Unknown links show a "Page not found" screen.
- Basic browser security headers on every page.
- "Sales posted" is counted by the database instead of the phone.

**Database**
- `migrations/018_security_lockdown.sql` — run BEFORE pushing.
- `migrations/019_profiles_privacy_lock.sql` — run AFTER the deploy is live.
- New migrations now live in the `migrations/` folder, numbered from 018. Older files are untouched.

**Housekeeping**
- Removed `code.txt` and the old source zip from the repo.
- `package.json` version now matches the release (was stuck at 1.12.0).
