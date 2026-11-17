# BoundaryLab Studio
### An Interactive Image Processing & Visual Engineering Platform

**Explore. Detect. Transform. Create.**

BoundaryLab Studio is a browser-based image processing workspace designed to transform ordinary images into meaningful visual representations, edge maps, outlines, and creative effects.

Built for graphic designers, illustrators, photographers, tattoo artists, stencil creators, architects, and engineering students, BoundaryLab makes image boundary detection and visual experimentation accessible through an interactive workspace.

No installation required. Upload an image and start exploring.

---

## Overview

BoundaryLab Studio brings image processing techniques into an accessible web-based environment.

Users can upload images, experiment with different edge detection methods, customize visual outputs, compare processing results, and export their creations.

The application is designed around three synchronized visual frames:

- **Original Image:** Your uploaded source image.
- **Grayscale Image:** A monochromatic representation used during image processing.
- **Processed Image:** The resulting edge map or visual transformation.

The objective is to make image processing easier to explore without requiring users to understand complex technical parameters.

## Live Application

**Website:** https://boundarylabs-xyz.vercel.app/

**Studio:** https://boundarylabs-xyz.vercel.app/studio

Try the application directly in your browser.

## Key Features

### Image Input
- Upload images from your device.
- Drag and drop image files.
- Capture images using your camera.
- Experiment using a sample image.

### Image Processing
Explore multiple image boundary detection techniques:

- Sobel Gradient Detection
- Canny-like Hysteresis Detection
- Laplacian Edge Detection

### Visual Output Styles

Transform detected boundaries using different presentation styles:

- Color Outline
- Photo Overlay
- Dark Edge Map
- Blueprint
- Grayscale
- Threshold Mask
- Neon
- Coloring Book

### Processing Controls

Customize the appearance and processing of your images:

- Detection thresholds
- Image smoothing
- Edge thickness
- Brightness
- Contrast
- Image rotation
- Custom edge colors
- Color inversion
- Transparent background

### Workspace Features

- Three synchronized image frames.
- Undo and redo.
- Enlarged image previews.
- Hold-to-compare functionality.
- Local image gallery.
- Save and reopen gallery entries.
- Remove saved gallery entries.

### Export Options

Export your processed results in:

- PNG
- JPEG
- WebP
- SVG

---

## Who Is BoundaryLab For?

BoundaryLab is designed for different creative and technical applications.

| Audience | Potential Applications |
|---|---|
| Graphic Designers | Outline generation and line-art creation |
| Illustrators | Image simplification and visual references |
| Photographers | Artistic edge effects and image transformations |
| Tattoo Artists | High-contrast stencil references |
| Mechanical Engineering Students | Component outline exploration |
| Architects | Building and structural contour references |
| Digital Artists | Experimental visual effects |

## Technology & Processing Methods

BoundaryLab combines browser-based image processing with an interactive visual workspace.

The current implementation includes:

| Technology / Method | Application |
|---|---|
| JavaScript | Application logic and image processing |
| HTML5 | Application structure |
| CSS3 | Interface and responsive styling |
| Web Workers | Background processing support |
| IndexedDB | Local gallery storage |
| Sobel | Gradient-based edge detection |
| Canny-like Hysteresis | Threshold-based edge tracking |
| Laplacian | Intensity transition detection |
| Vercel | Website deployment |

The current implementation is a lightweight JavaScript processing system rather than a pixel-identical implementation of Python/OpenCV.

## Privacy First

BoundaryLab Browser Edition is designed around local image processing.

- Images are processed locally in the browser.
- The current package does not upload working images to BoundaryLab servers.
- Saved gallery entries remain in browser IndexedDB on the current device.
- No account registration is required.
- Users can export their results directly to their devices.

**Important:** Local browser storage is not cloud backup. Clearing browser data may remove saved gallery entries.

## Public Website

BoundaryLab includes dedicated pages to introduce the platform and demonstrate its applications.

