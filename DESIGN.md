---
name: "Euro Suits ERP"
description: "Clear desktop operations with navy hierarchy, teal actions and a soft sky entrance."
colors:
  primary: "#08746f"
  primary-hover: "#055c58"
  navy: "#142b40"
  signin-hover: "#254761"
  text: "#203247"
  muted: "#526174"
  white: "#fff"
  workspace: "#f5f7fa"
  field: "#f7f9fb"
  border: "#dce3eb"
  field-border: "#c3ced9"
  selected: "#e0f1ed"
  selected-text: "#075b55"
  field-focus: "#087e78"
  focus-ring: "#087d78"
  field-text: "#1f2937"
  badge: "#edf1f5"
  badge-text: "#3b4d61"
  success: "#e6f3eb"
  success-text: "#1c6048"
  warning: "#fff1d6"
  warning-text: "#80510c"
  danger: "#fcecef"
  danger-text: "#9e303b"
  info: "#e9f2fb"
  info-text: "#265b87"
  sky-top: "#b8dff2"
  sky-upper: "#e1eff8"
  sky-center: "#f8fbfe"
  sky-bottom: "#eef5fa"
  light-cyan: "#94e7f199"
  light-warm: "#ffd8b366"
typography:
  display:
    fontFamily: "'Manrope', sans-serif"
    fontSize: "clamp(42px, 4.9vw, 76px)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-.035em"
  headline:
    fontFamily: "'Manrope', sans-serif"
    fontSize: "28px"
    lineHeight: 1.3
    letterSpacing: "-.7px"
  signin-title:
    fontFamily: "'Manrope', sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-.7px"
  title:
    fontFamily: "'Manrope', sans-serif"
    fontSize: "18px"
    fontWeight: 700
  body:
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  label:
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.5
  help:
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.6
  button:
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  badge:
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.1
rounded:
  badge: "5px"
  control: "8px"
  form-group: "10px"
  panel: "12px"
  signin: "16px"
spacing:
  field-gap: "6px"
  compact: "8px"
  action-gap: "10px"
  form-row: "12px"
  form-column: "16px"
  panel-inline: "20px"
  workspace-gutter: "24px"
  signin-inset: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.field-text}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  nav-active:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.selected-text}"
    rounded: "{rounded.control}"
  badge:
    backgroundColor: "{colors.badge}"
    textColor: "{colors.badge-text}"
    typography: "{typography.badge}"
    rounded: "{rounded.badge}"
    padding: "4px 8px"
  panel:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.panel}"
  task-header:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.white}"
    padding: "12px 16px"
  signin-card:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.signin}"
    padding: "32px"
    width: "min(460px, 100%)"
  signin-action:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
  signin-action-hover:
    backgroundColor: "{colors.signin-hover}"
---

# Design System: Euro Suits ERP

## Overview

**Creative North Star: "A clear workroom"**

White navigation and cards give the desktop workspace a quiet, readable structure. Dark navy headings, dark field labels and teal actions retain the Euro Suits identity while compact grouping keeps office tasks close together. Navy task headers with white text keep an open form recognisable as its middle content scrolls.

The entrance has more atmosphere: a solid sign-in card sits over an original CSS sky shared with the public hero. The hero keeps its existing garment model and wording, with team names in a simple wrapping row. Decorative pointer light stays behind content and is optional; task controls and account behaviour remain immediate.

**Key Characteristics:**

- White navigation, white panels and dark navy hierarchy.
- Teal workspace actions and selected navigation; navy sign-in actions.
- Compact desktop forms with top-stacked labels and persistent task controls.
- Soft sky at the entrance, with solid surfaces around readable content.
- Visible keyboard focus and finite, preference-aware motion.

This document records the implemented desktop presentation on 26 October 2026. The frontmatter is the token reference; the sidecar adds preview snippets, motion, shadows and metadata. Source authority is `src/lib/styles/clean-workspace.css`, `src/lib/styles/sky.css`, `src/lib/styles/global-forms/`, `src/lib/SignInShell.svelte`, `src/lib/landing/clean-hero.css`, `src/lib/motion.ts`, plus the inherited typography and interaction rules in `src/app.css` and `src/interactions.css`. PRODUCT.md supplies the durable task and access constraints.

## Colors

The palette combines restrained navy and teal with white and cool neutral surfaces. The frontmatter preserves the actual source values, including the distinct field-focus and general-focus colors; do not silently merge them.

### Primary

