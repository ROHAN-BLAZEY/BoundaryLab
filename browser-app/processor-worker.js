importScripts('./specialized-algorithms.js');

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

function normalizeContrast(gray) {
  const histogram = new Uint32Array(256);
  for (const value of gray) histogram[value]++;
  const lowTarget = Math.max(1, Math.floor(gray.length * 0.01));
  const highTarget = Math.max(lowTarget + 1, Math.floor(gray.length * 0.99));
  let sum = 0; let low = 0; let high = 255;
  for (let i = 0; i < 256; i++) { sum += histogram[i]; if (sum >= lowTarget) { low = i; break; } }
  sum = 0;
  for (let i = 255; i >= 0; i--) { sum += histogram[i]; if (sum >= gray.length - highTarget) { high = i; break; } }
  if (high <= low + 4) return gray;
  const output = new Uint8Array(gray.length);
  const scale = 255 / (high - low);
  for (let i = 0; i < gray.length; i++) output[i] = Math.max(0, Math.min(255, Math.round((gray[i] - low) * scale)));
  return output;
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

function scharrMagnitude(gray, width, height) {
  const magnitude = new Float32Array(width * height), direction = new Uint8Array(width * height);
  for (let y=1;y<height-1;y++) for (let x=1;x<width-1;x++) {
    const i=y*width+x;
    const gx=-3*gray[i-width-1]+3*gray[i-width+1]-10*gray[i-1]+10*gray[i+1]-3*gray[i+width-1]+3*gray[i+width+1];
    const gy=-3*gray[i-width-1]-10*gray[i-width]-3*gray[i-width+1]+3*gray[i+width-1]+10*gray[i+width]+3*gray[i+width+1];
    magnitude[i]=Math.min(255,Math.hypot(gx,gy)/16);
    let angle=Math.atan2(gy,gx)*180/Math.PI;if(angle<0)angle+=180;
    direction[i]=angle<22.5||angle>=157.5?0:angle<67.5?1:angle<112.5?2:3;
  } return {magnitude,direction};
}

function liveContourCleanup(edge,width,height,gapClosing,minLength) {
  let current=edge;const gap=Math.max(0,Math.min(2,Number(gapClosing)||0));
  for(let pass=0;pass<gap;pass++){current=erode(dilate(current,width,height),width,height);}
  const minimum=Math.max(1,Math.min(500,Number(minLength)||1));if(minimum<=1)return current;
  const output=current.slice(),seen=new Uint8Array(current.length),queue=new Int32Array(current.length);
  for(let start=0;start<current.length;start++){if(!current[start]||seen[start])continue;let head=0,tail=0;queue[tail++]=start;seen[start]=1;
    while(head<tail){const index=queue[head++],x=index%width,y=(index-x)/width;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||nx>=width||ny<0||ny>=height)continue;const next=ny*width+nx;if(current[next]&&!seen[next]){seen[next]=1;queue[tail++]=next;}}
    } if(tail<minimum)for(let i=0;i<tail;i++)output[queue[i]]=0;
  } return output;
}

function stabilizeLiveEdges(edge, previous, width, height, strength) {
  const amount = Math.max(0, Math.min(80, Number(strength) || 0));
  if (!previous || previous.length !== edge.length || amount === 0) return edge;
  const output = edge.slice();
  // Keep a previous contour pixel only when the current frame still has
  // edge evidence in its 3x3 neighbourhood. This damps flicker without
  // carrying detached trails across moving objects.
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (edge[i] || !previous[i]) continue;
      let nearby = false;
      for (let dy = -1; dy <= 1 && !nearby; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (edge[i + dy * width + dx]) { nearby = true; break; }
        }
      }
      if (nearby && amount >= 20) output[i] = 255;
    }
  }
  return output;
}

