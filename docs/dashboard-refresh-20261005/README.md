# Shared workspace refresh — 5 October 2026

## Scope

All role portals use the refreshed Operations, Company or Developer shell. This includes MD, Finance, Admin, management, accounts, merchandising, planning, CAD, sourcing, stores, sampling, cutting, sewing, finishing, quality and warehouse, plus Developer. Shared sign-in pages use the same typography and control sizes.

- Navy navigation and dialog headers, white title text, teal actions and softly coloured editable fields.
- Consistent readable type, page spacing, cards, tables, buttons and focus rings.
- Desktop and tablet layouts; wide registers scroll within their containers.
- Sidebar preference retained; first-time tablet visitors start with the sidebar collapsed.
- Short Anime.js navigation/dialog effects with reduced-motion support and cleanup. No animation waits on business actions.
- Print layouts, API payloads, authorization, account configuration and stored data are unchanged.

## Validation

- Svelte check: zero errors and warnings. Cloudflare production build succeeds.
- All three edge proxy tests pass.
- Browser checks with an isolated loopback fixture API: desktop overview, sewing, cutting, planning, CAD, finishing, quality, warehouse, inventory, purchases, buyer orders, sampling, materials, Finance, Admin and Developer.
- Checked 1440px desktop, 1280px desktop, 1024px tablet and 768px portrait tablet surfaces. Checked sidebar hide/show, long sample form header, company form alignment, ETF/ESF form, role sign-in, and horizontal register containment.
- At 1024px the sampling filters have two columns and document width stays 1024px. Operational pages tested at 1440px stay within 1440px. Finance at 768px stays within 768px with sidebar shown or hidden.
- Browser reduced-motion emulation: dialog transform is none and transition duration is 0s; emulation restored afterward.

Fixtures and screenshots are outside the deployment repository. The fixture server rejects all writes and has no database or messaging connection. These are interface checks, not a repeat of production business-workflow testing. No production account was used to create or alter records for this release.

Deployment uses the existing private GitHub main branch and automatic Cloudflare Pages build. Live release ID and asset verification are recorded in the local deployment status document after publication.
