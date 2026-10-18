import { test, expect } from '@playwright/test';
test('page bootstraps', async ({page})=>{await page.goto('/');await expect(page).toHaveTitle(/Iron Flight/);await expect(page.locator('#app')).toContainText('Iron Flight');});
