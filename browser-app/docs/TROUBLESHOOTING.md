# Troubleshooting

## The Studio does not work when I open `index.html` directly

**Possible cause:** browsers may restrict workers or camera access on `file://` pages.

**Try this:** serve the `browser-app` folder using a local development server, then open its `localhost` address. For deployment, use HTTPS.

## Camera capture is unavailable

**Possible causes:** the page is not served from a secure context, permission was denied, or another application is using the camera.

**Try this:**
1. Open the Studio on `localhost` or HTTPS.
2. Check the browser's camera permission for the site.
3. Close other applications using the camera.
4. Reload the page and try again.

## The processed image contains too many small marks

**Possible causes:** image texture, sensor noise, compression artifacts, shadows, or thresholds that admit weak edge responses.

**Try this:**
1. Increase smoothing gradually.
2. Adjust the low threshold.
3. Adjust the high threshold.
4. Try another detection method.
5. Use a cleaner or higher-quality source image.

Do not increase smoothing too far; fine details may disappear.

## Important edges are missing

**Possible causes:** low contrast, weak boundaries, excessive smoothing, or thresholds that are too restrictive.

**Try this:**
1. Reduce smoothing slightly.
2. Adjust low and high thresholds gradually.
3. Increase contrast if the source image is flat.
4. Try Sobel, Canny-like hysteresis, or Laplacian and compare.

## The output includes unwanted image borders

Check whether the visible line is part of the source image, a canvas boundary, or an artifact introduced during processing or rendering. Compare the original and processed frames at the same zoom level. If it persists, report the source dimensions, browser, selected method, output style, and settings.

## The output looks too thick

Reduce edge thickness. Also check whether the selected output style adds emphasis beyond the underlying edge map.

## The output is too faint

Try another edge color, output style, contrast setting, or threshold combination. Inspect against light and dark backgrounds.

## Exported JPEG has no transparency

This is expected: JPEG does not support transparency. Export as PNG when a transparent background is required.

## SVG does not behave like an editable vector drawing

An SVG file can contain raster content as well as vector paths. Open it in a vector editor and inspect its contents. Check whether it contains paths, embedded raster images, or both.

## Gallery items are missing

The gallery is stored in browser IndexedDB on the current device. Check that you are using the same browser and profile, that site data has not been cleared, and that you are not using a temporary private-browsing session. The current package does not synchronize gallery items through a cloud account.

## Processing is slow

Large images require more processing and memory. Try a smaller source image to determine whether dimensions are contributing to the delay. Close other memory-intensive tabs and applications, then retry.

## When reporting a bug

Include browser name/version, operating system, approximate image dimensions and format, selected detection method, output style, relevant control values, reproduction steps, expected behavior, and actual behavior. Avoid sharing private or sensitive images in public bug reports.
