import { expect, test } from "@playwright/test";

test("loads the shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Vai Dar Volei?" })).toBeVisible();
});
