import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (msg.type() === 'error') console.log(`[CONSOLE ERROR] ${msg.text()}`);
    });
    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));
    page.on('requestfailed', request => console.log(`[REQUEST FAILED] ${request.url()} ${request.failure()?.errorText}`));
    
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(3000); // Attendre le chargement
    
    console.log("Recherche d'une carte dans Wishlist...");
    // Find the first card inside the Wishlist column
    // The column title is 'LISTE DE SOUHAITS'
    const wishlistCol = page.locator('div.flex-col').filter({ hasText: 'LISTE DE SOUHAITS' }).first();
    const card = wishlistCol.locator('.group.relative').first();
    
    const count = await card.count();
    if (count === 0) {
        console.log("Aucune candidature dans Wishlist.");
        await browser.close();
        process.exit();
    }
    
    console.log("Carte trouvée, drag vers POSTULÉ...");
    const appliedCol = page.locator('div.flex-col').filter({ hasText: 'POSTULÉ' }).first();
    
    await card.dragTo(appliedCol);
    
    console.log("Drag & Drop effectué, attente...");
    await page.waitForTimeout(2000);
    
    await browser.close();
    console.log("Fini.");
})();
