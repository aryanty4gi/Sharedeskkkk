## Goal

Stop forcing the user to bounce between Editor and PDF Preview. Make the **Editor** look exactly like the **PDF Preview** (same paginated A4 layout, gradient cover, accent rails, numbered cards, footer) — but every text block is editable in place. No surprises at export time.

Keep it lean: native `contentEditable` / `<textarea>` overlays on the existing preview layout. No Tiptap, no Lexical, no rich-text framework. The PDF report is plain text in branded layouts — that's all we need.

## What changes

### 1. Unify Editor + PDF Preview into one view

- Replace the current form-style editor (`ReportEditor`'s big card with stacked fields) with a paginated WYSIWYG canvas built from the existing `PdfPreview` layout.
- Each block in the layout becomes inline-editable:
  - **Cover**: `headline` (h1), `intro` (paragraph), CTA scenario label is read-only (driven by data).
  - **Page 2**: `exec_summary` (multi-line textarea that grows).
  - **Page 4**: `why_we_fit[]` — each numbered card is editable, with `+ Add point` and a small × on hover to remove. Drag-handle on each card for reorder (HTML5 DnD, no library).
  - **Page 5**: `talking_points[]` — same pattern as Why-this-fits. `cta` is editable inside the gradient card.
- Numeric fields (Investment parameters / Projected returns) stay read-only inside the report — they're driven by the deal in the main app. A small "Edit in deal" link jumps back to the main calculator for those (existing behavior, just made explicit).

### 2. Tabs go from 3 → 2

- **Edit** (WYSIWYG paginated — replaces both "Editor" and "PDF preview")
- **Share** (unchanged)

The `Pages match the exported PDF` strip and "Edit content" jump-link disappear (the editor *is* the preview now). Export PDF button stays in the toolbar.

### 3. Per-block AI assist stays

- Each editable block keeps its ✨ icon that opens the existing AI rewrite popover. We just move the trigger to hover-over-block in the paginated layout (top-right corner of each block, fades in on hover, doesn't take page space).

### 4. Small editor improvements (only these, no scope creep)

- **Inline add/remove/reorder** for `why_we_fit` and `talking_points` lists.
- **Overflow warning**: if a block's editable content visibly clips its page area, show a subtle amber chip ("Content overflows page") on that page so the user knows the export will paginate it. Implemented with a `ResizeObserver` comparing content height to page area.
- **Reset block**: small "↺ Reset" menu item next to ✨ — restores the block from the seeded suggestion (deal/research/template) so an AI rewrite gone wrong isn't a dead end.
- **Cmd/Ctrl+S** = Save draft, **Cmd/Ctrl+E** = Export PDF. Tiny, but removes friction.

### 5. Things we are explicitly NOT doing

- No rich-text formatting (bold/italic inside text). The PDF renders plain strings — adding rich text would silently lose formatting on export.
- No Tiptap / Lexical / Slate / ProseMirror. Native editable elements are enough.
- No second sidebar, no global AI panel, no template/style switcher in the report editor.
- No editing of numeric calculator fields inside the report editor (they live in the main app, single source of truth).

## Technical notes

- `PdfPreview` becomes the shared layout primitive. The editor mode passes `editable={true}` and `onChange` handlers per field; preview mode (used by the share page only) keeps `editable={false}`.
- Editable text blocks use either `<textarea>` (auto-sizing via `field-sizing: content` with a JS fallback) or `contentEditable` with `onBlur` commit — pick textarea for stability (contentEditable has paste/whitespace quirks that aren't worth fighting).
- AI assist popover, save logic, and `exportPDF` are untouched — only the editing surface changes.
- Inspiration repos worth peeking at (for reference, not dependencies): `Mintlify/preview`, `vercel/satori` for layout fidelity, `tldraw/tldraw`'s simple text-box pattern. None get pulled in.

## Files affected (single file, surgical changes)

- `src/routes/index.tsx`
  - Generalize `PdfPreview` → `ReportCanvas` with optional `editable` + `onChange` props.
  - Delete the old form-style editor body in `ReportEditor` and replace with `<ReportCanvas editable onChange={…} />`.
  - Drop the third tab from the segmented control, update header labels.
  - Add `+ / × / drag` controls for the two list blocks.
  - Add overflow `ResizeObserver`, Reset-block action, keyboard shortcut listeners.
