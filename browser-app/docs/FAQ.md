# Frequently Asked Questions

## Do I need to create an account?
No. The current Browser Edition does not include sign-in or user accounts.

## Are my images uploaded?
The current package is described as processing images locally in the browser and not uploading them to a BoundaryLab cloud service. Review the privacy guide and deployed code if the application changes.

## Where are saved gallery items stored?
They are stored in IndexedDB in the current browser/device.

## Can I access my gallery from another device?
No. The current package does not include cloud synchronization.

## What is the difference between grayscale and an edge map?
Grayscale represents image intensity using shades from dark to light. An edge map emphasizes locations where image intensity changes.

## Does edge detection understand objects?
No. Edge detection finds intensity transitions. It may detect object boundaries, but it can also detect textures, shadows, reflections, and background details.

## Which detection method should I use?
Try the available methods on your image and compare. Sobel, Canny-like hysteresis, and Laplacian respond differently to image structure and noise. No single method is best for every image.

## Why does my image contain noise?
Texture, lighting, compression, and small variations in the source image can create edge responses. Adjust smoothing and thresholds gradually, or try another source image or method.

## Why are some details missing?
The source may have low contrast, or smoothing and thresholds may be suppressing weak boundaries. Try reducing smoothing or adjusting thresholds.

## Can I export a transparent image?
The Studio includes a transparent-background option. Use a format that supports transparency, such as PNG. JPEG does not support transparency.

## Is SVG the same as a CAD drawing?
No. SVG is a vector graphics format. An edge-path export is not a dimensionally accurate CAD model or engineering drawing.

## Does BoundaryLab include AI object segmentation?
The current README describes edge-detection methods and visual output styles. It does not describe an AI object-segmentation service.

## Does BoundaryLab include Google login, cloud storage, or subscriptions?
Not in the current Browser Edition described by the README.

## What browsers should I use?
Use a modern browser. Serve the application from `localhost` or HTTPS for reliable worker and camera behavior.

## Where can I report a problem?
Use the project's published contact or issue-reporting channel. Include your browser, image dimensions, selected method, output style, settings, and reproduction steps. Do not publish private images.
