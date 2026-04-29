import { expect, loginAs, seedCompletedAudit, test } from "./fixtures";

test("reports workspace generates a client-ready report from a completed audit", async ({
  page,
  testAccount,
}) => {
  await seedCompletedAudit(testAccount.userId);
  await loginAs(page, testAccount);

  await page.goto("/reports");
  await expect(page.getByText("Reports Browser Audit")).toBeVisible();

  await page.getByPlaceholder("TechGeek Studio Client").fill("Browser Client");
  await page.getByPlaceholder("Q1 SEO growth plan").fill("Browser Growth Plan");
  await page.getByPlaceholder("client@example.com").fill("client@example.com");

  await page.getByRole("button", { name: /Generate report/i }).click();

  await expect(
    page.getByRole("button", { name: "Mark ready to send" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete saved report" })
  ).toBeVisible();
});
