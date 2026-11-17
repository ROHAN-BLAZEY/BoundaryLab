# Presets and Practical Workflows

This guide gives starting workflows for different image types and creative goals.

## Presets: current status

The current Browser Edition README lists detection methods and output styles, but does not specify a built-in library of audience-specific one-click presets. The workflows below are recommendations, not claims that these named presets already exist as buttons.

If named presets are added later, test each one against representative images before publishing it.

## Clean architectural outline

**Goal:** emphasize the main structure of a building.

1. Use a clear building photograph.
2. Choose a detection method and begin with moderate smoothing.
3. Use a threshold-based method if you want to tune which edge responses remain.
4. Adjust thresholds until the main building contours are visible without excessive texture.
5. Keep line thickness restrained for detailed façades.
6. Compare the result with the original around windows, rooflines, and structural supports.

**Watch for:** brick patterns, foliage, clouds, shadows, and reflections can create extra edges.

## Mechanical component reference

**Goal:** make the visible outline and major features of a component easier to study.

1. Photograph the component against a contrasting, uncluttered background.
2. Use even lighting to reduce hard shadows.
3. Start with moderate smoothing.
4. Adjust thresholds to retain visible component boundaries.
5. Avoid excessive line thickening if small features matter.
6. Inspect holes, slots, fasteners, and narrow gaps at an enlarged preview size.

**Important:** an edge image is a visual reference, not a dimensionally accurate engineering drawing or a substitute for CAD measurement.

## Tattoo or stencil reference

**Goal:** create a high-contrast outline reference.

1. Start with a clear image with a distinct subject.
2. Try the coloring-book or threshold-mask output styles.
3. Adjust smoothing to remove minor texture without losing important contours.
4. Tune thresholds to reduce background detail.
5. Adjust line thickness for the intended print or transfer size.
6. Export and inspect the result at its intended size.

**Important:** review the output manually before using it as a stencil. The software does not guarantee production-ready tattoo artwork.

## Photography and digital art

**Goal:** explore artistic edge treatments.

1. Load a well-exposed image.
2. Try photo overlay, neon, blueprint, or dark edge map.
3. Compare multiple detection methods.
4. Adjust contrast and smoothing to balance texture and clarity.
5. Experiment with edge color and inversion.
6. Export variations if you want to compare styles later.

## Graphic design and illustration

**Goal:** create an outline treatment for a design workflow.

1. Choose an image with a clear subject.
2. Try color outline or coloring-book.
3. Adjust edge thickness for the final layout size.
4. Choose a high-contrast edge color.
5. Check whether the export format preserves the background and transparency you need.
6. If using SVG, inspect it in a vector editor to confirm it contains usable vector paths.

## Preset evaluation checklist

When developing built-in presets, evaluate each one with a simple low-noise image, a detailed textured image, a low-contrast image, a high-contrast image, a subject with thin structures, and a subject against a busy background.

Record each preset's intended use, parameter values, expected trade-offs, and known limitations.
