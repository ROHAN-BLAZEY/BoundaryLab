function makeGrayscale(pixels, count) {
  const gray = new Uint8Array(count);
  for (let pixel = 0, offset = 0; pixel < count; pixel++, offset += 4) {
    gray[pixel] = Math.round(
      0.299 * pixels[offset] +
      0.587 * pixels[offset + 1] +
      0.114 * pixels[offset + 2]
    );
  }
  return gray;
}

function adjustGrayscale(gray, settings) {
  const brightness = Math.max(-100, Math.min(100, Number(settings.brightness) || 0)) * 2.55;
  const contrast = Math.max(-100, Math.min(100, Number(settings.contrast) || 0));
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const adjusted = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) {
    adjusted[i] = Math.max(0, Math.min(255, Math.round(factor * (gray[i] - 128) + 128 + brightness)));
  }
  return adjusted;
}

function smooth(gray, width, height, passes) {
  let current = gray;
  for (let pass = 0; pass < passes; pass++) {
    const horizontal = current.slice();
    const next = current.slice();
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const index = row + x;
        horizontal[index] = Math.round((current[index - 1] + 2 * current[index] + current[index + 1]) / 4);
      }
    }
    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const index = row + x;
        next[index] = Math.round((horizontal[index - width] + 2 * horizontal[index] + horizontal[index + width]) / 4);
      }
    }
    current = next;
  }
  return current;
}

function sobelMagnitude(gray, width, height) {
  const magnitude = new Float32Array(width * height);
  const direction = new Uint8Array(width * height);
  const max = 4 * Math.SQRT2;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx = -gray[i - width - 1] + gray[i - width + 1]
        - 2 * gray[i - 1] + 2 * gray[i + 1]
        - gray[i + width - 1] + gray[i + width + 1];
      const gy = -gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1]
        + gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1];
      const strength = Math.hypot(gx, gy) / max;
      magnitude[i] = Math.min(255, strength);
      let angle = Math.atan2(gy, gx) * 180 / Math.PI;
      if (angle < 0) angle += 180;
      direction[i] = angle < 22.5 || angle >= 157.5 ? 0
        : angle < 67.5 ? 1
          : angle < 112.5 ? 2 : 3;
    }
  }
  return { magnitude, direction };
}

function thinEdges(magnitude, direction, width, height) {
  const thin = new Uint8Array(width * height);
  const neighbors = [[1, 0], [1, -1], [0, -1], [-1, -1]];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const [dx, dy] = neighbors[direction[i]];
      const value = magnitude[i];
      if (value >= magnitude[i - dy * width - dx] && value >= magnitude[i + dy * width + dx]) {
        thin[i] = Math.round(value);
      }
    }
  }
  return thin;
}

function hysteresis(thin, width, height, low, high) {
  const edge = new Uint8Array(thin.length);
  const queue = new Int32Array(thin.length);
  let head = 0;
  let tail = 0;

  for (let i = 0; i < thin.length; i++) {
    if (thin[i] > 0 && thin[i] >= high) {
      edge[i] = 255;
      queue[tail++] = i;
    } else if (thin[i] > 0 && thin[i] >= low) {
      edge[i] = 128;
    }
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = (index - x) / width;
    for (let dy = -1; dy <= 1; dy++) {
      const nextY = y + dy;
      if (nextY < 0 || nextY >= height) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const nextX = x + dx;
        if ((dx === 0 && dy === 0) || nextX < 0 || nextX >= width) continue;
        const next = nextY * width + nextX;
        if (edge[next] === 128) {
          edge[next] = 255;
          queue[tail++] = next;
        }
      }
    }
  }
  for (let i = 0; i < edge.length; i++) if (edge[i] !== 255) edge[i] = 0;
  return edge;
}

function detectEdges(gray, width, height, settings) {
  const low = Math.max(0, Math.min(255, Number(settings.low)));
  const high = Math.max(low, Math.min(255, Number(settings.high)));
  const edge = new Uint8Array(width * height);

  if (settings.edgeMethod === 'laplacian') {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        const response = Math.abs(4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width]) / 4;
        if (response > 0 && response >= low) edge[i] = 255;
      }
    }
    return edge;
  }

  const { magnitude, direction } = sobelMagnitude(gray, width, height);
  const thin = thinEdges(magnitude, direction, width, height);
  if (settings.edgeMethod === 'canny') return hysteresis(thin, width, height, low, high);
  for (let i = 0; i < thin.length; i++) if (thin[i] > 0 && thin[i] >= low) edge[i] = 255;
  return edge;
}

