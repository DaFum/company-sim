from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    page.goto("http://localhost:5174")
    page.evaluate("sessionStorage.setItem('openai_api_key', 'dummy')")
    page.reload()

    try:
        page.get_by_role("button", name="START").click()
    except:
        pass

    time.sleep(3)

    page.screenshot(path="furnished_office.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as p:
        run(p)
