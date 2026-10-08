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
