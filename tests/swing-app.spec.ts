import { expect, test } from "@playwright/test";

test("golfer submits a swing and Matt sends the analysis", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Prototype tools").click();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.getByTestId("start-submission").click();

  await page.getByText("Use demo clip").click();
  await page.getByTestId("question-input").fill("Why does this swing keep fading right?");
  await page.getByTestId("payment-toggle").click();
  await page.getByTestId("submit-swing").click();

  await expect(page.getByRole("heading", { name: "Matt has your swing" })).toBeVisible();
  await page.getByText("Prototype handoff").click();
  await page.getByTestId("open-coach-workspace-from-status").click();

  await expect(page.getByRole("heading", { name: /Alex Taylor's swing/ })).toBeVisible();
  await page.getByTestId("preview-analysis").click();
  await expect(page.getByRole("heading", { name: "Golfer-facing analysis" })).toBeVisible();

  await page.getByTestId("send-analysis").click();
  await expect(page.getByRole("heading", { name: "Your analysis is ready" })).toBeVisible();
  await expect(page.getByText("Matt's breakdown")).toBeVisible();
});
