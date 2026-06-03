import { expect, test } from '@playwright/test';

test('user can create, search, and ask over a note', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('i18nextLng', 'en');
    window.localStorage.setItem('llm_provider', 'demo');
    window.localStorage.setItem('llm_model', 'demo-chat');
    window.localStorage.setItem('embedding_provider', 'demo');
    window.localStorage.setItem('embedding_model', 'demo-embedding');
  });

  const email = `e2e-${Date.now()}@example.com`;
  const password = 'secret123';

  await page.goto('/register');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#confirmPassword').fill(password);
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByRole('heading', { name: 'My Notes' })).toBeVisible();

  await page.goto('/notes/new');
  await page.getByPlaceholder('Note title').fill('E2E RAG Quality Gate');
  await page.getByRole('button', { name: 'Markdown' }).click();
  await page.getByPlaceholder(/Write your note in Markdown/).fill(
    [
      '# E2E RAG Quality Gate',
      '',
      'CI should verify registration, note creation, retrieval, and RAG answer rendering.',
      'The retrieval quality gate checks that source-backed answers can find this note.',
    ].join('\n')
  );
  await page.getByRole('button', { name: /Save/ }).click();

  await expect(page).toHaveURL(/\/notes\/\d+/);
  await page.waitForTimeout(1500);

  await page.goto('/');
  await page.getByPlaceholder('Search notes...').fill('retrieval quality');
  await expect(page.getByRole('heading', { name: 'E2E RAG Quality Gate' })).toBeVisible();

  await page.goto('/chat');
  await page.getByPlaceholder('Ask anything about your notes...').fill('What should CI verify?');
  await page.keyboard.press('Enter');

  await expect(page.getByText('What should CI verify?')).toBeVisible();
  await expect(page.getByText(/Demo Mode|knowledge base|reliable information/)).toBeVisible();
});