function thickenEdges(edge, width, height, thickness) {
  let current = edge;
  const passes = Math.max(0, Math.min(4, Number(thickness) - 1));
  for (let pass = 0; pass < passes; pass++) {
    const next = current.slice();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        if (!current[index]) continue;
        for (let dy = -1; dy <= 1; dy++) {
          const nearY = y + dy;
          if (nearY < 0 || nearY >= height) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nearX = x + dx;
            if (nearX >= 0 && nearX < width) next[nearY * width + nearX] = 255;
          }
        }
      }
    }
    current = next;
  }
  return current;
}

function colorFromHex(hex) {
  const digits = String(hex || '#087967').slice(1);
  return [0, 2, 4].map((offset) => Number.parseInt(digits.slice(offset, offset + 2), 16) || 0);
}

function makeOutput(pixels, gray, edge, width, height, settings) {
  const rgb = colorFromHex(settings.color);
  const output = new Uint8ClampedArray(width * height * 4);
  const transparentBackgroundStyles = new Set(['outline', 'edge-map', 'blueprint', 'neon', 'coloring']);
  const contrast = Math.max(-100, Math.min(100, Number(settings.contrast) || 0));
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const brightness = Math.max(-100, Math.min(100, Number(settings.brightness) || 0)) * 2.55;
  const adjustChannel = (value) => Math.max(0, Math.min(255, Math.round(contrastFactor * (value - 128) + 128 + brightness)));
  for (let pixel = 0, offset = 0; pixel < gray.length; pixel++, offset += 4) {
    const isEdge = edge[pixel] !== 0;
    let red = 0;
    let green = 0;
    let blue = 0;

    switch (settings.style) {
      case 'gray':
        red = green = blue = gray[pixel];
        break;
      case 'threshold': {
        const value = gray[pixel] >= Number(settings.low) ? 255 : 0;
        red = green = blue = value;
        break;
      }
      case 'blueprint':
        red = isEdge ? rgb[0] : 7;
        green = isEdge ? rgb[1] : 26;
        blue = isEdge ? rgb[2] : 52;
        break;
      case 'neon':
        red = isEdge ? rgb[0] : 5;
        green = isEdge ? rgb[1] : 10;
        blue = isEdge ? rgb[2] : 13;
        break;
      case 'coloring':
        red = green = blue = isEdge ? 20 : 255;
        break;
      case 'edge-map':
        red = isEdge ? rgb[0] : 8;
        green = isEdge ? rgb[1] : 13;
        blue = isEdge ? rgb[2] : 14;
        break;
      case 'overlay':
        red = isEdge ? rgb[0] : adjustChannel(pixels[offset]);
        green = isEdge ? rgb[1] : adjustChannel(pixels[offset + 1]);
        blue = isEdge ? rgb[2] : adjustChannel(pixels[offset + 2]);
        break;
      case 'outline':
      default:
        red = isEdge ? rgb[0] : 255;
        green = isEdge ? rgb[1] : 255;
        blue = isEdge ? rgb[2] : 255;
        break;
    }

    if (settings.invert) {
      red = 255 - red;
      green = 255 - green;
      blue = 255 - blue;
    }
    output[offset] = red;
    output[offset + 1] = green;
    output[offset + 2] = blue;
    let alpha = settings.transparent ? pixels[offset + 3] : 255;
    if (settings.transparent && !isEdge && transparentBackgroundStyles.has(settings.style)) alpha = 0;
    output[offset + 3] = alpha;
  }
  return output;
}

self.onmessage = ({ data: job }) => {
  const { id, pixels: pixelBuffer, width, height, settings } = job;
  const pixels = new Uint8ClampedArray(pixelBuffer);
  const gray = makeGrayscale(pixels, width * height);
  const adjusted = adjustGrayscale(gray, settings);
  const smoothed = smooth(adjusted, width, height, Math.max(0, Math.min(4, Number(settings.cleanup) || 0)));
  const detected = detectEdges(smoothed, width, height, settings);
  const edge = thickenEdges(detected, width, height, settings.edgeThickness);
  const output = makeOutput(pixels, adjusted, edge, width, height, settings);
  self.postMessage({ id, width, height, gray, edge, output }, [gray.buffer, edge.buffer, output.buffer]);
};
