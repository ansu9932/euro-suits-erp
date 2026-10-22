# Spooly free chat

Open Spooly and choose Chat. Guides remain independently available, and guide search stays in the browser. Answers normally use 1–3 sentences/bullets under 70 words; the backend rejects answers over100 whitespace-delimited words or1600 Unicode characters. English, Hindi, Kannada and Bengali are supported. New chat clears the visible conversation; closing the panel destroys its state. Switching to Guides preserves the current chat while the panel remains open.

## Privacy and permissions

Sending explicitly shares the question (up to1000 characters), up to3 complete recent exchanges and permitted reviewed guides with Google Gemini. Free-tier content may be used to improve Google's products; the composer discloses this before Send. Never paste confidential records or personal details. Pattern checks catch common credentials, contact details and long numeric identifiers; they do not reliably recognize every kind of confidential text. Blocked and failed exchanges are omitted from later context. No uploads, screen/DOM reading, ERP database retrieval, record actions, function execution or external URLs are enabled.

POST /api/assistant/chat is authenticated and uses existing CSRF, active-account/renewal restrictions and duplicate-request middleware. Guides are filtered on the backend for each user. The provider gets no automatic account identity or role data. Conversation text is not logged, written to the database or stored in Redis; Redis retains only rate counters, busy leases and opaque action reservations. Ordinary HTTP request diagnostics remain. Answers render as text and only server-authorized guide IDs become guide buttons.

## Free-tier boundary

The user chose free chat without live lookup on22October2026. No billing, provider/model fallback or quotas were changed. Chat shares the existing6requests/user/minute and3new provider calls/minute plus20/24hours globally with guide explanations. No shared chat cache or automatic retries. Provider calls have a15-second timeout; quota/provider failures preserve Guides and do not fabricate an answer.

Live Google Search/Maps is not included in the current free API tier. Nearest ports/addresses, distances and verified port codes are unavailable; explicit location/code patterns return a local explanation without calling Gemini. The model also classifies other requests needing live/current information or private ERP records and those answers are replaced with fixed limitations. AI classification is not a guarantee of factual accuracy. General port/ICD concepts remain valid chat topics.

References: https://ai.google.dev/gemini-api/docs/pricing and https://ai.google.dev/gemini-api/terms . REST generation/schema documentation was checked through Context7.

## Validation and recovery

Four frontend helper tests, the Go suite (including isolated Redis quota/lease/privacy tests) and26actual-route Chromium checks passed. Browser coverage includes bounded follow-ups, guide navigation, language selection, failure recovery, sensitive-context exclusion, plain-text output, clearing/reopening, keyboard close, reduced motion and composer visibility at1440/1163/768px. All UI/API fixtures are synthetic. A single synthetic Gemini connectivity/schema probe from Hostinger succeeded and reserved one request in the existing global free allowance. No production user/company records or employee messages were involved.

Release build and production verification are recorded in the ERP deployment status documents after deployment. Roll back only the frontend release and corresponding backend image/source; no migration/database restore is needed. SPOOLY_FREE_TIER_CONFIRMED=false disables provider AI while Guides remain usable.
