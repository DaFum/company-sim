from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Go to app to set origin for sessionStorage
    page.goto("http://localhost:5174")

    # Inject API key
    page.evaluate("sessionStorage.setItem('openai_api_key', 'dummy-key')")

    # Reload to apply
    page.reload()

    # Wait for load
    page.wait_for_load_state('networkidle')

    # Check if Modal is gone.
    # If APIKeyModal is present, it might block interaction.
    # The modal is present if apiKey is empty. We set it.

    # Find START button. It has class "pause-button".
    # Text is "START".
    start_btn = page.get_by_role("button", name="START")
    try:
        start_btn.wait_for(timeout=5000)
    except:
        print("Start button not found. Dumping content.")
        print(page.content())
        page.screenshot(path="error_state.png")
        browser.close()
        return

    # Screenshot before
    page.screenshot(path="before_start.png")
    print("Taken before_start.png")

    # Click Start
    start_btn.click()

    # Wait for game loop to tick
    time.sleep(3)

    # Screenshot after
    page.screenshot(path="after_start.png")
    print("Taken after_start.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
