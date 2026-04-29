import { expect, loginAs, seedWebhookProject, test } from "./fixtures";

test("projects workspace saves memory and checks integrations", async ({
  page,
  testAccount,
}) => {
  await seedWebhookProject(testAccount.userId, {
    name: "Browser Project",
    websiteUrl: "https://browser-project.example",
  });

  await loginAs(page, testAccount);
  await page.goto("/projects");

  await page.getByRole("button", { name: /Browser Project/i }).click();
  await page
    .getByPlaceholder("Authoritative, practical, senior-operator tone")
    .fill("Operator-led and measurable");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Project memory updated")).toBeVisible();

  await page.getByRole("button", { name: "Check Connections" }).click();
  await expect(page.getByText("Latest connection check")).toBeVisible();
  await expect(page.getByText(/^Search Console:/).last()).toBeVisible();
  await expect(page.getByText(/^GA4:/).last()).toBeVisible();
  await expect(page.getByText(/^CMS:/).last()).toBeVisible();
});
