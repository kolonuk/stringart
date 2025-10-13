document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('image-upload');
    const shapeSelect = document.getElementById('shape-select');
    const pinsInput = document.getElementById('pins-input');
    const threadsInput = document.getElementById('threads-input');
    const generateBtn = document.getElementById('generate-btn');
    const originalCanvas = document.getElementById('original-canvas');
    const stringArtCanvas = document.getElementById('string-art-canvas');
    const instructionsList = document.getElementById('instructions-list');

    const originalCtx = originalCanvas.getContext('2d');
    const stringArtCtx = stringArtCanvas.getContext('2d');

    let processedImageData = null;
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
                stringArtCanvas.width = 400 * aspectRatio;
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

        // Draw image on a square canvas to make processing easier
        const hRatio = size / image.width;
        const vRatio = size / image.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShift_x = (size - image.width * ratio) / 2;
        const centerShift_y = (size - image.height * ratio) / 2;
        tempCtx.clearRect(0, 0, size, size);
        tempCtx.drawImage(image, 0, 0, image.width, image.height,
            centerShift_x, centerShift_y, image.width * ratio, image.height * ratio);


        const imageData = tempCtx.getImageData(0, 0, size, size);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const grayscale = 255 - avg; // Invert so darkness is higher value
            data[i] = grayscale;
            data[i + 1] = grayscale;
            data[i + 2] = grayscale;
        }
        processedImageData = imageData;
        console.log("Image processed");
    }

    function getPinCoordinates(numPins, shape, canvasWidth, canvasHeight) {
        const pins = [];
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        if (shape === 'circle') {
            const radius = Math.min(canvasWidth, canvasHeight) / 2 - 10;
            for (let i = 0; i < numPins; i++) {
                const angle = (i / numPins) * 2 * Math.PI;
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                pins.push({ x, y });
            }
        } else if (shape === 'square') {
            const halfSide = Math.min(canvasWidth, canvasHeight) / 2 - 10;
            const sideLength = halfSide * 2;
            const pinsPerSide = Math.floor(numPins / 4);

            // Top, Right, Bottom, Left
            for(let i = 0; i < pinsPerSide; i++) pins.push({ x: centerX - halfSide + (i/pinsPerSide) * sideLength, y: centerY - halfSide});
            for(let i = 0; i < pinsPerSide; i++) pins.push({ x: centerX + halfSide, y: centerY - halfSide + (i/pinsPerSide) * sideLength});
            for(let i = 0; i < pinsPerSide; i++) pins.push({ x: centerX + halfSide - (i/pinsPerSide) * sideLength, y: centerY + halfSide});
            for(let i = 0; i < pinsPerSide; i++) pins.push({ x: centerX - halfSide, y: centerY + halfSide - (i/pinsPerSide) * sideLength});
        }
        return pins;
    }


    function generateStringArt() {
        if (!processedImageData) {
            alert('Please upload an image first.');
            return;
        }

        const numPins = parseInt(pinsInput.value);
        const numThreads = parseInt(threadsInput.value);
        const shape = shapeSelect.value;

        const w = stringArtCanvas.width;
        const h = stringArtCanvas.height;
        stringArtCtx.fillStyle = 'white';
        stringArtCtx.fillRect(0, 0, w, h);

        const pins = getPinCoordinates(numPins, shape, w, h);

        // Draw pins
        stringArtCtx.fillStyle = 'black';
        pins.forEach(pin => {
            stringArtCtx.beginPath();
            stringArtCtx.arc(pin.x, pin.y, 2, 0, 2 * Math.PI);
            stringArtCtx.fill();
        });


        // Create a copy of the image data for the algorithm to modify
        const imgDataCopy = new Uint8ClampedArray(processedImageData.data);
        const imgWidth = processedImageData.width;

        let currentPinIndex = 0;
        const path = [0];
        const instructions = [];

        stringArtCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        stringArtCtx.lineWidth = 0.5;


        for (let i = 0; i < numThreads; i++) {
            let bestNextPin = -1;
            let maxDarkness = -Infinity;

            for (let nextPinIndex = 0; nextPinIndex < numPins; nextPinIndex++) {
                 // Don't connect to self or immediate neighbors for better patterns
                if (nextPinIndex === currentPinIndex || Math.abs(nextPinIndex - currentPinIndex) < 5) {
                    continue;
                }

                const linePixels = getLinePixels(pins[currentPinIndex], pins[nextPinIndex], w, h, imgWidth, imgWidth);
                let currentDarkness = 0;
                for (const pixel of linePixels) {
                    const index = (pixel.y * imgWidth + pixel.x) * 4;
                    currentDarkness += imgDataCopy[index];
                }

                if (currentDarkness > maxDarkness) {
                    maxDarkness = currentDarkness;
                    bestNextPin = nextPinIndex;
                }
            }

            if (bestNextPin !== -1) {
                // Draw the line on the canvas
                stringArtCtx.beginPath();
                stringArtCtx.moveTo(pins[currentPinIndex].x, pins[currentPinIndex].y);
                stringArtCtx.lineTo(pins[bestNextPin].x, pins[bestNextPin].y);
                stringArtCtx.stroke();

                // "Remove" the darkness from the image copy
                const bestLinePixels = getLinePixels(pins[currentPinIndex], pins[bestNextPin], w, h, imgWidth, imgWidth);
                for (const pixel of bestLinePixels) {
                    const index = (pixel.y * imgWidth + pixel.x) * 4;
                    imgDataCopy[index] = 0;
                    imgDataCopy[index + 1] = 0;
                    imgDataCopy[index + 2] = 0;
                }

                instructions.push({ from: currentPinIndex + 1, to: bestNextPin + 1 });
                currentPinIndex = bestNextPin;
                path.push(currentPinIndex);
            }
        }
        displayInstructions(instructions);
    }

    // Bresenham's line algorithm to get pixels
    function getLinePixels(p1, p2, canvasW, canvasH, imgW, imgH) {
        const pixels = [];
        // Scale canvas coords to image coords
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

    generateBtn.addEventListener('click', generateStringArt);
});