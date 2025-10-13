document.addEventListener('DOMContentLoaded', () => {
    const resultsDiv = document.getElementById('results');

    function runTest(name, testFn) {
        try {
            testFn();
            resultsDiv.innerHTML += `<p class="pass">PASS: ${name}</p>`;
        } catch (e) {
            resultsDiv.innerHTML += `<p class="fail">FAIL: ${name}</p>`;
            resultsDiv.innerHTML += `<pre>${e.stack}</pre>`;
            console.error(`Test failed: ${name}`, e);
        }
    }

    function assertEquals(expected, actual, message) {
        if (expected !== actual) {
            throw new Error(message || `Expected ${expected} but got ${actual}`);
        }
    }

    function assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    // Mocking necessary functions/variables if they are not available in test environment
    // For the functions we are testing, they are self-contained and don't need much mocking.

    runTest('getPinCoordinates: Circle', () => {
        const pins = getPinCoordinates(12, 'circle', 200, 200);
        assertEquals(12, pins.length, 'Should return 12 pins');
        // Check if first pin is on the right edge (angle 0)
        assert(Math.abs(pins[0].x - 190) < 1e-9, 'First pin x-coordinate'); // 100 + 90 * cos(0)
        assert(Math.abs(pins[0].y - 100) < 1e-9, 'First pin y-coordinate'); // 100 + 90 * sin(0)
        // Check if a pin is at the top (angle PI/2)
        assert(Math.abs(pins[3].x - 100) < 1e-9, 'Third pin x-coordinate'); // 100 + 90 * cos(PI/2)
        assert(Math.abs(pins[3].y - 10) < 1e-9, 'Third pin y-coordinate'); // 100 + 90 * sin(PI/2) -> should be 190, but canvas y is inverted. wait, radius is 90, center is 100. so 100+90 = 190. no, 100-90=10. it's correct.
    });

    runTest('getPinCoordinates: Square', () => {
        const pins = getPinCoordinates(16, 'square', 200, 200);
        assertEquals(16, pins.length, 'Should return 16 pins');
        // Top-left corner pin
        assertEquals(10, pins[0].x, 'First pin x-coordinate on top edge');
        assertEquals(10, pins[0].y, 'First pin y-coordinate on top edge');
        // Top-right corner pin
        assertEquals(190, pins[4].x, 'First pin x-coordinate on right edge');
        assertEquals(10, pins[4].y, 'First pin y-coordinate on right edge');
    });


    runTest('getLinePixels: Horizontal Line', () => {
        const pixels = getLinePixels({x: 10, y: 10}, {x: 15, y: 10}, 200, 200, 20, 20);
        // Scaling 10/200 * 20 = 1.  15/200*20 = 1.5 -> 1
        // So we are testing line from (1,1) to (1,1)
        const expectedPixels = [{x:1, y:1}];
        assertEquals(expectedPixels.length, pixels.length, "Number of pixels should match");
        for(let i=0; i<expectedPixels.length; i++){
            assertEquals(expectedPixels[i].x, pixels[i].x, `Pixel ${i} x should match`);
            assertEquals(expectedPixels[i].y, pixels[i].y, `Pixel ${i} y should match`);
        }
    });

    runTest('getLinePixels: Diagonal Line', () => {
        // Test with different coordinates to avoid scaling issues
        const pixels = getLinePixels({x: 0, y: 0}, {x: 40, y: 40}, 200, 200, 20, 20);
        // scaled coords: (0,0) to (4,4)
        const expectedPixels = [{x:0,y:0}, {x:1,y:1}, {x:2,y:2}, {x:3,y:3}, {x:4,y:4}];
        assertEquals(expectedPixels.length, pixels.length, "Number of pixels should match");
         for(let i=0; i<expectedPixels.length; i++){
            assertEquals(expectedPixels[i].x, pixels[i].x, `Pixel ${i} x should match`);
            assertEquals(expectedPixels[i].y, pixels[i].y, `Pixel ${i} y should match`);
        }
    });


    // Mocking DOM elements for tests that need them
    // This is a simplified approach. For a real app, a library like Jest with JSDOM would be better.
    if (!document.getElementById('image-upload')) {
        document.body.innerHTML += `
            <input type="file" id="image-upload">
            <select id="shape-select"></select>
            <input type="number" id="pins-input">
            <input type="number" id="threads-input">
            <button id="generate-btn"></button>
            <canvas id="original-canvas"></canvas>
            <canvas id="string-art-canvas"></canvas>
            <ol id="instructions-list"></ol>
        `;
    }
});