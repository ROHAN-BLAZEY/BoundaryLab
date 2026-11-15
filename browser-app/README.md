# BoundaryLab Studio — Browser Edition

Standalone responsive dashboard inspired by the BoundaryLab project. This folder is a separate static web app. It does not use or modify the original project's code, gallery, media, or database.

## Run locally
Open `index.html` in a modern browser. For camera access, serve the folder over HTTPS (or localhost). To publish, deploy this folder as a static site; Vercel can deploy it with no build command and the folder as the project root.

## Features
- Responsive desktop and mobile layouts; pick image files or capture from the device camera where browser permissions allow.
- Client-side grayscale, smoothing, Sobel/Canny-like/Laplacian edges, threshold mask, outline, blueprint and neon output.
- Controls for edge thresholds, cleanup, rotation from 0° to 360°, color, inversion and transparency.
- Eight live pipeline previews, enlarged stage viewer, source comparison, sample image, drag-and-drop, keyboard shortcuts, undo/redo and reset.
- Export result as PNG, JPEG, WebP or SVG edge paths.
- No backend, accounts, analytics, image upload, cloud gallery, or phone-to-laptop streaming. Image content stays in the browser.

The browser processing is a lightweight JavaScript implementation inspired by the original UI. It is not a pixel-identical port of the Python/OpenCV pipeline. Google Apps Script sign-in and spreadsheet collection are intentionally separate and must be configured by the site owner if desired.

## Deploy to Vercel
Create a new GitHub repository, upload these package files to its root, then import the repository in Vercel. Use the static/no-framework preset, leave build command empty, and set the output directory to `.`. The `index.html` file is the site entry point.
