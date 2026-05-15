import sys
import asyncio
from playwright.async_api import async_playwright

async def fetch_html(url: str):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        await page.goto(url, wait_until="domcontentloaded", timeout=15000)
        content = await page.content()
        await browser.close()
        # Print content to stdout so the parent process can read it
        # Try to avoid printing anything else
        print(content)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Enforce UTF-8 for Windows output
        sys.stdout.reconfigure(encoding='utf-8')
        asyncio.run(fetch_html(sys.argv[1]))
