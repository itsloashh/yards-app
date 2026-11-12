# Yard$ changelog

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
