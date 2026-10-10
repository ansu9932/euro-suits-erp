# Euro Suits ERP

Internal garment manufacturing ERP for office teams: Finance, Merchandising, Sourcing, Sampling, Planning, CAD, Production, Finishing, Warehouse, MD and administrators. Extend the existing product; preserve established data and role restrictions.

## Confirmed interface constraints

- Desktop and tablet are the current supported design targets.
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

Receipts & banking presents the working order as six compact stages: foreign receipt, forex instruction, documents/bank email, foreign advice, INR advice, then account allocations/conversion/GST. New CSS is desktop-only, retaining navy/teal styling, persistent controls, the existing Anime.js helpers and reduced-motion cleanup. Legacy supplementary receipt fields remain available.

When both same-currency FCR and credited bank-advice amounts are entered, foreign charges equal FCR less credited amount using exact decimals; negative differences are rejected. Invoice-currency equivalents remain explicit for cross-currency settlement. Payment applied to the invoice remains manual, and INR advice, GST and allocations are not counted again in outstanding.

Bank email requires effective Finance-family/Super Admin editing and document-download permissions, a saved invoice, selected current attachments, recipient/message review and explicit send confirmation. Invoice versions and file hashes bind the review. Accepted means mail-server acceptance, not bank inbox delivery; Accepted, Sending and Uncertain messages never auto-retry. No payment execution or automatic accounting posting is introduced. Implementation evidence and separately tracked deployment status are in ERP `docs/export-banking-20261010/`.
