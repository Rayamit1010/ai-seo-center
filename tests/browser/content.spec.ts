import { expect, loginAs, seedWebhookProject, test } from "./fixtures";

test("content workspace publishes HTML to the configured CMS webhook", async ({
  page,
  testAccount,
}) => {
  await seedWebhookProject(testAccount.userId, {
    name: "Content Publish Project",
    websiteUrl: "https://content-publish.example",
  });

  await loginAs(page, testAccount);
  await page.goto("/content");

  await page.getByRole("tab", { name: "CMS Publish" }).click();
  await page.getByPlaceholder("AI SEO content workflow guide").fill("Browser Publish Title");
  await page.getByPlaceholder("ai-seo-content-workflow-guide").fill("browser-publish-title");
  await page.getByPlaceholder("Short summary used by the CMS excerpt field.").fill("A concise browser test excerpt.");
  await page
    .getByPlaceholder("<h1>Article title</h1><p>Content...</p>")
    .fill("<h1>Browser publish title</h1><p>Browser integration content.</p>");

  await page.getByRole("button", { name: "Publish to CMS" }).click();

  await expect(page.getByTestId("cms-publish-feedback")).toContainText(
    /Published successfully\./,
    { timeout: 15_000 }
  );
});
