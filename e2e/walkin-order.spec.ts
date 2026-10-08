import { test, expect } from "@playwright/test";

test.describe("Addis Photography Studio Critical User Workflows", () => {
  test("Staff walk-in counter fast order creation and instant delivery", async ({ page }) => {
    // Navigate to today dashboard
    await page.goto("/today");
    await expect(page).toHaveTitle(/Addis Photography/i);

    // Click New Walk-In
    await page.click('text="New Walk-In"');
    await expect(page).toHaveURL(/.*orders\/new/);

    // Fill customer info
    await page.fill('input[placeholder*="09XXXXXXXX"]', "0911554433");
    await page.fill('input[placeholder*="Abebe Kebede"]', "Meron Alemu");

    // Select service package
    const select = page.locator("select").first();
    await select.selectOption({ index: 0 });

    // Verify 1-click Save & Mark Delivered button is present
    const saveAndDeliverBtn = page.locator('text="Save & Mark Delivered"');
    await expect(saveAndDeliverBtn).toBeVisible();

    // Submit instant delivery
    await saveAndDeliverBtn.click();

    // Verify order created notice with order number and print receipt option
    await expect(page.locator('text="Order Successfully Created"')).toBeVisible();
    await expect(page.locator('text="Delivered at Counter"')).toBeVisible();
    await expect(page.locator('text="Print Receipt"')).toBeVisible();
  });

  test("Public album viewer with PIN protection", async ({ page }) => {
    // Go to private album link
    await page.goto("/a/bethlehem-wedding-2026");

    // Expect locked pin prompt
    await expect(page.locator('text="Private Album"')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Enter incorrect PIN
    await page.fill('input[type="password"]', "0000");
    await page.click('button:has-text("Unlock Album")');
    await expect(page.locator('text="Incorrect PIN"')).toBeVisible();

    // Enter correct PIN
    await page.fill('input[type="password"]', "2026");
    await page.click('button:has-text("Unlock Album")');

    // Verify gallery is unlocked
    await expect(page.locator('text="Bethlehem & Dawit Wedding Ceremony"')).toBeVisible();
    await expect(page.locator('text="Photos & Videos"')).toBeVisible();
  });
});
