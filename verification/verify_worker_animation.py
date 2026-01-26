from playwright.sync_api import Page, expect, sync_playwright
import time

def test_worker_animation(page: Page):
    # 1. Go to the app
    page.goto("http://localhost:5175")

    # 2. Check if modal is gone (optional, but good)
    # The 'apiKey' check in ApiKeyModal returns null if key exists.

    # 3. Start the game
    # Use get_by_role to be specific
    start_button = page.get_by_role("button", name="START")
    expect(start_button).to_be_visible()
    start_button.click()

    # 4. Wait for simulation
    # We want to see workers moving and potentially working
    print("Simulating for 15 seconds to catch worker animations...")
    time.sleep(15)

    # 5. Take screenshot
    page.screenshot(path="verification/worker_animation.png")
    print("Screenshot taken at verification/worker_animation.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create context with storage init script
        context = browser.new_context()
        context.add_init_script("sessionStorage.setItem('openai_api_key', 'sk-test-key-mock');")

        page = context.new_page()
        try:
            test_worker_animation(page)
        finally:
            browser.close()
