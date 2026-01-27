import os
import sys
from playwright.sync_api import sync_playwright

def run():
    # Only run actual browser tests if we have a target URL
    # or an explicit flag to run them.
    target_url = os.environ.get("FRONTEND_URL")

    if not target_url:
        print("Skipping Playwright verification: FRONTEND_URL not set.")
        return

    print(f"Connecting to {target_url}...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.goto(target_url)
            print("Successfully loaded page.")
            # Add basic verification logic here if needed
        except Exception as e:
            print(f"Error during verification: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run()
