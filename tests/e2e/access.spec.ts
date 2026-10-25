import { test, expect } from "@playwright/test";
test("invalid codes stay generic and unauthenticated planners cannot open private pages", async ({
  page,
}) => {
  await page.goto("/invite?code=XXXX-XXXX-XXXX");
  await expect(
    page.getByRole("alert").filter({ hasText: "Invalid trip code." }),
  ).toBeVisible();
  await page.getByLabel("Trip code", { exact: true }).fill("XXXX-XXXX-XXXX");
  await page.getByRole("button", { name: "Find my trip" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: /^Invalid trip code\.$/ }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/sign-in/);
  await page.goto("/trips/not-a-real-id/manage");
  await expect(page).toHaveURL(/sign-in/);
  await page.goto("/trips/not-a-real-id");
  await expect(page.getByLabel("Trip code", { exact: true })).toBeVisible();
});
