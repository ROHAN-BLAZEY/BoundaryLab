# BoundaryLab multi-workspace expansion

## Non-negotiable preservation rules
- This work is additive. Do not delete or replace the existing Image Studio, its processing worker, controls, original six built-in presets, local gallery, undo/redo, camera capture, or export formats.
- Keep the six original presets in Image Studio: Clean Outline, Detailed Outline, Bold Outline, Sketch Style, Technical Drawing, and Stencil Style.
- All development for this expansion belongs on `feature/boundarylab-multi-workspace-expansion`, based on `main`. Do not commit directly to `main` and do not merge without owner approval.
- Reuse the shared processing engine rather than copying the worker into separate workspaces.

## Workspace routes
- `/studio` — original Image Studio; preserve its existing UI and behavior.
- `/live` — camera workflow landing page. Current camera support captures one still frame; continuous real-time processing is future work.
- `/blueprint` — current technical-style edge visualisation entry point. It is not a calibrated CAD/drawing generator.
- `/clean-outline`, `/detailed-outline`, `/bold-outline`, `/sketch`, `/technical-drawing`, `/stencil` — focused workspace pages which launch Image Studio with their matching original preset selected.

## Current implementation in this branch
- Added Vercel rewrites and eight dedicated HTML routes.
- Added shared workspace content and styling in `workspace.js` and `workspace.css`.
- Added homepage discovery cards and shared navigation links.
- Added Image Studio query-string preset initialization. This does not remove or rename any built-in preset.
- Workspace pages explicitly disclose capabilities which do not yet exist, rather than presenting a placeholder as a completed algorithm.

## Further specialist-engine work (follow-up phases)
1. Blueprint: calibrated scale workflow, units, annotations, sheet layout, multiple views, PDF/SVG drafting export. Never infer physical dimensions without calibration.
2. Live: continuous camera stream, throttled worker processing, real-time overlays, capture, and robust track cleanup.
3. Clean Outline: edge-aware denoising, contour smoothing and gap-aware refinement with before/after validation.
4. Detailed Outline: multi-scale/adaptive edge detection with controls to balance detail against noise.
5. Bold Outline: contour consolidation, adjustable stroke weight and cleanup.
6. Sketch: genuine tonal pencil/graphite/charcoal and cross-hatching renderer; do not relabel the existing coloring-book style as pencil sketch.
7. Technical Drawing: line/shape structure, construction and centre-line options; keep distinct from Blueprint page-layout/calibration features.
8. Stencil: foreground/background segmentation, connected-region analysis and optional bridge suggestions; keep user review for bridges.

## Validation checklist
- Confirm all existing Image Studio controls and six presets still work.
- Test every route on Vercel preview, including refresh and direct navigation.
- Test each workspace CTA selects the intended preset.
- Test local gallery, import/export settings, undo/redo, camera permission denial, and PNG/JPEG/WebP/SVG export.
- Test mobile layouts, keyboard navigation, light/dark themes, and missing camera support.
- Check console and worker errors. Compare representative input/output images for regression.
