# Euro Suits ERP

Internal garment manufacturing ERP for office teams: Finance, Merchandising, Sourcing, Sampling, Planning, CAD, Production, Finishing, Warehouse, MD and administrators. Extend the existing product; preserve established data and role restrictions.

## Confirmed interface constraints

- Desktop is the current design and verification target (user confirmed 26 October 2026). Preserve existing smaller-screen behavior; do not expand phone design scope.
- Preserve navy/teal identity, navy form headers with white text, dark readable field labels and soft field backgrounds.
- Keep task forms together with a clear, persistent task heading and save/cancel controls. Use the workspace company implicitly.
- Reuse shared UI and Anime.js motion helpers, respect reduced motion and clean up animations. Business actions must remain immediate.
- Provide keyboard focus continuity, busy states, validation and duplicate-submission protection.

## Enquiries and open costing

Buyer enquiry → fabric response → itemised open costing → MD review → approved booking → one or more production POs.

Merchants can see costing and fabric prices for their assigned buyers; supplier identity and private supplier documents remain hidden. Enforce company, team, buyer and feature access on the server. Keep revision history, explicit currency conversion and server-calculated totals. Multiple POs must not exceed booked quantity.

Implementation assumptions pending further business clarification: merchants provide initial consumption; MD can correct it with a recorded reason. Booking requires an ETF/ESF material and either an approved ET/EST style or a legacy ET/EST reference.

## Source evidence

OPEN COSTING BOOKING ENQUIRY.xlsx; ERP ENQUIRY OPEN COSTING -BOOKING ENQUIRY.eml; complete SH 9 8 and SH 9 9 recording transcripts. The detailed field mapping and test evidence live outside the frontend in work/enquiry-20261006 and ERP docs.

## Export documentation

The `/exports` workspace covers export invoices and shipping fields, multiple receipts and eBRC certificates, scrip/clearance facts, encrypted documents, file reviews, history and Excel statements. Separate `export_*` grants apply with existing company, team, buyer, line and PO restrictions. Existing designation/custom permission arrays are preserved during release.

Outstanding uses exact decimal amounts: invoice less receipts, recorded foreign/local bank charges and finally approved discounts. Gross/net advice and eBRC values are not counted again. Cross-currency settlement requires explicit invoice-currency equivalents. Finance Head reviews shortfall adjustments first; a different MD or Super Admin provides final approval. Historical workbook records are not automatically imported. Detailed mapping and evidence: ERP `docs/export-20261008/`.

## JV and receipts/banking revision

The shared export workspace includes a separate JV register with the eight highlighted workbook fields: JV reference, date, company/party, currency, amount, mode, by/date and Tally reference. New JV entries default to EURO SUITS MFG and HANDO; currency is chosen explicitly. A supporting JV document is required before submission, and an independent MD or Super Admin approves or requests corrections using the existing permissions and versioned discussion. JV records do not enter export outstanding, receipts, eBRCs or discount calculations. Company masters and historical workbook rows are not imported or changed by these defaults.

Receipts & banking presents three compact sections per receipt: Inward remittance advice, Disposal instruction, then Credit advice. A separate Reconciliation register sits alongside Export invoices and JV, listing all export invoices visible to the user with saved invoice/shipping details and eBRC pending or documentation-cleared status. Disposal amount and currency are carried from that receipt’s remittance amount, supporting partial payments. Settlement/additional details and the bank-email/supporting-documents disclosure are removed from Receipts & banking. Existing stored values and history are preserved. New CSS is desktop-only, retaining navy/teal styling, persistent controls, the existing Anime.js helpers and reduced-motion cleanup. INR received amounts and bank charges automatically carry INR when an older receipt has no saved INR currency; no hidden currency selection is required.

When both same-currency FCR and credited bank-advice amounts are entered, foreign charges equal FCR less credited amount using exact decimals; negative differences are rejected. Invoice-currency equivalents remain explicit for cross-currency settlement. Payment applied to the invoice remains manual, and INR advice, GST and allocations are not counted again in outstanding.

Bank email requires effective Finance-family/Super Admin editing and document-download permissions, a saved invoice, selected current attachments, recipient/message review and explicit send confirmation. Invoice versions and file hashes bind the review. Accepted means mail-server acceptance, not bank inbox delivery; Accepted, Sending and Uncertain messages never auto-retry. No payment execution or automatic accounting posting is introduced. Implementation evidence and separately tracked deployment status are in ERP `docs/export-banking-20261010/`.

## Receipt evidence and documentation clearance

Each saved receipt has a stable identifier for its inward advice, disposal instruction and credit advice attachments. Legacy files remain shared invoice documents; their association is never guessed from a receipt’s list position. Invoice, BL/AWB, shipping bill and packing list remain shared evidence and can be used in the existing reviewed bank-email flow.

The Reconciliation register provides eBRC number entry and certificate attachment, preview and confirmed removal. Dedicated evidence actions preserve invoice approval and financial amounts, including after approval; they do not unlock ordinary invoice fields or documents. The user explicitly chose eBRC number and document as the only prerequisites for “Submit — invoice cleared.” This records documentation clearance separately from invoice approval and financial outstanding; it never fabricates payment or bypasses shortfall approvals. Clearance is tied to the saved content and selected active eBRC file. Editing content or reopening invalidates the current clearance while audit history preserves the earlier event. Comments alone do not invalidate it.

