# Shared ERP loading states

These Svelte 5 components adapt the owner's supplied arc, shimmer and layered button reference to the ERP's existing standard CSS and navy/teal tokens. They do not add React, Tailwind, external fonts or demonstration/code-drawer controls.

- `SpinnerLoader`: inline fetch/status feedback. Props: `size`, `label`; use an empty label inside an already named status.
- `SkeletonLoader`: `variant="table|card|list|detail"`, `rows`, `columns`, `label`, `compact`. Place inside a table cell, never directly inside `tbody`. Keep loaded data visible when refreshing.
- `ButtonLoader`: native button with `type`, `label`, `loadingLabel`, `loading`, `disabled` and normal button attributes. Its two grid layers reserve the same width. Use for new forms; existing native buttons receive the shared request-driven spinner without replacing their Svelte nodes.
- `FullScreenLoader`: native top-layer dialog, `open`, `label`, `description`. `LoaderHost` owns the global instance so exports launched inside another dialog remain visible. It has no simulated percentages or dismiss button that could imply canceling a running write.

## Async actions

`api()` and `uploadTo()` start the actual request immediately. They retain the pending entry and the associated action lock for a minimum of 2,000ms, including rejection. Identical in-flight requests share one promise. Existing CSRF, credentials, optimistic versions and uncertain-write idempotency keys are retained.

For work outside those helpers:

```ts
import {withAction, withFullScreen, minimumWindow} from '$lib/loading';
await withAction(() => customAsyncAction());
await withFullScreen('Preparing sample report…', () => generateReport());
const result = await minimumWindow(() => fetchDropdownOptions());
```

Use the fullscreen wrapper once around a complete report/import operation. Concurrent operations are reference-counted. Same-origin `/api/.../export`, Excel format links and outstanding statements use the shared download handler, preserving server-provided filenames and showing failures in a native dialog. Ordinary file previews/downloads keep their existing transport. Client-side route changes show the same overlay; initial role loads use skeletons.

The global action guard captures clicks/submissions before duplicate handlers run. It preserves the first native validation/submission, then applies native disabled where the component does not already own it. Native form controls, authorization-disabled buttons and keyboard submission retain their semantics. Local-only draft controls retain the shorter existing guard. The two-second window is a UI throttle; server authorization/idempotency/rate limits remain independent security controls.

Animations respect reduced motion and forced colors. Placeholder geometry and the shared overlay are hidden in print; PDF layouts remain independent. Microphone stop/cancel still stop capture immediately; only the transcription result window is timed.

## Validation

The release was checked with isolated browser fixtures for native required validation, immediate requests, success/error timing, retry/input retention, width stability, duplicate suppression, server download filenames, nested modal loading, concurrent tasks, navigation and reduced motion. Sampling fixtures exercised canceled detail loads, PDF preview handoff and native dictation. Synthetic fixtures are excluded from the release and no production records or employee messages are created by these checks.
