# Technical Overview

This document summarizes the architecture and technical scope stated in the current BoundaryLab Browser Edition README. It is not a line-by-line code audit.

## Application model

BoundaryLab Browser Edition is a standalone browser workspace. The current package is described as a lightweight JavaScript implementation with no third-party dependencies and no build step. The deployed static website includes public information pages and the live Studio.

## Image-processing capabilities

The README lists:
- Sobel gradient.
- Canny-like hysteresis.
- Laplacian edge detection.

Output styles:
- Color outline.
- Photo overlay.
- Dark edge map.
- Blueprint.
- Grayscale.
- Threshold mask.
- Neon.
- Coloring-book.

Controls include thresholds, smoothing, edge thickness, brightness, contrast, rotation, edge color, inversion, and transparent background.

The README characterizes the implementation as a lightweight JavaScript implementation, not a pixel-identical port of a Python/OpenCV processor. Do not claim parity with OpenCV without benchmark evidence.

## Browser processing and workers

The project README states that the processing worker works reliably when the application is served from `localhost` or HTTPS. Opening the page directly through `file://` may block the worker.

A worker can keep expensive processing away from the main user-interface thread. Consult the current source code before documenting exact worker message protocols, file names, algorithms, or fallback behavior.

## Browser storage

The saved gallery uses IndexedDB on the current device. It supports opening and removing saved entries. It is not cloud storage or account-based synchronization.

## Public website

The package includes static public routes for the homepage, Studio, Technology, Showcase, About, Contact, Pricing, and audience-specific landing pages. See the root README for the route list.

## Deployment

The documented Vercel configuration is Root Directory `browser-app`, framework preset `Other`, empty build command, and output directory `.`. Check `vercel.json` and the current Vercel project settings before changing deployment configuration.

## Security and privacy

The current package is described as local-processing and browser-storage based. If adding analytics, authentication, cloud saving, remote processing, or third-party services, update privacy and technical documentation to reflect the new data flows.

## Future architecture ideas — not current features

Potential future additions include account authentication, cloud project storage, cross-device synchronization, server-side or AI-assisted processing, paid plans, and batch processing. These are roadmap ideas unless separately implemented and released.
