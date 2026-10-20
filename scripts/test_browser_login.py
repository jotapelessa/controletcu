import asyncio
from playwright.async_api import async_playwright

async def run_tests():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            headless=True
        )
        context = await browser.new_context()
        page = await context.new_page()

        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda exc: console_logs.append(f"[PAGE ERROR] {exc}"))

        print("=== TEST 1: Initial Navigation & Modal Opening ===")
        await page.goto("http://tcu.local/", wait_until="networkidle")
        entrar_btn = page.locator("button:has-text('Entrar no Painel')").first
        await entrar_btn.wait_for(state="visible", timeout=10000)
        assert await entrar_btn.is_visible()
        print("PASS: Landing page visible.")

        await entrar_btn.click()
        modal = page.locator("#auth-modal-box")
        await modal.wait_for(state="visible", timeout=5000)
        print("PASS: Auth modal opened.")

        print("\n=== TEST 2: Close Modal via 'X' Button ===")
        close_btn = page.locator("#auth-modal-box button:has(svg.lucide-x)")
        await close_btn.click()
        await modal.wait_for(state="hidden", timeout=3000)
        assert not await modal.is_visible()
        print("PASS: Modal closed successfully via X button.")

        print("\n=== TEST 3: Invalid Credentials Handling ===")
        await entrar_btn.click()
        await modal.wait_for(state="visible", timeout=3000)
        email_input = page.locator("#auth-modal-box input[type='email']")
        pwd_input = page.locator("#auth-modal-box input[type='password']")
        await email_input.fill("wrong.user@test.com")
        await pwd_input.fill("WrongPassword123!")
        submit_btn = page.locator("#auth-modal-box button[type='submit']")
        await submit_btn.click()

        # Should show error message inside modal
        error_box = page.locator("#auth-modal-box").get_by_text("E-mail ou senha incorretos")
        await error_box.wait_for(state="visible", timeout=5000)
        assert await modal.is_visible()
        print("PASS: Invalid credentials displayed friendly error, modal stayed open.")

        print("\n=== TEST 4: Successful Login with Valid Credentials ===")
        fill_btn = page.locator("button:has-text('Preencher com credenciais de Administrador / Teste')")
        await fill_btn.click()
        await submit_btn.click()

        # Modal should close and dashboard should appear
        footer = page.locator("#superestrategico-footer")
        await footer.wait_for(state="visible", timeout=10000)
        assert not await modal.is_visible()
        print("PASS: Logged in successfully, modal closed, dashboard mounted.")

        print("\n=== TEST 5: Session Persistence Across Reload ===")
        await page.reload(wait_until="networkidle")
        await asyncio.sleep(1)
        assert await footer.is_visible()
        assert not await modal.is_visible()
        print("PASS: Session persisted on reload, no blank login modal appeared.")

        print("\n=== TEST 6: User Logout Flow ===")
        logout_btn = page.locator("button[title='Sair da conta']").first
        await logout_btn.wait_for(state="visible", timeout=5000)
        await logout_btn.click()

        # Should return to landing page, modal should not be visible
        await entrar_btn.wait_for(state="visible", timeout=5000)
        assert not await modal.is_visible()
        assert not await footer.is_visible()
        print("PASS: Logged out successfully, returned to landing page without modal popup.")

        await browser.close()
        print("\nALL 6 E2E BROWSER TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(run_tests())
