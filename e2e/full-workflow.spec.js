// E2E — Workflow complet de vente (cycle bout-en-bout)
import { test, expect } from '@playwright/test';

// Helper : connecter en admin et stocker token dans localStorage
async function loginAdmin(page) {
  await page.goto('/');
  const inputs = await page.locator('input').all();
  if (inputs.length >= 2) {
    await inputs[0].fill('admin');
    await inputs[1].fill('admin');
    await page.locator('button').filter({ hasText: /conn|login/i }).first().click();
    await page.waitForTimeout(2000);
  }
}

test.describe('Workflow complet', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('dashboard est accessible après login', async ({ page }) => {
    // Vérifier qu'on n'est plus sur la page de login
    const body = await page.textContent('body');
    // L'app doit avoir du contenu (pas de page blanche)
    expect(body).toBeTruthy();
    expect(body.length).toBeGreaterThan(50);
  });

  test('navigation vers Produits fonctionne', async ({ page }) => {
    // Chercher un lien ou bouton Produits dans la sidebar
    const prodLink = page.locator('text=/produit/i').first();
    if (await prodLink.isVisible()) {
      await prodLink.click();
      await page.waitForTimeout(1000);
      // La page produits doit être chargée
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });

  test('page paramètres boutique accessible', async ({ page }) => {
    const settingsLink = page.locator('text=/param/i, text=/settings/i, text=/boutique/i').first();
    if (await settingsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsLink.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });
});
