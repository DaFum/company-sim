from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Capture console logs
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
    page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

    # Go to app
    page.goto("http://localhost:5174")

    # Inject API key
    page.evaluate("sessionStorage.setItem('openai_api_key', 'dummy-key')")
    page.reload()

    page.wait_for_load_state('networkidle')

    try:
        start_btn = page.get_by_role("button", name="START")
        start_btn.wait_for(timeout=5000)
    except:
        print("Start button not found.")
        browser.close()
        return

    # Click Start
    print("Clicking Start...")
    start_btn.click()

    # Wait
    time.sleep(3)

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
