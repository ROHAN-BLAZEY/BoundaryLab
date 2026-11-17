# BoundaryLab Studio — User Guide

This guide explains how to use the Browser Edition, from opening the Studio to exporting an image.

## 1. Open the Studio

Open the live Studio route or run the application locally. Use a modern browser. For reliable processing-worker and camera behavior, use `localhost` or HTTPS rather than opening the HTML file directly.

## 2. Load an image

BoundaryLab provides these input methods:

- **Open image:** Choose an image from your device.
- **Drag and drop:** Drag an image file into the workspace where file drop is supported.
- **Use camera:** Capture an image through a browser camera prompt. Camera access generally requires `localhost` or HTTPS and browser permission.
- **Try sample:** Load the sample image provided by the application.

Use an image you have permission to process. For best initial results, choose a clear image with a visible subject and reasonable lighting.

## 3. Understand the three frames

### Original / Color image
This is the source image you loaded. Use it as the reference when judging whether important details are retained.

### Grayscale
This is a monochrome intensity representation used as an intermediate view for edge processing. Bright and dark regions can be compared without color information.

### Processed image
This is the output generated using the selected detection method, output style, and controls. It is the image you can inspect and export.

The frames are designed to stay synchronized so you can compare the same image area across views.

## 4. Choose a detection method and output style

The application provides Sobel gradient, Canny-like hysteresis, and Laplacian edge-detection methods. Output styles include color outline, photo overlay, dark edge map, blueprint, grayscale, threshold mask, neon, and coloring-book.

The method determines how boundaries are detected. The output style determines how the processed information is presented. They are different choices.

## 5. Adjust the result

Change one setting at a time and inspect the processed frame after each change. Available controls include thresholds, smoothing, edge thickness, brightness, contrast, rotation, edge color, inversion, and transparent background. See the [Processing Guide](PROCESSING-GUIDE.md).

## 6. Compare the result

Use enlarged frame previews and hold-to-compare to inspect differences between the source and processed image.

Check whether important boundaries are visible, whether the output is too noisy, whether fine details have disappeared, whether unwanted image-border lines appear, and whether the style suits your intended use.

## 7. Undo and redo

Use Undo and Redo to move through supported workspace changes. If the result becomes difficult to improve, return to simpler settings or reload the source image and try another method.

## 8. Save work locally

The saved gallery stores entries in IndexedDB in the current browser/device. Use the gallery's open and remove actions to manage those local entries.

This is not cloud storage. Gallery entries do not automatically appear on another device or in another browser profile.

## 9. Export

The Studio lists PNG, JPEG, WebP, and SVG export. Read the [Export Guide](EXPORT-GUIDE.md) for format considerations.

## 10. First-time workflow

1. Load a clear sample image.
2. Compare the Original and Grayscale frames.
3. Select a detection method.
4. Choose an output style.
5. Adjust thresholds and smoothing gradually.
6. Adjust edge thickness and edge color if needed.
7. Compare the result with the original.
8. Save it to the local gallery if you want to reopen it in this browser.
9. Export a copy to your device.

## Tips

- Start with a well-lit image.
- Avoid very small or heavily compressed images when detail matters.
- Try a less textured image first while learning the controls.
- Reduce noise gradually; excessive smoothing can remove useful details.
- Not every detected edge is an object boundary. Texture, shadows, reflections, and background details can also create edges.
