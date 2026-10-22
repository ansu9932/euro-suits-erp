# Global ERP form presentation

Applied to the existing desktop ERP and role sign-in screens (1024px and wider). This extends the current implementation; existing record fields, business handlers, authorization, action locks, Anime.js cleanup, sidebar behavior and backend are unchanged. Smaller screens retain their prior rules and new dialog wrappers become layout-transparent.

## Files and ownership

- `src/readability.css` imports `src/lib/styles/global-forms/index.css`; legacy readability rules are retained for smaller screens.
- `forms.css` owns desktop form tokens, existing section cards, top-stacked labels, help text, input states, checkbox targets and actions.
- `dialogs.css` owns constrained dialog widths, headers, scrolling bodies and action footers.
- `dashboard.css` retains shell/navigation/table styles. Competing desktop field/dialog declarations are limited to the existing smaller-screen presentation.
- `company.css` no longer applies the old negative-margin user-access footer rule; the shared dialog contract replaces it.
- CompanyWorkspace, DeveloperWorkspace, SetupUsers, FormDialog and the sample-request editor now have explicit scrolling-body wrappers. All five script blocks are unchanged. Material dialogs already had this structure and reuse it.

This applies to existing classes automatically. It is distinct from the earlier opt-in `enterprise-forms` architecture. The new `.ui-*` utilities expose the same conventions for new screens.

## Tokens and appearance

13px/600 dark labels; 6px label/control spacing; 11px/400 helper text in #6b7280; 14px input values; 44px minimum controls (retains the existing target floor while exceeding the requested 42px). Textareas remain vertically resizable. Borders use #d1d5db; focus uses #2563eb with a translucent 3px ring. High/forced contrast retains an explicit outline. Required/status text and readonly/disabled/error states remain distinct.

Existing semantic sections use white cards, 10px corners, 16px padding, 16px separation and 0 2px 8px rgb(0 0 0 / 6%) elevation. Field grids use 12px row / 16px column gaps and preserve source order. Modal bodies use one 16px inset: direct grids have no second card padding. First/last child margins are trimmed; helper paragraphs use the grid gap. Header/footer padding is 12px 16px. Short dialogs shrink to content. Checkbox/radio labels remain horizontal with 44px targets. Matrix/table input layout and prefix/select-action rows remain intact.

Dialog width is at most 800px with viewport gutters; compact dialogs remain at most 560px. The native dialog itself does not scroll for converted forms: only the body scrolls, leaving header/actions visible. The existing navy header and teal primary actions remain. Secondary actions use white surfaces and neutral outlines. The sample buyer-message instructions were moved from its placeholder into associated helper text beneath the textarea; wording is unchanged.

## Utility usage

```html
<form class="ui-form">
  <section class="ui-form-card" aria-labelledby="order-heading">
    <h2 id="order-heading">Order details</h2>
    <div class="ui-form-grid">
      <div class="ui-field">
        <label for="order-reference">Order reference</label>
        <input class="ui-control" id="order-reference" name="reference"
          required aria-describedby="reference-help">
        <small class="ui-help" id="reference-help">Use the approved reference.</small>
      </div>
      <label class="ui-choice">
        <input type="checkbox" name="active">Account active
      </label>
    </div>
  </section>
  <footer class="ui-actions ui-actions--sticky">
    <button class="ui-button ui-button--secondary" type="button">Cancel</button>
    <button class="ui-button ui-button--primary" type="submit">Save</button>
  </footer>
</form>
```

Supply existing application handlers; CSS does not implement saving or permissions. Use native disabled/readonly/required and `aria-invalid`, paired with visible errors and `aria-describedby`. Do not use placeholder text as the only label or instruction. Avoid a floating-label modifier in ERP screens: the shared style resolves it to top-stacked labels.

For a native dialog use `dialog.ux-dialog`, its header, then `form.ux-dialog__form` containing `div.ux-dialog__body` and a sibling footer. Open it through the existing showModal action; CSS must not display closed dialogs. Keep submit buttons inside the form and give Cancel/Close type=button. Never nest forms. Existing focus, Escape, cancel confirmation and busy handling stay in the component. If a new surface uses custom role=dialog rather than native dialog, retain its current focus-management implementation.

## Validation

- Inspected existing shared CSS, component structure and actual desktop dialogs before replacing competing styles.
- 33 isolated Chromium checks passed using actual FormDialog, SetupUsers, EnquiryFields, SampleWorkspace and MaterialWorkspace components with synthetic API responses. Verified 1440/1163px sizing, top-stacked labels, helper placement, blue focus, compact padding/gaps, short-form height, internal scrolling, visible actions, checkbox targets, native Escape, password visibility, sample row addition/value preservation and an in-memory generic submit.
- No API writes were attempted. No live accounts, records or messaging used. All five affected script blocks are identical to HEAD.
- 768px check verifies the new wrapper does not alter the existing small-screen flow. It is not a mobile redesign or full mobile regression certification.
- High-contrast keyboard focus and reduced-motion rules retained. Impeccable mechanical scan: no findings.
- Prior release full frontend suite: 99/100 passed (not rerun for this CSS-only spacing follow-up). The receipt-array identity assertion is the previously recorded baseline failure; it remains outside this styling change.
- No full accessibility certification or signed-in production-user walkthrough is claimed. Production deployment and served CSS verification are recorded separately.

Builds use an isolated HEAD copy plus only the requested changes, preserving the unrelated local deletion of src/app.html and untracked .impeccable. The review route and local dev configuration are never committed or deployed. Roll back this frontend release only; no database restore or backend deployment is required.