function detectEdges(gray, width, height, settings) {
  const high = Math.max(1, Math.min(255, Number(settings.high) || 78));
  const low = Math.max(0, Math.min(high, Number(settings.low) || 0));
  const edge = new Uint8Array(width * height);

  if (settings.edgeMethod === 'laplacian') {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        const response = Math.abs(4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width]) / 4;
        if (response > 0 && response >= high) edge[i] = 255;
      }
    }
    return edge;
  }

  const { magnitude, direction } = settings.edgeMethod === 'scharr' ? scharrMagnitude(gray, width, height) : sobelMagnitude(gray, width, height);
  const thin = thinEdges(magnitude, direction, width, height);
  if (settings.edgeMethod === 'canny' || settings.edgeMethod === 'scharr') return hysteresis(thin, width, height, low, high);
  // Sobel is a direct strong-gradient map; unlike Canny it does not link weaker
  // neighbours, making the two choices visibly and predictably different.
  const cutoff = settings.edgeMethod === 'sobel' ? high : high;
  for (let i = 0; i < magnitude.length; i++) {
    const response = settings.edgeMethod === 'sobel' ? magnitude[i] : thin[i];
    if (response > 0 && response >= cutoff) edge[i] = 255;
  }
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

function dilate(edge, width, height) {
  const next = new Uint8Array(edge.length);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (edge[i + dy * width + dx]) { next[i] = 255; dy = 2; break; }
  }
  return next;
}

function erode(edge, width, height) {
  const next = new Uint8Array(edge.length);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x; let all = true;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!edge[i + dy * width + dx]) all = false;
    if (all) next[i] = 255;
  }
  return next;
}

function refineEdges(edge, width, height, mode, cleanup) {
  let next = edge;
  if (mode === 'close' || mode === 'close-open') next = erode(dilate(next, width, height), width, height);
  if (mode === 'open' || mode === 'close-open') next = dilate(erode(next, width, height), width, height);
  if (cleanup < 2) return next;
  const output = next.slice(); const seen = new Uint8Array(next.length); const queue = new Int32Array(next.length); const minSize = cleanup === 2 ? 3 : cleanup === 3 ? 6 : 10;
  for (let start = width + 1; start < next.length - width - 1; start++) {
    if (!next[start] || seen[start]) continue;
    let head = 0, tail = 0; queue[tail++] = start; seen[start] = 1;
    while (head < tail) { const i = queue[head++], x = i % width, y = (i - x) / width; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const n = (y + dy) * width + x + dx; if (dx || dy) if (next[n] && !seen[n]) { seen[n] = 1; queue[tail++] = n; } } }
    if (tail < minSize) for (let i = 0; i < tail; i++) output[queue[i]] = 0;
  }
  for (let x = 0; x < width; x++) { output[x] = 0; output[(height - 1) * width + x] = 0; }
  for (let y = 0; y < height; y++) { output[y * width] = 0; output[y * width + width - 1] = 0; }
  return output;
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
      case 'sketch':
        red = green = blue = gray[pixel];
        break;
      case 'stencil': {
        const foreground = gray[pixel] !== 0;
        red = foreground ? rgb[0] : 255;
        green = foreground ? rgb[1] : 255;
        blue = foreground ? rgb[2] : 255;
        break;
      }
      case 'technical':
        red = isEdge ? rgb[0] : 250;
        green = isEdge ? rgb[1] : 250;
        blue = isEdge ? rgb[2] : 250;
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
        red = isEdge ? rgb[0] : 0;
        green = isEdge ? rgb[1] : 0;
        blue = isEdge ? rgb[2] : 0;
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

    if (!isEdge && settings.softMask && (settings.style === 'edge-map' || settings.style === 'blueprint' || settings.style === 'technical')) {
      const halo = settings.softMask[pixel];
      if (halo) {
        const base = [0, 0, 0];
        red = Math.round(base[0] + (rgb[0] - base[0]) * halo / 255);
        green = Math.round(base[1] + (rgb[1] - base[1]) * halo / 255);
        blue = Math.round(base[2] + (rgb[2] - base[2]) * halo / 255);
      }
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
    const isBackground = settings.style === 'stencil' ? gray[pixel] === 0 : !isEdge;
    if (settings.transparent && isBackground && (transparentBackgroundStyles.has(settings.style) || settings.style === 'technical' || settings.style === 'stencil')) alpha = 0;
    output[offset + 3] = alpha;
  }
  return output;
}

