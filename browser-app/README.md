# BoundaryLab Studio — Browser Edition

Standalone responsive dashboard inspired by the BoundaryLab project. This folder is separate from the original project and does not contain its backend or data.

## Run and deploy
Open `index.html` in a modern browser. For camera access, run on HTTPS or localhost. Deploy the `browser-app` folder as a static site on Vercel (no build command; output directory `.`).

## Features
Responsive desktop/phone layout, local image selection and camera capture, drag-and-drop, worker-based image processing, Sobel/Canny-like/Laplacian edges, threshold and cleanup controls, 0–360 degree rotation, neon colors, invert/transparency, eight stage previews, image compare, enlarged stages, undo/redo, shortcuts, sample image, reset, and PNG/JPEG/WebP/SVG exports.

Processing runs locally in the browser. Images are not uploaded. This is a lightweight JavaScript implementation, not a pixel-identical port of the Python/OpenCV processor. There is no backend, sign-in, shared gallery, cloud storage, or phone-to-laptop streaming. Configure Google Apps Script separately if desired.
