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
  let lastFocused = null;
  let fileLoadToken = 0;

  const defaults = {
    style: 'outline', edgeMethod: 'sobel', low: 70, high: 150,
    cleanup: 1, rotation: 0, color: '#33cbb0', invert: false, transparent: false,
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
      rotation: settings.rotation,
      color: settings.color,
      invert: settings.invert,
      transparent: settings.transparent,
    };
    for (const [id, value] of Object.entries(controls)) {
      const element = $('#' + id);
      if (element.type === 'checkbox') element.checked = value;
      else element.value = value;
    }
    $('#tval').textContent = settings.low;
    $('#highVal').textContent = settings.high;
    $('#nval').textContent = settings.cleanup;
    $('#rval').textContent = settings.rotation + '°';
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
      status('Could not process image');
      toast('Image processing could not start');
    }
  }

  worker.onmessage = ({ data }) => {
    if (data.id !== sequence) return;
    const { width, height, gray, edge, output } = data;
    drawGray(grayCanvas, grayCtx, width, height, gray);
    setCanvasSize(result, width, height);
    resultCtx.putImageData(new ImageData(output, width, height), 0, 0);
    lastOutput = output;
    lastEdge = edge;
    $('#grayPlaceholder').hidden = true;
    $('#resultPlaceholder').hidden = true;
    $('#dimensions').textContent = `${width} × ${height}`;
    status(`Ready · ${width} × ${height}`);
  };

  worker.onerror = (error) => {
    console.error(error);
    status('Processing error');
    toast('The image processor encountered an error');
  };

  function schedule() {
    clearTimeout(debounce);
    debounce = setTimeout(render, 90);
  }

  function loadFile(file) {
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) return toast('Image exceeds the 30 MB limit');
    if (!file.type.startsWith('image/')) return toast('Choose an image file');

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
      history = [];
      historyIndex = -1;
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

  function clearImage() {
    fileLoadToken++;
    basePixels = null;
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
        cleanup: 'cleanup', rotation: 'rotation', color: 'color', invert: 'invert', transparent: 'transparent',
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
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === 'o') {
      event.preventDefault();
      $('#file').click();
    }
    if (modifier && event.key.toLowerCase() === 's') {
      event.preventDefault();
      exportAs('png');
    }
    if (modifier && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      (event.shiftKey ? $('#redo') : $('#undo')).click();
    }
    if (event.key === 'Escape') {
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
})();
