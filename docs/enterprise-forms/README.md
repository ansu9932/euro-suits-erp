# Enterprise form CSS architecture

A reusable, opt-in extension to Euro Suits ERP. Imported once by `src/routes/+layout.svelte`; existing workspaces retain their current layouts until their markup adopts the BEM classes. The reference is developer documentation, not a new production business screen. No UI frameworks, packages, record fields, migrations or backend behavior were introduced.

## Modules and cascade

| File | Responsibility |
| --- | --- |
| `src/lib/styles/enterprise-forms/index.css` | Ordered entry point |
| `tokens.css` | Scoped 4px spacing, semantic M3 color roles, typography, elevation, motion |
| `layout.css` | 12-column spans, 30/70 master-detail, headings, sticky action bar, opt-in reflow |
| `components.css` | Fields, badges, affixes, buttons, matrix, native accordion and wizard navigation |
| `accessibility.css` | Small legacy compatibility bridge, focus, contrast, reduced motion and print |

All component selectors are scoped by `.erp-form`. BEM blocks start with `erp-`; `__` names an element and `--` a modifier. Layout utilities use `.erp-grid__item--span-3`, `--span-4`, `--span-6`, `--span-12`. Tokens are scoped to `.erp-form`, not `:root`. No selector applies to an unadopted ERP form.

Modules deliberately remain unlayered: the legacy ERP styles are unlayered, so introducing layers only for this extension would lower its cascade priority. `accessibility.css` contains documented `!important` exceptions solely to compete with `readability.css` on BEM fields. The legacy soft-surface rule excludes opted-in BEM controls using a zero-specificity `:where()` guard; every existing control still matches as before. Do not copy those exceptions into business components. Import this entry point once; do not selectively reorder its modules.

## Start using it

```svelte
<!-- Root layout already imports the CSS. Keep the existing submit handler,
     permissions, action locks and use:enter from $lib/motion.ts. -->
<form class="erp-form" onsubmit={save} use:enter>
  <header class="erp-form__header">
    <h1 class="erp-form__title">Edit order</h1>
  </header>
  <div class="erp-form__body erp-grid">
    <div class="erp-field erp-grid__item--span-4">
      <label class="erp-field__label" for="order-reference">
        Order reference <span class="erp-badge erp-badge--required">Required</span>
      </label>
      <input id="order-reference" class="erp-field__control"
        bind:value={reference} required disabled={busy}
        aria-describedby="order-reference-help" />
      <p id="order-reference-help" class="erp-field__help">Use the approved reference.</p>
    </div>
  </div>
  <footer class="erp-toolbar">
    <span class="erp-toolbar__status" role="status">{busy ? 'Saving…' : 'Unsaved changes'}</span>
    <button class="erp-button" type="button" onclick={cancel} disabled={busy}>Cancel</button>
    <button class="erp-button erp-button--primary" type="submit" disabled={busy}>Save</button>
  </footer>
</form>
```

This is an integration excerpt: retain the workspace's existing `save`, `cancel`, `busy`, data binding, and `enter` import. CSS does not implement persistence, permission checks, duplicate-submit protection, or validation error focus. Do not create a second form inside an existing form. Migrate complete field groups only after checking their incumbent CSS and native semantics.

For an existing desktop module, keep `.erp-form` alone. `.erp-form--responsive` explicitly enables 6-column spans below 1024px and full-width spans below 640px. Its master navigation becomes static on smaller screens. Fluid type uses `clamp()` with rem floors and scales with browser text settings. The 44px targets become 48px with coarse pointers, independent of reflow. Compact density comes from the spacing grid and field grouping, never undersized targets.

Override `--form-sticky-top` to match the host topbar; the default is 80px. Avoid overflow or transforms on ancestors of sticky surfaces. `--form-focus-clearance` reserves 160px above/below focused fields; increase it if host actions wrap. Use an actual navigation list for a simple hierarchy; do not add `role="tree"` without the expected keyboard interaction.

## Fields and states

