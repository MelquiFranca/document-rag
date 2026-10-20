import { expect, test } from "@playwright/test";

test("exibe o corpus e permite auditar a pergunta principal", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Audite a resposta, não apenas a busca." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Linha do tempo" })).toBeVisible();
  await page.getByRole("button", { name: "Executar auditoria →" }).click();
  await expect(page.getByText(/7 dias/i)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Evidências verificadas" })).toBeVisible();
});

test("uma versão antiga funciona como foco, não como vigência", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Política de Reembolso 2025/ }).click();
  await expect(page.getByText("Foco: reimbursement-2025")).toBeVisible();
  await page.getByRole("button", { name: "Executar auditoria →" }).click();
  await expect(page.getByText(/7 dias/i)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/15 dias/i)).toBeVisible();
});
