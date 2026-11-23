(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const source = $('#source');
  const grayCanvas = $('#gray');
  const result = $('#result');
  const sourceCtx = source.getContext('2d', { willReadFrequently: true });
  const grayCtx = grayCanvas.getContext('2d');
  const resultCtx = result.getContext('2d');
  const MAX_SIDE = 960;
  const worker = new Worker('./processor-worker.js');
  const GALLERY_DB = 'boundarylab-local-gallery';
  const GALLERY_STORE = 'images';

  let basePixels = null;
  let baseW = 0;
  let baseH = 0;
  let filename = 'boundarylab';
  let sequence = 0;
  let debounce = 0;
  let toastTimer = 0;
  let history = [];
  let historyIndex = -1;
  let lastOutput = null;
  let lastEdge = null;
  let comparing = false;
  let processing = false;
  let lastFocused = null;
  let fileLoadToken = 0;
  let currentAsset = null;
  let galleryDbPromise = null;
  let galleryObjectUrls = [];

  const defaults = {
    style: 'outline', edgeMethod: 'canny', low: 28, high: 78,
    cleanup: 1, edgeThickness: 1, brightness: 0, contrast: 0,
    rotation: 0, color: '#087967', invert: false, transparent: false,
    autoNormalize: false, morphology: 'off', workspaceMode: 'standard', sketchVariant: 'pencil', stencilOffset: 0, blueprintGrid: true, gridSpacing: 32,
  };
  const settings = { ...defaults };

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function status(message) {
    $('#processingStatus').textContent = message;
  }

  function sync() {
    const controls = {
      style: settings.style,
      edgeMethod: settings.edgeMethod,
      threshold: settings.low,
      highThreshold: settings.high,
      cleanup: settings.cleanup,
      edgeThickness: settings.edgeThickness,
      brightness: settings.brightness,
      contrast: settings.contrast,
      rotation: settings.rotation,
      color: settings.color,
      invert: settings.invert,
      transparent: settings.transparent,
      autoNormalize: settings.autoNormalize,
      morphology: settings.morphology,
      sketchVariant: settings.sketchVariant,
      stencilOffset: settings.stencilOffset,
      blueprintGrid: settings.blueprintGrid,
      gridSpacing: settings.gridSpacing,
    };
    for (const [id, value] of Object.entries(controls)) {
      const element = $('#' + id);
      if (element.type === 'checkbox') element.checked = value;
      else element.value = value;
    }
    $('#tval').textContent = settings.low;
    $('#highVal').textContent = settings.high;
    $('#nval').textContent = settings.cleanup;
    $('#thicknessVal').textContent = settings.edgeThickness;
    $('#brightnessVal').textContent = settings.brightness;
    $('#contrastVal').textContent = settings.contrast;
    $('#simpleDetail').value = Math.round(Math.max(0, Math.min(100, (80 - settings.low) / .55)));
    $('#simpleSmoothness').value = settings.cleanup * 25;
    $('#simpleThickness').value = settings.edgeThickness;
    $('#simpleContrast').value = settings.contrast;
    $('#detailVal').textContent = $('#simpleDetail').value;
    $('#smoothnessVal').textContent = $('#simpleSmoothness').value;
    $('#simpleThicknessVal').textContent = settings.edgeThickness;
    $('#simpleContrastVal').textContent = settings.contrast;
    $('#rval').textContent = settings.rotation + '°';
    $('#stencilOffsetVal').textContent = settings.stencilOffset;
    $('#gridSpacingVal').textContent = settings.gridSpacing;
  }

  function updateHistoryButtons() {
    $('#undo').disabled = historyIndex <= 0;
    $('#redo').disabled = historyIndex < 0 || historyIndex >= history.length - 1;
  }

  function saveHistory() {
    history = history.slice(0, historyIndex + 1);
    history.push({ ...settings });
    if (history.length > 40) history.shift();
    historyIndex = history.length - 1;
    updateHistoryButtons();
  }

  function setCanvasSize(canvas, width, height) {
    canvas.width = width;
    canvas.height = height;
  }

  function drawGray(canvas, context, width, height, values) {
    setCanvasSize(canvas, width, height);
    const image = context.createImageData(width, height);
    for (let pixel = 0, offset = 0; pixel < values.length; pixel++, offset += 4) {
      const value = values[pixel];
      image.data[offset] = value;
      image.data[offset + 1] = value;
      image.data[offset + 2] = value;
      image.data[offset + 3] = 255;
    }
    context.putImageData(image, 0, 0);
  }

  function rotateSource() {
    const degrees = Number(settings.rotation);
    if (!degrees) return { pixels: basePixels.slice(), width: baseW, height: baseH };

    const angle = degrees * Math.PI / 180;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const width = Math.max(1, Math.ceil(Math.abs(baseW * cosine) + Math.abs(baseH * sine)));
    const height = Math.max(1, Math.ceil(Math.abs(baseH * cosine) + Math.abs(baseW * sine)));
    const rotatedCanvas = document.createElement('canvas');
    rotatedCanvas.width = width;
    rotatedCanvas.height = height;
    const rotatedContext = rotatedCanvas.getContext('2d', { willReadFrequently: true });
    rotatedContext.translate(width / 2, height / 2);
    rotatedContext.rotate(angle);

    const original = document.createElement('canvas');
    original.width = baseW;
    original.height = baseH;
    original.getContext('2d').putImageData(new ImageData(basePixels.slice(), baseW, baseH), 0, 0);
    rotatedContext.drawImage(original, -baseW / 2, -baseH / 2);
    return { pixels: rotatedContext.getImageData(0, 0, width, height).data, width, height };
  }

  function render() {
    if (!basePixels) return;
    sync();
    processing = true;
    $('#saveToGallery').disabled = true;
    status('Processing…');
    const id = ++sequence;
    const rotated = rotateSource();
    try {
      worker.postMessage({
        id,
        pixels: rotated.pixels.buffer,
        width: rotated.width,
        height: rotated.height,
        settings: { ...settings },
      }, [rotated.pixels.buffer]);
    } catch (error) {
      console.error(error);
      processing = false;
      $('#saveToGallery').disabled = !currentAsset || !lastOutput;
      status('Could not process image');
      toast('Image processing could not start');
    }
  }

  worker.onmessage = ({ data }) => {
    if (data.id !== sequence) return;
    const { width, height, gray, edge, output } = data;
    processing = false;
    drawGray(grayCanvas, grayCtx, width, height, gray);
    setCanvasSize(result, width, height);
    resultCtx.putImageData(new ImageData(output, width, height), 0, 0);
    lastOutput = output;
    lastEdge = edge;
    $('#saveToGallery').disabled = false;
    $('#grayPlaceholder').hidden = true;
    $('#resultPlaceholder').hidden = true;
    $('#dimensions').textContent = `${width} × ${height}`;
    status(`Ready · ${width} × ${height}`);
  };

  worker.onerror = (error) => {
    console.error(error);
    processing = false;
    $('#saveToGallery').disabled = !currentAsset || !lastOutput;
    status('Processing error');
    toast('The image processor encountered an error');
  };

  function schedule() {
    clearTimeout(debounce);
    debounce = setTimeout(render, 90);
  }

  function loadFile(file, presetSettings = null) {
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) return toast('Image exceeds the 30 MB limit');
    if (!file.type.startsWith('image/')) return toast('Choose an image file');

    $('#file').value = '';
    const token = ++fileLoadToken;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      if (token !== fileLoadToken) return;
      const scale = Math.min(1, MAX_SIDE / image.width, MAX_SIDE / image.height);
      baseW = Math.max(1, Math.round(image.width * scale));
      baseH = Math.max(1, Math.round(image.height * scale));
      setCanvasSize(source, baseW, baseH);
      sourceCtx.drawImage(image, 0, 0, baseW, baseH);
      basePixels = sourceCtx.getImageData(0, 0, baseW, baseH).data;
      filename = file.name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '-') || 'boundarylab';
      currentAsset = file;
      if (presetSettings) Object.assign(settings, { ...defaults, ...presetSettings });

      sequence++;
      lastOutput = null;
      lastEdge = null;
      setCanvasSize(grayCanvas, 1, 1);
      setCanvasSize(result, 1, 1);
      $('#fileName').textContent = file.name;
      $('#sourcePlaceholder').hidden = true;
      $('#grayPlaceholder').querySelector('b').textContent = 'Preparing grayscale…';
      $('#grayPlaceholder').querySelector('small').textContent = 'Updating from source image';
      $('#resultPlaceholder').querySelector('b').textContent = 'Processing image…';
      $('#resultPlaceholder').querySelector('small').textContent = 'Applying your selected controls';
      $('#grayPlaceholder').hidden = false;
      $('#resultPlaceholder').hidden = false;
      $('#reset').disabled = false;
      $('#saveToGallery').disabled = true;
      history = [];
      historyIndex = -1;
      sync();
      saveHistory();
      render();
      toast('Image opened locally');
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      if (token !== fileLoadToken) return;
      toast('Could not decode this image');
    };
    image.src = url;
  }

  function openModal(modal, focusSelector) {
    lastFocused = document.activeElement;
    modal.hidden = false;
    modal.querySelector(focusSelector)?.focus();
  }

  function closeModal(modal) {
    modal.hidden = true;
    if (modal.id === 'galleryModal') {
      galleryObjectUrls.forEach((url) => URL.revokeObjectURL(url));
      galleryObjectUrls = [];
    }
    lastFocused?.focus?.();
  }

  function showCanvasModal(title, canvas) {
    const box = $('#modalContent');
    box.replaceChildren();
    const heading = document.createElement('p');
    heading.className = 'eyebrow';
    heading.textContent = title;
    const image = document.createElement('canvas');
    image.width = canvas.width;
    image.height = canvas.height;
    image.getContext('2d').drawImage(canvas, 0, 0);
    box.append(heading, image);
    openModal($('#modal'), '#modalClose');
  }

  function download(blob, name) {
    if (!blob) return toast('Could not create export');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    toast('Downloaded ' + name);
  }

  function exportAs(type) {
    if (!lastOutput || !basePixels) return toast('Open an image first');
    const name = filename + (type === 'jpeg' ? '.jpg' : '.' + type);

    if (type === 'svg') {
      const paths = [];
      for (let y = 0; y < result.height; y++) {
        for (let x = 0; x < result.width; x++) {
          if (lastEdge[y * result.width + x]) paths.push(`M${x} ${y}h1v1h-1z`);
        }
      }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${result.width} ${result.height}" width="${result.width}" height="${result.height}"><path fill="${settings.color}" d="${paths.join('')}"/></svg>`;
      return download(new Blob([svg], { type: 'image/svg+xml' }), name);
    }

    if (type === 'jpeg') {
      const canvas = document.createElement('canvas');
      canvas.width = result.width;
      canvas.height = result.height;
      const context = canvas.getContext('2d');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(result, 0, 0);
      return canvas.toBlob((blob) => download(blob, name), 'image/jpeg', 0.92);
    }
    result.toBlob((blob) => download(blob, name), `image/${type}`, 0.92);
  }

  function openGalleryDatabase() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('Local browser storage is unavailable'));
    if (!galleryDbPromise) {
      galleryDbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(GALLERY_DB, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(GALLERY_STORE)) {
            request.result.createObjectStore(GALLERY_STORE, { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Could not open local gallery'));
        request.onblocked = () => reject(new Error('The local gallery is open in another tab'));
      });
    }
    return galleryDbPromise;
  }

  async function galleryRequest(mode, runRequest) {
    const database = await openGalleryDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(GALLERY_STORE, mode);
      const request = runRequest(transaction.objectStore(GALLERY_STORE));
      let value;
      request.onsuccess = () => { value = request.result; };
      request.onerror = () => reject(request.error || new Error('Gallery request failed'));
      transaction.oncomplete = () => resolve(value);
      transaction.onerror = () => reject(transaction.error || new Error('Gallery transaction failed'));
      transaction.onabort = () => reject(transaction.error || new Error('Gallery transaction was cancelled'));
    });
  }

  function makeGalleryPreview() {
    return new Promise((resolve) => {
      const scale = Math.min(1, 320 / result.width, 240 / result.height);
      const preview = document.createElement('canvas');
      preview.width = Math.max(1, Math.round(result.width * scale));
      preview.height = Math.max(1, Math.round(result.height * scale));
      preview.getContext('2d').drawImage(result, 0, 0, preview.width, preview.height);
      preview.toBlob(resolve, 'image/jpeg', 0.86);
    });
  }

  async function saveCurrentToGallery() {
    if (!currentAsset || !lastOutput) return toast('Wait for processing to finish before saving');
    const saveButton = $('#saveToGallery');
    const asset = currentAsset;
    const name = $('#fileName').textContent;
    const savedSettings = { ...settings };
    saveButton.disabled = true;
    try {
      const preview = await makeGalleryPreview();
      const sourceBlob = new Blob([asset], { type: asset.type || 'image/png' });
      const item = {
        id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        createdAt: Date.now(),
        source: sourceBlob,
        preview,
        settings: savedSettings,
      };
      await galleryRequest('readwrite', (store) => store.put(item));
      await refreshGalleryCount();
      toast('Saved to this device’s gallery');
      if (!$('#galleryModal').hidden) await renderGallery();
    } catch (error) {
      console.error(error);
      toast('Could not save to the local gallery');
      $('#galleryStatus').textContent = error.message;
    } finally {
      saveButton.disabled = !currentAsset || !lastOutput || processing;
    }
  }

  async function refreshGalleryCount() {
    try {
      const items = await galleryRequest('readonly', (store) => store.getAll());
      $('#galleryCount').textContent = items.length;
    } catch (error) {
      $('#galleryCount').textContent = '0';
    }
  }

  async function renderGallery() {
    const grid = $('#galleryGrid');
    galleryObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    galleryObjectUrls = [];
    grid.replaceChildren();
    const items = await galleryRequest('readonly', (store) => store.getAll());
    items.sort((a, b) => b.createdAt - a.createdAt);
    $('#galleryCount').textContent = items.length;
    $('#galleryEmpty').hidden = items.length > 0;
    $('#galleryStatus').textContent = items.length ? `${items.length} saved image${items.length === 1 ? '' : 's'} · stored on this device` : '';

    for (const item of items) {
      const card = document.createElement('article');
      card.className = 'gallery-item';
      const image = document.createElement('img');
      image.alt = `Preview of ${item.name}`;
      const imageUrl = URL.createObjectURL(item.preview || item.source);
      galleryObjectUrls.push(imageUrl);
      image.src = imageUrl;
      const info = document.createElement('div');
      info.className = 'gallery-item-info';
      const title = document.createElement('b');
      title.textContent = item.name;
      const date = document.createElement('small');
      date.textContent = new Date(item.createdAt).toLocaleString();
      info.append(title, date);
      const actions = document.createElement('div');
      actions.className = 'gallery-item-actions';
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'button primary compact';
      open.textContent = 'Open image';
      open.addEventListener('click', () => {
        const file = new File([item.source], item.name, { type: item.source.type || 'image/png' });
        closeModal($('#galleryModal'));
        loadFile(file, item.settings);
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'button secondary compact';
      remove.textContent = 'Remove';
      remove.setAttribute('aria-label', `Remove ${item.name} from gallery`);
      remove.addEventListener('click', async () => {
        try {
          await galleryRequest('readwrite', (store) => store.delete(item.id));
          await renderGallery();
        } catch (error) {
          $('#galleryStatus').textContent = 'Could not remove this image from the gallery.';
        }
      });
      actions.append(open, remove);
      card.append(image, info, actions);
      grid.append(card);
    }
  }

  async function openGallery() {
    openModal($('#galleryModal'), '#galleryClose');
    $('#galleryStatus').textContent = 'Loading saved images…';
    try {
      await renderGallery();
    } catch (error) {
      $('#galleryEmpty').hidden = false;
      $('#galleryGrid').replaceChildren();
      $('#galleryStatus').textContent = 'Local gallery is not available in this browser session.';
    }
  }

  function clearImage() {
    fileLoadToken++;
    basePixels = null;
    currentAsset = null;
    processing = false;
    lastOutput = null;
    lastEdge = null;
    comparing = false;
    sequence++;
    $('#file').value = '';
    setCanvasSize(source, 1, 1);
    setCanvasSize(grayCanvas, 1, 1);
    setCanvasSize(result, 1, 1);
    $('#sourcePlaceholder').hidden = false;
    $('#grayPlaceholder').hidden = false;
    $('#resultPlaceholder').hidden = false;
    $('#grayPlaceholder').querySelector('b').textContent = 'Grayscale preview';
    $('#grayPlaceholder').querySelector('small').textContent = 'It will appear after an image is loaded';
    $('#resultPlaceholder').querySelector('b').textContent = 'Processed result';
    $('#resultPlaceholder').querySelector('small').textContent = 'Choose an image to start processing';
    $('#fileName').textContent = 'No image loaded';
    $('#dimensions').textContent = '';
    $('#reset').disabled = true;
    $('#saveToGallery').disabled = true;
    history = [];
    historyIndex = -1;
    updateHistoryButtons();
    status('Ready');
  }

  function resetAll() {
    Object.assign(settings, defaults);
    sync();
    saveHistory();
    render();
  }

  const PRESET_KEY = 'boundarylab-local-presets-v1';
  const builtInPresets = {
    'Clean Outline': { style: 'outline', edgeMethod: 'canny', low: 31, high: 86, cleanup: 1, edgeThickness: 1, brightness: 0, contrast: 8, rotation: 0, color: '#087967', invert: false, transparent: true, autoNormalize: true, morphology: 'off' },
    'Detailed Outline': { style: 'outline', edgeMethod: 'canny', low: 18, high: 58, cleanup: 1, edgeThickness: 1, brightness: 0, contrast: 14, rotation: 0, color: '#087967', invert: false, transparent: true, autoNormalize: true, morphology: 'off' },
    'Bold Outline': { style: 'outline', edgeMethod: 'canny', low: 23, high: 70, cleanup: 1, edgeThickness: 3, brightness: 0, contrast: 18, rotation: 0, color: '#087967', invert: false, transparent: false, autoNormalize: true, morphology: 'close' },
    'Sketch Style': { style: 'coloring', edgeMethod: 'sobel', low: 34, high: 88, cleanup: 2, edgeThickness: 1, brightness: 8, contrast: 14, rotation: 0, color: '#087967', invert: false, transparent: false, autoNormalize: true, morphology: 'open' },
    'Technical Drawing': { style: 'blueprint', edgeMethod: 'sobel', low: 42, high: 92, cleanup: 1, edgeThickness: 1, brightness: 0, contrast: 20, rotation: 0, color: '#5685ff', invert: false, transparent: false, autoNormalize: true, morphology: 'close' },
    'Stencil Style': { style: 'edge-map', edgeMethod: 'canny', low: 30, high: 86, cleanup: 2, edgeThickness: 2, brightness: 5, contrast: 32, rotation: 0, color: '#ffffff', invert: false, transparent: false, autoNormalize: true, morphology: 'close-open' },
  };

  function readLocalPresets() {
    try {
      const saved = JSON.parse(localStorage.getItem(PRESET_KEY) || '{}');
      return saved && typeof saved === 'object' ? saved : {};
    } catch {
      return {};
    }
  }

  function writeLocalPresets(presets) {
    try {
      localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
      return true;
    } catch {
      toast('Browser storage is unavailable for presets');
      return false;
    }
  }

  function refreshPresetMenu() {
    const select = $('#presetSelect');
    if (!select) return;
    const local = readLocalPresets();
    select.replaceChildren(new Option('Presets', ''));
    const addGroup = (label, records) => {
      const group = document.createElement('optgroup');
      group.label = label;
      Object.keys(records).sort().forEach((name) => group.append(new Option(name, `${label}:${name}`)));
      select.append(group);
    };
    addGroup('Built in', builtInPresets);
    if (Object.keys(local).length) addGroup('Saved on this device', local);
  }

  function applyPreset(reference) {
    if (!reference) return;
    const [group, ...parts] = reference.split(':');
    const name = parts.join(':');
    const source = group === 'Built in' ? builtInPresets : readLocalPresets();
    const preset = source[name];
    if (!preset) return toast('That preset is no longer available');
    Object.assign(settings, { ...defaults, ...preset });
    sync();
    saveHistory();
    render();
    toast(`Applied ${name}`);
  }

  function savePreset() {
    const name = window.prompt('Name this local preset');
    if (!name || !name.trim()) return;
    const presets = readLocalPresets();
    presets[name.trim().slice(0, 48)] = { ...settings };
    if (writeLocalPresets(presets)) {
      refreshPresetMenu();
      toast('Preset saved on this device');
    }
  }

  function exportProjectSettings() {
    const project = { format: 'boundarylab-browser-settings', version: 1, createdAt: new Date().toISOString(), settings: { ...settings } };
    download(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }), `${filename || 'boundarylab'}-settings.json`);
  }

  function importProjectSettings(file) {
    if (!file) return;
    if (file.size > 128 * 1024) return toast('Settings file is too large');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const project = JSON.parse(String(reader.result));
        if (!project || project.format !== 'boundarylab-browser-settings' || !project.settings) throw new Error('invalid');
        Object.assign(settings, { ...defaults, ...project.settings });
        sync();
        saveHistory();
        render();
        toast('Settings imported');
      } catch {
        toast('Choose a valid BoundaryLab settings file');
      }
    };
    reader.readAsText(file);
  }

  function setTheme(theme) {
    const isLight = theme === 'light';
    document.body.dataset.theme = isLight ? 'light' : 'dark';
    document.documentElement.style.colorScheme = isLight ? 'light' : 'dark';
    $('#themeIcon').textContent = isLight ? '☾' : '☼';
    $('#themeLabel').textContent = isLight ? 'Dark' : 'Light';
    $('#themeToggle').setAttribute('aria-label', `Switch to ${isLight ? 'dark' : 'light'} theme`);
    $('#themeToggle').title = `Switch to ${isLight ? 'dark' : 'light'} theme`;
    try { localStorage.setItem('boundarylab-theme', isLight ? 'light' : 'dark'); } catch { /* Storage can be disabled. */ }
  }

  function openGuide() {
    openModal($('#guideModal'), '#guideClose');
  }

  $('#file').addEventListener('change', (event) => loadFile(event.target.files[0]));
  $$('.control-label select, .range-label input, .toggle-row input').forEach((element) => {
    element.addEventListener('input', () => {
      const settingById = {
        style: 'style', edgeMethod: 'edgeMethod', threshold: 'low', highThreshold: 'high',
        cleanup: 'cleanup', edgeThickness: 'edgeThickness', brightness: 'brightness', contrast: 'contrast',
        sketchVariant: 'sketchVariant', stencilOffset: 'stencilOffset', blueprintGrid: 'blueprintGrid', gridSpacing: 'gridSpacing',
        rotation: 'rotation', color: 'color', invert: 'invert', transparent: 'transparent', autoNormalize: 'autoNormalize', morphology: 'morphology',
      };
      settings[settingById[element.id]] = element.type === 'checkbox'
        ? element.checked
        : element.type === 'range' ? Number(element.value) : element.value;
      saveHistory();
      schedule();
    });
  });

  $('#defaults').addEventListener('click', resetAll);
  $('#reset').addEventListener('click', clearImage);
  $('#saveToGallery').addEventListener('click', saveCurrentToGallery);
  $('#galleryButton').addEventListener('click', openGallery);
  $('#presetSelect')?.addEventListener('change', (event) => {
    applyPreset(event.target.value);
    event.target.value = '';
  });
  $('#savePreset')?.addEventListener('click', savePreset);
  $('#exportProject')?.addEventListener('click', exportProjectSettings);
  $('#importProject')?.addEventListener('change', (event) => {
    importProjectSettings(event.target.files[0]);
    event.target.value = '';
  });
  $$('.quick-presets [data-quick-preset]').forEach((button) => button.addEventListener('click', () => applyPreset(`Built in:${button.dataset.quickPreset}`)));
  $('#simpleDetail').addEventListener('input', (event) => { settings.low = Math.round(80 - Number(event.target.value) * .55); settings.high = Math.min(255, settings.low + 50); saveHistory(); schedule(); });
  $('#simpleSmoothness').addEventListener('input', (event) => { settings.cleanup = Math.round(Number(event.target.value) / 25); saveHistory(); schedule(); });
  $('#simpleThickness').addEventListener('input', (event) => { settings.edgeThickness = Number(event.target.value); saveHistory(); schedule(); });
  $('#simpleContrast').addEventListener('input', (event) => { settings.contrast = Number(event.target.value); saveHistory(); schedule(); });
  $('#autoEnhance').addEventListener('click', () => { if (!basePixels) return toast('Open an image first'); Object.assign(settings, { autoNormalize: true, cleanup: 1, low: 26, high: 76, contrast: 12, morphology: 'close' }); sync(); saveHistory(); render(); toast('Auto enhancement applied'); });
  $('#undo').addEventListener('click', () => {
    if (historyIndex <= 0) return;
    historyIndex--;
    Object.assign(settings, history[historyIndex]);
    sync();
    updateHistoryButtons();
    render();
  });
  $('#redo').addEventListener('click', () => {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    Object.assign(settings, history[historyIndex]);
    sync();
    updateHistoryButtons();
    render();
  });
  $$('[data-export]').forEach((button) => button.addEventListener('click', () => {
    exportAs(button.dataset.export);
    $('.export-menu').open = false;
  }));

  $('#modalClose').addEventListener('click', () => closeModal($('#modal')));
  $('#galleryClose').addEventListener('click', () => closeModal($('#galleryModal')));
  $('#guideClose').addEventListener('click', () => closeModal($('#guideModal')));
  $('#guideDone').addEventListener('click', () => closeModal($('#guideModal')));
  $$('.modal-backdrop').forEach((backdrop) => backdrop.addEventListener('click', () => closeModal(backdrop.parentElement)));
  $('#brandDashboard').addEventListener('click', openGuide);
  $$('.zoom').forEach((button) => button.addEventListener('click', () => {
    const canvases = { source, gray: grayCanvas, result };
    const titles = { source: 'Color image', gray: 'Grayscale', result: 'Processed image' };
    showCanvasModal(titles[button.dataset.zoom], canvases[button.dataset.zoom]);
  }));

  $('#compare').addEventListener('pointerdown', (event) => {
    if (!basePixels || !lastOutput) return;
    event.preventDefault();
    comparing = true;
    setCanvasSize(result, baseW, baseH);
    resultCtx.putImageData(new ImageData(basePixels.slice(), baseW, baseH), 0, 0);
    $('#compare').classList.add('active');
  });
  function stopCompare() {
    if (!comparing) return;
    comparing = false;
    $('#compare').classList.remove('active');
    if (basePixels) render();
  }
  $('#compare').addEventListener('pointerup', stopCompare);
  $('#compare').addEventListener('pointercancel', stopCompare);
  document.addEventListener('pointerup', stopCompare);
  document.addEventListener('pointercancel', stopCompare);

  $('#sample').addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 420;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 640, 420);
    gradient.addColorStop(0, '#d9e7e0');
    gradient.addColorStop(1, '#547d76');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 640, 420);
    context.fillStyle = '#f2c76e';
    context.beginPath();
    context.arc(320, 130, 100, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#1a3030';
    context.beginPath();
    context.moveTo(220, 130);
    context.lineTo(420, 130);
    context.lineTo(320, 380);
    context.closePath();
    context.fill();
    canvas.toBlob((blob) => {
      if (blob) loadFile(new File([blob], 'sample-boundary.png', { type: 'image/png' }));
    });
  });

  $('#camera').addEventListener('click', async () => {
    if (!navigator.mediaDevices?.getUserMedia || !isSecureContext) return toast('Camera needs a secure HTTPS page');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) loadFile(new File([blob], 'camera-capture.png', { type: 'image/png' }));
      });
    } catch (error) {
      toast(error.name === 'NotAllowedError' ? 'Allow camera permission in browser settings' : 'Camera could not start');
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
    }
  });

  $('#themeToggle').addEventListener('click', () => {
    setTheme(document.body.dataset.theme === 'light' ? 'dark' : 'light');
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!$('#galleryModal').hidden) closeModal($('#galleryModal'));
      if (!$('#guideModal').hidden) closeModal($('#guideModal'));
      if (!$('#modal').hidden) closeModal($('#modal'));
    }
  });
  document.addEventListener('dragover', (event) => event.preventDefault());
  document.addEventListener('drop', (event) => {
    event.preventDefault();
    loadFile(event.dataTransfer.files[0]);
  });

  try {
    setTheme(localStorage.getItem('boundarylab-theme') || 'dark');
  } catch {
    setTheme('dark');
  }
  sync();
  updateHistoryButtons();
  refreshPresetMenu();
  refreshGalleryCount();

  // Specialised workspace links reuse the existing, proven Image Studio engine.
  // Built-in presets remain available in the original Image Studio menu.
  const workspacePresets = {
    'clean-outline': 'Clean Outline',
    'detailed-outline': 'Detailed Outline',
    'bold-outline': 'Bold Outline',
    blueprint: 'Technical Drawing',
    sketch: 'Sketch Style',
    'technical-drawing': 'Technical Drawing',
    stencil: 'Stencil Style',
  };
  const requestedWorkspace = new URLSearchParams(window.location.search).get('workspace');
  if (requestedWorkspace && workspacePresets[requestedWorkspace]) {
    applyPreset('Built in:' + workspacePresets[requestedWorkspace]);
    settings.workspaceMode = requestedWorkspace;
    document.body.dataset.workspace = requestedWorkspace;
    if (requestedWorkspace === 'blueprint') settings.style = 'blueprint';
    sync();
    render();
  }
})();