self.onmessage = ({ data: job }) => {
  const { id, pixels: pixelBuffer, previousEdge: previousBuffer, width, height, settings } = job;
  const pixels = new Uint8ClampedArray(pixelBuffer);
  const gray = makeGrayscale(pixels, width * height);
  const adjusted = settings.autoNormalize ? normalizeContrast(adjustGrayscale(gray, settings)) : adjustGrayscale(gray, settings);
  const smoothed = smooth(adjusted, width, height, Math.max(0, Math.min(4, Number(settings.cleanup) || 0)));
  const offset = Math.max(-80, Math.min(80, Number(settings.stencilOffset) || 0));
  const adjustedHigh = Math.max(1, Math.min(255, Number(settings.high) + offset));
  const adjustedSettings = { ...settings, high: adjustedHigh, low: Math.max(0, Math.min(255, Number(settings.low) + offset)), autoLinkThresholds: false };
  let specialized = { edge: null, tone: adjusted };
  let detected;
  let modeStyle;
  let tone;
  if (settings.livePreview) {
    // Live preview deliberately uses the fast single-scale path. The full
    // multi-scale workspace algorithms remain available to still-image work.
    const liveHigh = Math.max(1, Number(adjustedSettings.high) || 78);
    const link = Math.max(0, Math.min(100, Number(settings.edgeLinking) || 65));
    const linkedLow = Math.min(Number(adjustedSettings.low) || 28, Math.max(1, Math.round(liveHigh * (0.12 + (100 - link) * 0.004))));
    detected = detectEdges(smoothed, width, height, { ...adjustedSettings, low: linkedLow, edgeMethod: settings.edgeMethod || 'canny' });
    detected = liveContourCleanup(detected, width, height, settings.gapClosing, settings.minContourLength);
    detected = stabilizeLiveEdges(detected, previousBuffer ? new Uint8Array(previousBuffer) : null, width, height, settings.temporalStability);
    if (settings.workspaceMode === 'stencil') {
      specialized = workspaceProcess(smoothed, width, height, adjustedSettings);
      detected = specialized.edge || detected;
    }
    modeStyle = 'edge-map';
    tone = settings.workspaceMode === 'stencil' ? (specialized.tone || adjusted) : adjusted;
  } else {
    specialized = workspaceProcess(smoothed, width, height, adjustedSettings);
    detected = specialized.edge || detectEdges(smoothed, width, height, adjustedSettings);
    // Presets select the processing algorithm; the Style control selects its rendering.
    // Stencil is rendered as a high-contrast black field with white detected boundaries.
    modeStyle = settings.style || (settings.workspaceMode === 'sketch' ? 'sketch' : settings.workspaceMode === 'technical-drawing' ? 'technical' : settings.workspaceMode === 'blueprint' ? 'blueprint' : 'edge-map');
    tone = settings.workspaceMode === 'stencil' ? (specialized.tone || adjusted) : (specialized.tone || adjusted);
  }
  const morphed = settings.livePreview ? detected : refineEdges(detected, width, height, settings.morphology || 'off', 0);
  const refined = settings.livePreview || Number(settings.cleanup) < 1 ? morphed : cleanSpecks(morphed, width, height, Math.min(4, Math.max(2, Number(settings.cleanup) + 1)));
  const edge = thickenEdges(refined, width, height, settings.edgeThickness);
  let softMask = null;
  if (settings.livePreview && Number(settings.edgeSoftness) > 0) {
    const radius = Math.min(2, Math.max(1, Number(settings.edgeSoftness)));
    softMask = new Uint8Array(edge.length);
    let frontier = edge;
    const weights = [0, 170, 72, 24];
    for (let step = 1; step <= radius; step++) {
      frontier = dilate(frontier, width, height);
      for (let i = 0; i < edge.length; i++) if (frontier[i] && !edge[i]) softMask[i] = Math.max(softMask[i], weights[step]);
    }
  }
  const output = makeOutput(pixels, tone, edge, width, height, { ...settings, style: modeStyle, softMask });
  if (settings.blueprintGrid && !settings.livePreview) blueprintGrid(output, width, height, settings);
  self.postMessage({ id, width, height, gray, edge, output, sentAt: job.sentAt || 0 }, [gray.buffer, edge.buffer, output.buffer]);
};
