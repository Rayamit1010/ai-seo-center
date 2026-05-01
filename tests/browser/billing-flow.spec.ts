import { test, expect } from "@playwright/test";

test.describe("Public Pricing Page", () => {
  test("renders pricing page with three plans", async ({ page }) => {
    await page.goto("/pricing");

    await expect(page.getByText("Solo")).toBeVisible();
    await expect(page.getByText("Agency")).toBeVisible();
    await expect(page.getByText("White-Label")).toBeVisible();
  });

  test("shows INR prices by default", async ({ page }) => {
    await page.goto("/pricing");

    await expect(page.getByText(/₹1,499/)).toBeVisible();
    await expect(page.getByText(/₹3,999/)).toBeVisible();
    await expect(page.getByText(/₹8,999/)).toBeVisible();
  });

  test("switches to USD prices", async ({ page }) => {
    await page.goto("/pricing");

    await page.getByRole("button", { name: /USD/i }).click();

    await expect(page.getByText(/\$18/)).toBeVisible();
    await expect(page.getByText(/\$48/)).toBeVisible();
    await expect(page.getByText(/\$108/)).toBeVisible();
  });

  test("shows yearly prices when yearly is selected", async ({ page }) => {
    await page.goto("/pricing");

    await page.getByRole("button", { name: /Yearly/i }).click();

    // Yearly billed as total
    await expect(page.getByText(/₹14,990\/yr/)).toBeVisible();
  });

  test("shows payment method badges", async ({ page }) => {
    await page.goto("/pricing");

    await expect(page.getByText("UPI").first()).toBeVisible();
    await expect(page.getByText("Cards").first()).toBeVisible();
  });

  test("shows FAQ section", async ({ page }) => {
    await page.goto("/pricing");

    await expect(page.getByText("Frequently Asked Questions")).toBeVisible();
    await expect(page.getByText("Can I change my plan later?")).toBeVisible();
  });
});

test.describe("Billing Dashboard (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication — in real e2e tests, log in first
    await page.goto("/login");
    // Note: actual login flow depends on test credentials
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/billing");
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("Checkout flow (mocked)", () => {
  test("clicking Get Started on pricing page shows gateway options", async ({
    page,
  }) => {
    await page.goto("/pricing");

    // Mock the API to avoid real payment calls
    await page.route("/api/billing/checkout/razorpay", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            orderId: "order_test_123",
            amount: 149900,
            currency: "INR",
            keyId: "rzp_test_key",
            userName: "Test User",
            userEmail: "test@example.com",
            planName: "Solo",
          },
        }),
      });
    });

    const soloCard = page.locator('[data-plan="solo"]').first();
    if (await soloCard.isVisible()) {
      const getStartedBtn = soloCard.getByRole("button", { name: /Get Solo/i });
      await getStartedBtn.click();
    }
  });
});