Invoice date is distinct from export date. Our remittance reference is distinct from the existing foreign bank reference. New fields never silently replace or reinterpret saved legacy values. The implementation, source mapping, research and separately verified release evidence are under ERP `docs/export-reconciliation-20261010/`.


## Spooly task guidance — 18 October 2026

Existing dashboard Spooly opens a compact, nonmodal task guide. Guides are filtered by effective permissions. Search stays in the browser; optional English/Hindi/Kannada/Bengali explanations send only reviewed static help to the server-side Gemini free-tier connection. No business records, documents, identities or user-entered prompts go to Google. AI cannot create, approve, unlock or change ERP data. Provider limits/failures retain verified guidance. Editing forms keeps a compact help control; links open a separate tab and preserve drafts. Existing mascot preferences, reduced motion and cleanup remain.

## Multiple reporting managers — 22 October 2026

Add User / Edit access supports multiple Reports to selections. The Users register and organisation tree display all assigned managers. Backend schema 27 preserves existing single assignments, validates every manager and prevents reporting cycles under the existing user-write lock. Employee replacement retains other reporting managers; deletion/deactivation guards cover every reporting link. Reporting relationships never grant additional record or feature access. See docs/multiple-reporting-managers/README.md for compatibility and validation boundaries.

## Spooly free chat — 22 October 2026

Spooly retains local guide search and adds a separate Chat mode for short public, non-confidential questions and follow-ups. Sending shares the typed question, up to three recent exchanges and permitted static guides with Gemini; it does not read ERP records or files. The send disclosure explains free-tier data use. Common sensitive patterns are blocked before provider calls, but this is not a guarantee that arbitrary text is non-confidential. Chat is not stored in the database or shared explanation cache. Existing permissions, CSRF, duplicate-click and free provider limits remain. The user explicitly chose to keep billing unlinked: live Search/Maps is unavailable, and nearest-location/verified port-code questions must not be presented as verified answers. See docs/spooly-chat/README.md.


## Material registration — 24 October 2026

Fabric and trim registration/editing fill the desktop viewport (1024px+), keeping the navy heading and actions visible while the body scrolls. Required marks stay beside field titles; 12px row gaps and two/three columns remove excess space without changing field order. India generates ESF references and Dubai generates ETF for both material kinds. Existing references and barcodes stay unchanged, including historical ESTR/ETTR and entered legacy fabric references. Stored origin values remain India/Dubai. Supplier, company and feature permissions, version checks and audit history remain server-enforced.


## Material form motion — 24 October 2026

The existing Anime.js helper provides a 200ms content entrance under stationary material dialog heading/actions and a brief validation-error entrance. Changing registration origin highlights the ESF/ETF preview for 280ms; typing and initial preview rendering do not replay this highlight. Reduced motion disables these effects; forced colors disables the preview highlight. Animation styles/listeners are cleaned up on completion, interruption and unmount. Form fields, dimensions, native modal behavior, duplicate-click locks and business actions remain immediate.


## Clean desktop workspace and sky entrance — 26 October 2026

Shared workspace presentation uses white navigation/cards, dark navy text, teal selected items/actions, explicit focus outlines and compact readable controls. Sign-in routes share SignInShell while the existing SignInForm continues to own password, verification, OTP, busy and error behavior. The public hero retains its garment model and existing workflow links with simpler typography and uncrowded team labels.

Login and hero share an original local CSS sky background. A decorative cyan/warm pointer light fades in through the existing Anime.js helper, schedules at most one coordinate update per frame, and cannot intercept interaction. Reduced motion, forced colors and coarse pointers disable it; the hero pause control, document visibility and component destruction stop it. No external background requests or additional tracking are introduced. Existing account permissions, record workflows and desktop form contracts are unchanged.

27 October 2026: desktop field values and labels use near-black (#111111); helper text uses #374151 and placeholders #4b5563. Read-only values stay dark, disabled controls retain readable text and their state styling, and forced colors uses system text colors. Button labels and navy task headings keep their existing contrast.

## Sampling requests and INTIMATION — 5 November 2026

Desktop sample-request and intimation forms use the available viewport, with a persistent navy heading and footer actions around a scrolling body; request fields use three compact columns. Trims, EST and Files sections support choosing or dropping up to 10 files per section, 10 MB each, within the existing 30-document request/indent limit. INTIMATION is a separate Manufacturing sidebar section and retains its Mail attachment uploader; sample-indent creation has no Mail attachment uploader. INTIMATION captures brand/buyer, sample type, style, sizes, quantities, required date, pasted buyer email and encrypted mail attachments. Generating a sample indent opens the same versioned request with its saved instructions and files; normal MD approval assigns one indent per garment and clears the pending queue. Eligible dashboards show a red pending count, refresh it every 30 seconds and open the INTIMATION section directly. Existing company, team, buyer, feature and document permissions, history and approval controls continue to apply. This extends the established desktop presentation and existing sampling workflow.

Sampling follow-up: INTIMATION is a dedicated Manufacturing sidebar section. Sample-indent creation contains Trims, EST and Files upload areas; Mail attachment remains in INTIMATION. Selected files visibly wait for form save. Preview opens in a native in-page modal: PDF pages render on a local PDF.js canvas, images render locally, and email/text or bounded DOCX/XLSX text previews remain inert. Object URLs, PDF tasks and requests are cleaned up when the viewer closes. Super Admin sampling document checks use its existing administrator authority; ordinary document restrictions remain effective.
