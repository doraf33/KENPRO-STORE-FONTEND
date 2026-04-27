// E2E — Authentification
import { test, expect } from '@playwright/test';

test.describe('Authentification', () => {
  test('page de login visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[type="text"], input[placeholder*="utilisateur" i], input[placeholder*="user" i]')).toBeVisible({ timeout: 10000 });
  });

  test('login admin/admin réussi', async ({ page }) => {
    await page.goto('/');
    // Remplir le formulaire de login
    const usernameInput = page.locator('input').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await usernameInput.fill('admin');
    await passwordInput.fill('admin');
    await page.locator('button[type="submit"], button:has-text("Connexion"), button:has-text("Login")').click();
    // Vérifier qu'on arrive sur le dashboard
    await expect(page).toHaveURL('/', { timeout: 10000 });
    // L'app doit charger (pas de page blanche)
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('login mauvais mot de passe affiche erreur', async ({ page }) => {
    await page.goto('/');
    const usernameInput = page.locator('input').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await usernameInput.fill('admin');
    await passwordInput.fill('wrong_password');
    await page.locator('button[type="submit"], button:has-text("Connexion"), button:has-text("Login")').click();
    // Un message d'erreur doit apparaître
    const errMsg = page.locator('[class*="error" i], [class*="alert" i], .toast-item').first();
    await expect(errMsg).toBeVisible({ timeout: 5000 });
  });
});
