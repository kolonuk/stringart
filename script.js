let processedImageData = null;
window.imageState = { x: 0, y: 0, scale: 1 };
window.processedImageForPreview = null;

document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('image-upload');
    const shapeSelect = document.getElementById('shape-select');
    const pinsInput = document.getElementById('pins-input');
    const threadsInput = document.getElementById('threads-input');
    const generateBtn = document.getElementById('generate-btn');
    const originalCanvas = document.getElementById('original-canvas');
    const stringArtCanvas = document.getElementById('string-art-canvas');
    const processedCanvas = document.getElementById('processed-canvas');
    const instructionsList = document.getElementById('instructions-list');
    const progressOverlay = document.getElementById('progress-overlay');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const themeToggle = document.getElementById('checkbox');

    const originalCtx = originalCanvas.getContext('2d');
    const stringArtCtx = stringArtCanvas.getContext('2d');
    const processedCtx = processedCanvas.getContext('2d');

    let image = new Image();

    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            image = new Image();
            image.onload = () => {
                const aspectRatio = image.width / image.height;
                originalCanvas.width = 200 * aspectRatio;
                originalCanvas.height = 200;
                stringArtCanvas.width = 400;
                stringArtCanvas.height = 400;
                originalCtx.drawImage(image, 0, 0, originalCanvas.width, originalCanvas.height);
                processImage();
            };
            image.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    function processImage() {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        const size = 200;
        tempCanvas.width = size;
        tempCanvas.height = size;

        const hRatio = size / image.width;
        const vRatio = size / image.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShift_x = (size - image.width * ratio) / 2;
        const centerShift_y = (size - image.height * ratio) / 2;
        tempCtx.clearRect(0, 0, size, size);
        tempCtx.drawImage(image, 0, 0, image.width, image.height,
            centerShift_x, centerShift_y, image.width * ratio, image.height * ratio);

        const imageDataForDisplay = tempCtx.getImageData(0, 0, size, size);
        const data = imageDataForDisplay.data;
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = avg;
            data[i + 1] = avg;
            data[i + 2] = avg;
        }

        window.processedImageForPreview = imageDataForDisplay;
        window.imageState = { x: 0, y: 0, scale: 1 };
        updateAndDrawPreview();
    }

    function updateAndDrawPreview() {
        if (!window.processedImageForPreview) return;

        const w = 200;
        const h = 200;
        processedCanvas.width = w;
        processedCanvas.height = h;

        const transformedCanvas = getFinalTransformedCanvas(false);
        processedCtx.clearRect(0,0,w,h);
        processedCtx.drawImage(transformedCanvas, 0, 0);

        const saCtx = stringArtCanvas.getContext('2d');
        const saW = stringArtCanvas.width;
        const saH = stringArtCanvas.height;
        saCtx.clearRect(0, 0, saW, saH);
        saCtx.save();

        const shape = shapeSelect.value;
        if (shape === 'circle') {
            const radius = Math.min(saW, saH) / 2;
            saCtx.beginPath();
            saCtx.arc(saW / 2, saH / 2, radius, 0, 2 * Math.PI);
            saCtx.clip();
        } else if (shape === 'square') {
            const side = Math.min(saW, saH);
            saCtx.beginPath();
            saCtx.rect((saW - side) / 2, (saH - side) / 2, side, side);
            saCtx.clip();
        }

        saCtx.drawImage(transformedCanvas, 0, 0, saW, saH);
        saCtx.restore();
    }

    function getFinalTransformedCanvas(invertColors = true) {
        const size = 200;
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = size;
        finalCanvas.height = size;
        const finalCtx = finalCanvas.getContext('2d');

        finalCtx.save();
        finalCtx.translate(window.imageState.x, window.imageState.y);
        finalCtx.scale(window.imageState.scale, window.imageState.scale);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size;
        tempCanvas.height = size;
        tempCanvas.getContext('2d').putImageData(window.processedImageForPreview, 0, 0);
        finalCtx.drawImage(tempCanvas, 0, 0);
        finalCtx.restore();

        if (invertColors) {
            const imageData = finalCtx.getImageData(0, 0, size, size);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const avg = data[i];
                const invertedGrayscale = 255 - avg;
                data[i] = invertedGrayscale;
                data[i + 1] = invertedGrayscale;
                data[i + 2] = invertedGrayscale;
            }
            finalCtx.putImageData(imageData, 0, 0);
        }

        return finalCanvas;
    }

    function getPinCoordinates(numPins, shape, canvasWidth, canvasHeight) {
        const pins = [];
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        if (shape === 'circle') {
            const radius = Math.min(canvasWidth, canvasHeight) / 2 - 10;
            for (let i = 0; i < numPins; i++) {
                const angle = (i / numPins) * 2 * Math.PI;
                pins.push({ x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) });
            }
        } else if (shape === 'square') {
            const halfSide = Math.min(canvasWidth, canvasHeight) / 2 - 10;
            const sideLength = halfSide * 2;
            const pinsPerSide = Math.floor(numPins / 4);
            for(let i = 0; i < pinsPerSide; i++) pins.push({ x: centerX - halfSide + (i/pinsPerSide) * sideLength, y: centerY - halfSide});
            for(let i = 0; i < pinsPerSide; i++) pins.push({ x: centerX + halfSide, y: centerY - halfSide + (i/pinsPerSide) * sideLength});
            for(let i = 0; i < pinsPerSide; i++) pins.push({ x: centerX + halfSide - (i/pinsPerSide) * sideLength, y: centerY + halfSide});
            for(let i = 0; i < pinsPerSide; i++) pins.push({ x: centerX - halfSide, y: centerY + halfSide - (i/pinsPerSide) * sideLength});
        }
        return pins;
    }

    function runAsyncTask(task) {
        return new Promise(resolve => setTimeout(() => resolve(task()), 0));
    }

    async function generateStringArt() {
        if (!window.processedImageForPreview) {
            alert('Please upload an image first.');
            return;
        }

        const finalCanvas = getFinalTransformedCanvas(true);
        const finalCtx = finalCanvas.getContext('2d');
        const shape = shapeSelect.value;
        const size = finalCanvas.width;
        if (shape === 'circle') {
            finalCtx.globalCompositeOperation = 'destination-in';
            finalCtx.beginPath();
            finalCtx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
            finalCtx.fill();
        }
        processedImageData = finalCtx.getImageData(0, 0, size, size);

        generateBtn.disabled = true;
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
        progressOverlay.classList.remove('hidden');

        const numPins = parseInt(pinsInput.value);
        const numThreads = parseInt(threadsInput.value);
        const w = stringArtCanvas.width;
        const h = stringArtCanvas.height;

        stringArtCtx.clearRect(0,0,w,h);
        stringArtCtx.fillStyle = 'white';
        stringArtCtx.fillRect(0, 0, w, h);
        const pins = getPinCoordinates(numPins, shape, w, h);
        stringArtCtx.fillStyle = 'black';
        pins.forEach(pin => {
            stringArtCtx.beginPath();
            stringArtCtx.arc(pin.x, pin.y, 2, 0, 2 * Math.PI);
            stringArtCtx.fill();
        });

        const imgDataCopy = new Uint8ClampedArray(processedImageData.data);
        const imgWidth = processedImageData.width;
        let currentPinIndex = 0;
        const instructions = [];
        stringArtCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        stringArtCtx.lineWidth = 0.5;

        for (let i = 0; i < numThreads; i++) {
            let bestNextPin = -1;
            let maxDarkness = 0;

            await runAsyncTask(() => {
                for (let nextPinIndex = 0; nextPinIndex < numPins; nextPinIndex++) {
                    if (nextPinIndex === currentPinIndex) continue;
                    const linePixels = getLinePixels(pins[currentPinIndex], pins[nextPinIndex], w, h, imgWidth, imgWidth);
                    let currentDarkness = 0;
                    for (const pixel of linePixels) {
                        const index = (pixel.y * imgWidth + pixel.x) * 4;
                        currentDarkness += imgDataCopy[index];
                    }
                    const dx = pins[currentPinIndex].x - pins[nextPinIndex].x;
                    const dy = pins[currentPinIndex].y - pins[nextPinIndex].y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const score = currentDarkness * Math.pow(length, 0.5);
                    if (score > maxDarkness) {
                        maxDarkness = score;
                        bestNextPin = nextPinIndex;
                    }
                }
            });

            if (bestNextPin === -1 || maxDarkness < 1) {
                console.log(`Stopping early at thread ${i} because no good lines were found.`);
                break;
            }

            if (bestNextPin !== -1) {
                stringArtCtx.beginPath();
                stringArtCtx.moveTo(pins[currentPinIndex].x, pins[currentPinIndex].y);
                stringArtCtx.lineTo(pins[bestNextPin].x, pins[bestNextPin].y);
                stringArtCtx.stroke();
                const bestLinePixels = getLinePixels(pins[currentPinIndex], pins[bestNextPin], w, h, imgWidth, imgWidth);
                for (const pixel of bestLinePixels) {
                    const index = (pixel.y * imgWidth + pixel.x) * 4;
                    // More impactful bleaching
                    imgDataCopy[index] = Math.max(0, imgDataCopy[index] - 128);
                    imgDataCopy[index + 1] = Math.max(0, imgDataCopy[index + 1] - 128);
                    imgDataCopy[index + 2] = Math.max(0, imgDataCopy[index + 2] - 128);
                }
                instructions.push({ from: currentPinIndex + 1, to: bestNextPin + 1 });
                currentPinIndex = bestNextPin;
            }

            const progress = ((i + 1) / numThreads) * 100;
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${Math.round(progress)}%`;
        }

        generateBtn.disabled = false;
        progressOverlay.classList.add('hidden');
        displayInstructions(instructions);
    }

    function getLinePixels(p1, p2, canvasW, canvasH, imgW, imgH) {
        const pixels = [];
        const x1 = Math.floor(p1.x * imgW / canvasW);
        const y1 = Math.floor(p1.y * imgH / canvasH);
        const x2 = Math.floor(p2.x * imgW / canvasW);
        const y2 = Math.floor(p2.y * imgH / canvasH);
        let dx = Math.abs(x2 - x1);
        let dy = Math.abs(y2 - y1);
        let sx = (x1 < x2) ? 1 : -1;
        let sy = (y1 < y2) ? 1 : -1;
        let err = dx - dy;
        let x = x1;
        let y = y1;
        while (true) {
            if (x >= 0 && x < imgW && y >= 0 && y < imgH) {
                 pixels.push({ x, y });
            }
            if ((x === x2) && (y === y2)) break;
            let e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x += sx; }
            if (e2 < dx) { err += dx; y += sy; }
        }
        return pixels;
    }

    function displayInstructions(instructions) {
        instructionsList.innerHTML = '';
        instructions.forEach(inst => {
            const li = document.createElement('li');
            li.textContent = `From pin ${inst.from} to pin ${inst.to}`;
            instructionsList.appendChild(li);
        });
    }

    generateBtn.addEventListener('click', async () => {
        await generateStringArt();
    });

    let isDragging = false;
    let lastX, lastY;

    function getEventPosition(event) {
        if (event.touches) {
            return { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }
        return { x: event.clientX, y: event.clientY };
    }

    processedCanvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        const pos = getEventPosition(e);
        lastX = pos.x;
        lastY = pos.y;
        processedCanvas.style.cursor = 'grabbing';
    });

    processedCanvas.addEventListener('touchstart', (e) => {
        isDragging = true;
        const pos = getEventPosition(e);
        lastX = pos.x;
        lastY = pos.y;
    });

    processedCanvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const pos = getEventPosition(e);
        window.imageState.x += pos.x - lastX;
        window.imageState.y += pos.y - lastY;
        lastX = pos.x;
        lastY = pos.y;
        updateAndDrawPreview();
    });

    processedCanvas.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const pos = getEventPosition(e);
        window.imageState.x += pos.x - lastX;
        window.imageState.y += pos.y - lastY;
        lastX = pos.x;
        lastY = pos.y;
        updateAndDrawPreview();
    });

    processedCanvas.addEventListener('mouseup', () => {
        isDragging = false;
        processedCanvas.style.cursor = 'grab';
    });

    processedCanvas.addEventListener('touchend', () => {
        isDragging = false;
    });

    processedCanvas.addEventListener('mouseleave', () => {
        isDragging = false;
        processedCanvas.style.cursor = 'grab';
    });

    processedCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomIntensity = 0.1;
        const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
        window.imageState.scale += delta;
        window.imageState.scale = Math.max(0.1, window.imageState.scale);
        updateAndDrawPreview();
    });

    shapeSelect.addEventListener('change', updateAndDrawPreview);

    function setDarkMode(isDark) {
        if (isDark) {
            document.body.classList.add('dark-mode');
            themeToggle.checked = true;
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            themeToggle.checked = false;
            localStorage.setItem('theme', 'light');
        }
    }

    themeToggle.addEventListener('change', (e) => {
        setDarkMode(e.target.checked);
    });

    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        setDarkMode(true);
    } else {
        setDarkMode(false);
    }
});