| Page | Route |
|---|---|
| Homepage | `/` |
| Studio | `/studio` |
| Technology & Research | `/technology` |
| Showcase Gallery | `/showcase` |
| About | `/about` |
| Contact | `/contact` |
| Pricing | `/pricing` |
| For Designers | `/for-designers` |
| For Photographers | `/for-photographers` |
| For Stencil Artists | `/for-stencil-artists` |
| Mechanical Engineering | `/for-mechanical-engineering` |
| Architects & Engineers | `/for-architects-engineers` |

## Getting Started

### Run Locally

1. Clone the repository:

```bash
git clone https://github.com/ROHAN-BLAZEY/boundaryLabs.git
```

2. Navigate to the browser application:

```bash
cd boundaryLabs/browser-app
```

3. Start a local web server.

For example, using Python:

```bash
python -m http.server 8000
```

4. Open your browser:

```text
http://localhost:8000
```

Use localhost or HTTPS for reliable Web Worker and camera functionality.

Opening `index.html` directly through `file://` may prevent some browser features from working.

## Deployment on Vercel

BoundaryLab can be deployed as a static website through Vercel.

Recommended configuration:

| Setting | Value |
|---|---|
| Framework Preset | Other |
| Root Directory | `browser-app` |
| Build Command | Leave empty |
| Output Directory | `.` |

Import the GitHub repository into Vercel and apply the configuration above.

Before production deployment, update the placeholder domain in `sitemap.xml` to the final website domain.

## Project Structure

```text
boundaryLabs/
│
└── browser-app/
    │
    ├── index.html
    ├── README.md
    │
    ├── docs/
    │   ├── USER-GUIDE.md
    │   ├── PROCESSING-GUIDE.md
    │   ├── PRESETS-GUIDE.md
    │   ├── EXPORT-GUIDE.md
    │   ├── PRIVACY.md
    │   ├── TROUBLESHOOTING.md
    │   ├── TECHNICAL-OVERVIEW.md
    │   └── FAQ.md
    │
    ├── css/
    ├── js/
    ├── assets/
    ├── vercel.json
    └── sitemap.xml
```

*The directory listing is illustrative. Actual folders and filenames may differ depending on the current repository version.*

## Documentation

Explore the detailed documentation:

- [User Guide](docs/USER-GUIDE.md)
- [Processing Guide](docs/PROCESSING-GUIDE.md)
- [Presets Guide](docs/PRESETS-GUIDE.md)
- [Export Guide](docs/EXPORT-GUIDE.md)
- [Privacy Guide](docs/PRIVACY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Technical Overview](docs/TECHNICAL-OVERVIEW.md)
- [Frequently Asked Questions](docs/FAQ.md)

## Current Development Scope

The current Browser Edition focuses on providing a lightweight, accessible image processing experience.

Potential future development areas include:

- Beginner-friendly automatic processing presets.
- Improved boundary detection and segmentation workflows.
- Advanced image processing algorithms.
- Batch image processing.
- Account-based project management.
- Google authentication.
- Cloud project storage and synchronization.
- Premium processing capabilities.

These are proposed development areas, not currently available features.

## Contributing

Suggestions, feedback, and technical improvements are welcome.

If you discover a bug or have an idea for improving BoundaryLab:

1. Describe the issue clearly.
2. Include reproduction steps.
3. Provide relevant browser and environment information.
4. Suggest possible improvements where applicable.

## About BoundaryLab

BoundaryLab is an ongoing exploration of image processing, computational techniques, and visual engineering.

Our goal is to make technical image processing tools more accessible, understandable, and useful across creative and engineering disciplines.

We believe powerful visual tools should be approachable without sacrificing the ability to experiment and learn.

**BoundaryLab Studio**

*Explore. Process. Create.*

Website: https://boundarylabs-xyz.vercel.app/

GitHub: https://github.com/ROHAN-BLAZEY/boundaryLabs