- **Action Teal** (`primary`, `primary-hover`) identifies workspace primary actions and their hover state.
- **Selected Teal** (`selected`, `selected-text`) makes the current navigation item and active tab legible through a pale fill and dark label.
- **Focus Teal** (`field-focus`, `focus-ring`) preserves the implemented field and general keyboard-focus treatments. Navigation and sign-in outlines use Action Teal.

### Secondary

- **Operational Navy** (`navy`) carries workspace headings, form headers and the sign-in primary action. Header/action text is white. The sign-in hover variant uses `signin-hover`.
- **Sky** (`sky-top`, `sky-upper`, `sky-center`, `sky-bottom`) belongs to the sign-in and hero backdrop. It is not a workspace card fill.
- **Pointer Light** (`light-cyan`, `light-warm`) is translucent decoration behind content, never a status or interaction signal.

### Neutral

- **White** (`white`) is the navigation, card and panel surface.
- **Workspace Paper** (`workspace`) separates white panels from the surrounding canvas.
- **Field Paper** (`field`) and **Field Border** (`field-border`) define editable controls.
- **Panel Border** (`border`) separates the sidebar and workspace cards without a shadow.
- **Readable Ink** (`text`, `field-text`) and **Supporting Ink** (`muted`) distinguish labels/body text, inherited control text and supporting copy.
- **Neutral Badge** (`badge`, `badge-text`) is a compact factual label. Existing success, warning, danger and information badge pairs retain their semantic colors and written labels; color does not replace the label.

**The Task Header Rule.** Keep text white on a navy task header, including export task headings. Light navigation does not change this header contract.

## Typography

**Display and heading font:** Manrope, with sans-serif fallback. **Body and field font:** DM Sans, with the platform fallbacks recorded in the frontmatter. The public landing surface uses Manrope throughout; the ERP keeps DM Sans for dense operational reading.

### Hierarchy

- **Display:** the fluid public hero heading balances a short headline across the copy column. The desktop range is normative in the frontmatter; existing smaller-screen overrides remain in source.
- **Headline:** the workspace page title uses the recorded size, tracking and line height. Its weight continues to come from the existing component/base style; this document does not invent one global weight.
- **Sign-in title:** a compact Manrope title within the solid card.
- **Title:** section and panel headings. Navy dialog headings use the same size with white text and a line height of 1.4.
- **Body:** workspace copy and table cells use the body role. Hero supporting copy is 17px with a 1.65 line height and a maximum width of 48ch.
- **Label and help:** labels sit above controls; helper text sits below. Required marks stay beside field titles. Help text remains visible and can wrap.
- **Badge:** short statuses use the badge role. Tables use tabular numerals, sentence-case headings and ordinary word spacing.

## Layout

Desktop is the current design and verification target. Shared desktop form contracts begin at 1024px. Existing rules below that threshold are retained; this document does not introduce a phone redesign or certify smaller-screen layouts.

The workspace sets a 240px sidebar and a 24px gutter. White top bars have a 68px minimum height and wrap actions when necessary. Page headings, toolbars and action groups may wrap instead of extending the page. Wide tables scroll inside their own container.

Form groups use the recorded 12px row and 16px column rhythm, with 16px group insets. Labels and controls have a 6px gap. Keep field source/tab order and intentional full-width fields. General form dialogs are at most 800px wide, inset 24px from the viewport edges; compact variants cap at 560px. The header and footer stay outside the scrolling body. Material registration uses the full desktop viewport and has three columns from 1280px where its existing material grid permits them.

The sign-in shell centres a card with the width and inset recorded in `signin-card`. Its brand and support text remain outside the card; inputs and the primary action are 48px high. The public hero uses two columns in a 1.1:1 ratio with a 32px gap, a 680px minimum height and a maximum 720px copy column. The existing garment scene remains beside the copy. Team labels wrap below the actions instead of orbiting over the model.

## Elevation & Depth

Workspace panels are flat: white fill, a fine border and no shadow. The solid sign-in card uses a soft ambient shadow against the sky. Modal shadow separates an active task from the workspace without changing the form's internal grouping.

### Shadow Vocabulary

- **Sign-in card:** `0 18px 55px #24485f12`, applied by the sky stylesheet after the shared sign-in shell styles.
- **Desktop dialog:** `0 16px 56px rgb(15 23 42 / 20%)`.
- **Field focus:** `0 0 0 3px rgb(37 99 235 / 15%)`, the existing desktop field-focus halo. The field border uses the current teal token; this inherited blue halo remains part of the implementation.
- **Workspace panel:** `none`.

**The Flat Workspace Rule.** Use borders and white surfaces for workspace panels. Reserve the documented soft shadows for sign-in cards and modal separation.

