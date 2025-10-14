import os
from playwright.sync_api import sync_playwright, expect

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        file_path = os.path.join(base_dir, 'index.html')

        page.goto(f'file://{file_path}')
        page.wait_for_load_state('domcontentloaded')

        # --- Test the "Intelligent Stop" feature ---
        page.evaluate("""
            // Manually set canvas size, which normally happens on image load
            const canvas = document.getElementById('string-art-canvas');
            canvas.width = 400;
            canvas.height = 400;

            // Mock the processedImageData with a completely white image
            const size = 200;
            const mockData = new Uint8ClampedArray(size * size * 4);
            // Inverted grayscale: 0 = white for the algorithm, so all scores will be 0
            mockData.fill(0);
            window.processedImageData = new ImageData(mockData, size, size);
        """)

        # Set a high thread count that should not be reached
        page.locator("#threads-input").fill("5000")

        # Listen for the console message that indicates an early stop
        message_found = False
        def handle_console(msg):
            nonlocal message_found
            if "Stopping early" in msg.text:
                message_found = True

        page.on("console", handle_console)

        # Click the generate button
        page.get_by_role("button", name="Generate").click()

        # Wait for the progress bar to disappear, indicating completion
        expect(page.locator("#progress-overlay")).to_be_hidden(timeout=10000)

        # Assert that the early stop message was logged
        assert message_found, "The 'Intelligent Stop' feature did not trigger as expected."

        # Assert that no instructions were generated because the image was blank
        expect(page.locator("#instructions-list li")).to_have_count(0)

        # Take a screenshot for final verification
        screenshot_path = "jules-scratch/verification/intelligent_stop_test.png"
        page.screenshot(path=screenshot_path)

        browser.close()
        print(f"Screenshot saved to {screenshot_path}")

if __name__ == "__main__":
    run_verification()