# BoundaryLab Studio — Browser Edition

A standalone, responsive workspace for private image boundary processing.

## Run locally

Serve this folder from a local web server, then open the served page in a modern browser. The processing worker and camera access work reliably on `localhost` or HTTPS; opening `index.html` directly as a `file://` page may block the worker.

## Deploy to Vercel

Import the repository into Vercel and set **Root Directory** to `browser-app`. Choose **Other** as the framework, leave the build command empty, and use `.` as the output directory. The package has no build step or third-party dependencies.

## Features

- Dark charcoal and teal theme plus a light theme, with the selected theme remembered in this browser.
- Three synchronized image frames: color source, grayscale, and processed result.
- A saved gallery stored in browser IndexedDB on the current device, with open and remove actions.
- Local image selection, drag and drop, camera capture, and a sample image.
- Sobel gradient, Canny-like hysteresis, and Laplacian edge detection.
- Color outline, photo overlay, dark edge map, blueprint, grayscale, threshold mask, neon, and coloring-book output styles.
- Thresholds, smoothing, edge thickness, brightness, contrast, rotation, edge color, inversion, and transparent background controls.
- Undo/redo, enlarged frame previews, hold-to-compare, keyboard shortcuts, and PNG/JPEG/WebP/SVG export.
- A workspace guide with an overview of the frames, controls, privacy, exports, and shortcuts. Click the BoundaryLab mark to open it.
- An About section introducing the purpose and values behind BoundaryLab.

Images are processed locally in the browser and are not uploaded by this package. Saved gallery entries stay in the browser's local IndexedDB storage and can be removed from the Gallery. This is a lightweight JavaScript implementation, not a pixel-identical port of the Python/OpenCV processor. There is no sign-in, cloud storage, or AI chat service.