## Shapes

Controls and navigation items use the control radius; form groups, larger panels and sign-in cards step up through the recorded radius scale. Status badges use the smaller badge radius. Full-screen material registration has square viewport edges. Group related fields in sections; do not place a new rounded container around each individual field.

Panel and field borders are 1px. The sky consists of CSS gradients and blurred cloud shapes, not an image dependency. Its pointer light has a fixed 620px square footprint, a 26px blur and no pointer hit area.

## Components

### Buttons

Workspace primary buttons use Action Teal with white labels; secondary buttons use white with dark text and a field-colored border. Desktop controls retain a minimum 44px height and width, with the padding in the frontmatter. Hover darkens the primary action; enabled buttons have the existing 1px pressed translation. Reduced motion removes that translation. General keyboard focus uses a 3px outline with a 3px offset; sign-in and navigation use Action Teal for that outline. Busy and disabled behaviour remains owned by the existing components.

Sign-in deliberately uses a navy primary action. Public hero actions retain their existing navy/white variants and workflow destinations; their geometry uses the shared control radius.

### Inputs / Fields

Top-stacked labels use dark ink. Fields use a soft fill, a fine border, a minimum 44px height and the recorded padding. Focus changes the field to white, applies the teal focus border and retains the inherited focus halo. Read-only/disabled controls retain their existing muted styling. Invalid fields keep their existing error border/background and written error messages. Checkboxes remain native 18px controls within a minimum 44px label target.

### Navigation

The sidebar is one white surface with a border at the workspace edge. Labels are dark, semibold and at least 44px high. Hover uses a pale neutral fill; the selected item uses Selected Teal with an Action Teal icon. Group captions stay smaller and muted. Do not transfer the sidebar's light treatment to task headings.

### Chips / Badges

Badges use a compact rounded rectangle and concise text. The neutral and four semantic color pairs are recorded above. They are status labels, so the documentation preview does not turn them into unimplemented interactive filters.

### Cards / Containers

Workspace panels use the panel radius and border, with no shadow. Panel headings use 16px vertical and 20px horizontal padding. Existing form sections use the form-group radius and inset; nested sections follow their current grouping instead of accumulating containers.

### Task Forms

Navy headers use white heading, description and close-control text, including export task headings. General dialog header/footer padding is 12px by 16px. The body scrolls between them; save/cancel controls remain visible. The full-screen material form retains the same contract. Documentation previews show this structure without replacing native modal, focus or submission behaviour.

### Sign-in and Sky

SignInShell owns the visual composition; the existing SignInForm owns password, verification, OTP, errors and busy states. The card stays opaque white. The original sky uses a four-stop vertical gradient with blurred cloud layers. The public hero reuses that backdrop while retaining its garment model and copy.

The existing Anime.js helper fades the cyan/warm pointer light to 0.85 opacity over 300ms using `outCubic`. It schedules at most one coordinate update per animation frame and has no animation loop at rest. Reduced motion, forced colors and coarse pointers disable the effect; touch movement is ignored. Pointer exit, document hiding, the hero pause control and destruction stop it. It never intercepts clicks or keyboard interaction. Forced colors and print hide the sky decoration.

Content entrance uses the existing 200ms helper; workspace navigation entrances use 220ms opacity with a 22ms stagger over at most ten surfaces. Material reference feedback remains a 280ms color highlight triggered by origin change, with reduced-motion/forced-colors handling. Preserve each helper's cleanup and static visible baseline.

**The Immediate Action Rule.** Presentation motion must never delay a business action or hide a control behind an animation.

## Do's and Don'ts

### Do:

- Do keep the desktop workspace white and light, with navy text and teal actions.
- Do preserve top-stacked labels, visible helper/error text and the 44px desktop control target.
- Do retain the navy heading with white text and keep save/cancel controls visible while form content scrolls.
- Do keep the sky and pointer light behind solid readable content, with preference, pause and cleanup handling.
- Do reuse the existing garment model, copy and workflow links when extending the public hero.
- Do preserve source order, keyboard focus, native dialog behaviour and current smaller-screen rules.

### Don't:

- Don't turn workspace navigation into a dark surface or apply navy text to navy task headers.
- Don't put each field in a separate card or restore floating field labels.
- Don't remove validation, busy states or access controls to simplify the visual layout.
- Don't add crowded orbiting labels over the garment model.
- Don't introduce third-party background assets, tracking or a continuous pointer animation loop.
- Don't treat this desktop presentation record as mobile approval or proof that every authenticated workflow is defect-free.
