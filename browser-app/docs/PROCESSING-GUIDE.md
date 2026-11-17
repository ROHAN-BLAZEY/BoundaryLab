# Processing Guide — Methods and Controls

This guide describes the methods and controls listed in the current BoundaryLab Browser Edition README.

## Detection methods

### Sobel gradient
Sobel estimates changes in image intensity in horizontal and vertical directions. Strong changes can indicate boundaries.

**Useful for:** exploring general edge strength and structural transitions.

**Consideration:** texture and noise can also produce strong gradients.

### Canny-like hysteresis
The application describes this method as Canny-like hysteresis. Canny-style processing commonly uses gradient information, suppression of non-maximum responses, two thresholds, and connectivity-based edge tracking.

**Useful for:** extracting more selective boundaries.

**Consideration:** exact behavior depends on the implementation. The application describes this as Canny-like, not as a pixel-identical OpenCV Canny implementation.

### Laplacian
The Laplacian responds to intensity changes in multiple directions and can highlight fine transitions.

**Useful for:** exploring fine image detail and local changes.

**Consideration:** it can be sensitive to noise. Smoothing and thresholds affect the result.

## Output styles

| Style | What it presents |
|---|---|
| Color outline | Edge information rendered using a selected color treatment |
| Photo overlay | Edge information combined with the source image |
| Dark edge map | Edge information on a dark presentation |
| Blueprint | A blueprint-inspired visual treatment |
| Grayscale | A monochrome output |
| Threshold mask | A threshold-based mask presentation |
| Neon | A bright, stylized edge presentation |
| Coloring-book | An outline-oriented presentation |

The exact appearance depends on the implementation and current settings. Use the live preview before exporting.

## Controls

### Low threshold
Sets a lower sensitivity boundary in threshold-based edge processing. In a hysteresis-style method, weaker edge responses may be retained when connected to stronger edges.

- Too low: more weak responses and unwanted detail may appear.
- Too high: subtle boundaries may disappear.

### High threshold
Sets the stronger edge-response threshold.

- Too low: more edges may be accepted, including unwanted details.
- Too high: weaker but useful boundaries may be lost.

For hysteresis-based processing, low and high thresholds work together. Change them gradually.

### Smoothing
Reduces small intensity variations before or during edge processing, depending on implementation.

- More smoothing can reduce noise but soften fine details.
- Less smoothing can retain texture but create more scattered edges.

### Edge thickness
Changes the displayed thickness of detected boundaries. Thinner lines can suit fine reference work; thicker lines can remain visible at smaller display sizes.

### Brightness
Adjusts image brightness in the processing workflow. Its effect may vary depending on where it is applied in the implementation.

### Contrast
Changes the separation between lighter and darker image values. More contrast may make boundaries easier to distinguish, but excessive contrast can remove subtle tonal information.

### Rotation
Rotates the image/output according to the selected angle. Check framing after rotation.

### Edge color
Selects the color used by boundary treatments that support colored edges.

### Invert image
Swaps light and dark values in the relevant output treatment.

### Transparent background
Requests a transparent background where supported by the selected style and export format. JPEG does not support transparency; use PNG when transparency is required.

## Suggested adjustment order

1. Choose the detection method.
2. Choose the output style.
3. Adjust smoothing to manage noise.
4. Adjust low and high thresholds to control edge selection.
5. Adjust edge thickness.
6. Adjust brightness and contrast if needed.
7. Choose edge color and inversion.
8. Enable transparency only if needed.

## Edges are not semantic segmentation

Edge detection finds intensity transitions. It does not automatically identify an object as a semantic unit. A building photograph may produce edges from the building, windows, shadows, clouds, trees, and image texture.

Object segmentation is a different task: it aims to identify and separate regions or objects. Do not describe the current edge detector as an AI object-segmentation system unless that capability is separately implemented.
