# Export and Gallery Guide

## Export formats

The current Browser Edition lists PNG, JPEG, WebP, and SVG export.

| Format | Typical use | Key consideration |
|---|---|---|
| PNG | Line art, graphics, and outputs needing transparency | Suitable for crisp graphics and transparency |
| JPEG | Photographic images and broad compatibility | Does not support transparency; compression may affect fine lines |
| WebP | Web-friendly image delivery | Check compatibility with the receiving software or service |
| SVG | Vector-oriented workflows | Confirm the export contains actual vector paths |

### Choosing a format

- Choose **PNG** when preserving crisp lines or transparency matters.
- Choose **JPEG** when you need a broadly compatible photographic image and do not need transparency.
- Choose **WebP** when your next tool or website supports it.
- Choose **SVG** when you need editable vector geometry, but inspect the exported file.

Do not assume an SVG export is automatically a clean, simplified, editable vector drawing. Validate the generated paths in a vector editor.

## Transparent backgrounds

The Studio includes a transparent-background option. JPEG does not support transparency. If you need a transparent result, choose PNG and verify the exported file in an application that displays transparency.

## Preview before export

1. Inspect the whole image.
2. Zoom into important details.
3. Check for stray marks and broken contours.
4. Confirm edge color and background.
5. Confirm rotation and framing.
6. Choose the appropriate format.

## Local gallery

The saved gallery uses browser IndexedDB on the current device. It supports saving gallery entries, opening saved entries, and removing saved entries.

Gallery entries are associated with the browser and device where they were saved. They do not automatically synchronize across devices. Clearing browser site data or using browser cleanup tools may remove them. Gallery storage is not a permanent backup.

## Recommended backup practice

Export important results to a folder on your device. If the application provides a project/settings export in the current version, keep that file separately. Do not rely solely on browser storage for important work.