- Top-stacked: `.erp-field` with a real `.erp-field__label` and `.erp-field__control` on input/select/textarea.
- Floating: `.erp-field--floating`, then input `placeholder=" "`, then associated label. Filled, focused and autofilled values raise the label. Use `.erp-field--raised` for dates/selects and other controls without placeholder behavior.
- Prefix/suffix: put the control in `.erp-input-group`, with `.erp-input-group__affix`. Include units in its accessible label; purely repeated decoration uses `aria-hidden="true"`.
- Required/read-only/optional/error/warning: `.erp-badge--required`, `--readonly`, `--optional`, `--error`, `--warning`. Badges are text, not tiny buttons. Native `required`, `readonly`, `disabled`, `aria-invalid` and associated messages remain necessary.
- `:user-invalid` and `aria-invalid="true"` show errors after interaction. Add `.erp-form--validated` after a submission attempt for `:invalid` fallback. Use `.erp-field--warning` for warning borders. Do not announce an untouched required field as an error.
- Read-only text remains selectable. Disabled controls do not submit native form values. Select has no native read-only state: render its selected value as text or use the existing disabled/hidden-value approach.
- Checkbox/radio: wrap the native input in `.erp-choice` with label text. The whole associated label is a 44/48px target.

## Dense matrix

Use the semantic table shown in `example.html`: caption, column `scope="col"`, color `scope="row"`, and a unique label for every input naming both color and size. Header and body share one fixed-layout table, so their columns stay aligned. The matrix owns horizontal/vertical scrolling; the page does not. Customize `--matrix-min-width` for the number of size columns. Keyboard navigation remains native Tab order. Spreadsheet arrow-key editing and virtualization are not implied by CSS; do not assign an ARIA grid role without implementing those behaviors.

## Accordions and tabbed wizards

```html
<details class="erp-accordion">
  <summary class="erp-accordion__summary">Packing notes</summary>
  <div class="erp-accordion__content">
    <div class="erp-accordion__inner">…fields…</div>
  </div>
</details>
```

Native `details/summary` provides keyboard and assistive-technology semantics with no JavaScript. Browsers supporting `::details-content` animate the anonymous grid from `0fr` to `1fr`, with `content-visibility` using `allow-discrete` for the closing transition. Others retain a usable instant native disclosure. No guessed maximum height, content unmounting or lost draft values. Reduced motion removes transitions.

`.erp-wizard__tabs` and `.erp-wizard__tab` style wizard navigation; the no-JavaScript reference uses real section links, with every step available in the document. They are navigation links, not falsely labeled ARIA tabs. Existing application-controlled tab widgets can use the same styles with `role="tab"`, `aria-selected`, `aria-controls` and `.erp-wizard__panel[hidden]`. Their controller must implement arrow/Home/End keys, roving tabindex, selected state, validation-driven disclosure and focus transfer. CSS cannot implement those ARIA behaviors. Do not animate hidden panels while leaving their controls keyboard-focusable.

## Theme and accessibility

M3-style `surface`, `surface-container-low`, `surface-container`, `surface-container-high`, `outline`, `primary`, and paired on-colors allow per-form theme overrides. The default is the existing navy/teal brand. These are dynamic CSS tokens, not a runtime Material palette generator. Any override needs foreground/background contrast verification.

The defaults provide explicit 3px focus rings, 44px targets (48px coarse pointers), non-color status labels, high-contrast and forced-colors modes. WCAG 2.2 SC 2.5.5 specifies 44×44 CSS pixels at AAA; full AAA conformance also depends on content, semantics, workflows, zoom, assistive technology and other criteria. No certification is claimed. Preserve the existing Anime.js actions and their destruction cleanup; the native accordion needs no additional animation library.

Print removes toolbar/navigation, backgrounds, blur and sticky positioning; restores all wizard panels; expands closed details in browsers with `::details-content`; repeats matrix table headers; and avoids breaking individual fields/rows. Older browsers may require opening details before printing. Native inputs/textareas may clip long values: a complete legal/business PDF should use the ERP's dedicated export or a read-only print representation. CSS cannot expand the text inside a native input to arbitrary multiline content.

## Reference and verification

`example.html` includes 52 ordinary fields plus input-state examples, an eight-color/four-size matrix, a sticky header/action bar, section navigation and two native accordions. It contains synthetic values only, calls no API, and deliberately disables illustrative Save/Cancel actions. Open it with a local static server rooted at the frontend (or use the delivered self-contained preview). It is outside Svelte routes and static assets and is not published as an ERP page.

Validation and release evidence are recorded in `VALIDATION.md`. The root import makes the architecture available across workspaces; this release intentionally does not restyle all existing ERP forms. Adoption is explicit through the classes above.

## References

- [Fluent 2 layout and 4px spacing ramp](https://fluent2.microsoft.design/layout)
- [Material 3 color roles](https://m3.material.io/styles/color/roles)
- [MDN details-content](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::details-content)
- [WCAG 2.2 enhanced target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)
