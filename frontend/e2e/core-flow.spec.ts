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
  await page.getByRole('button', { name: 'Send Code' }).click();
  await expect(page.getByText(/Dev verification code:/)).toBeVisible();
  await page.locator('#password').fill(password);
  await page.locator('#confirmPassword').fill(password);
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByRole('heading', { name: 'My Notes' })).toBeVisible();
  await page.setViewportSize({ width: 1920, height: 1080 });

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

  await page.setViewportSize({ width: 1920, height: 1080 });
  const shellMetrics = await page.evaluate(() => {
    const pageContainer = document.querySelector('.page-container');
    const notesGrid = document.querySelector('[data-testid="notes-grid"]');

    return {
      pageContainerWidth: pageContainer?.getBoundingClientRect().width ?? 0,
      notesGridColumns: notesGrid ? getComputedStyle(notesGrid).gridTemplateColumns.split(' ').length : 0,
    };
  });

  expect(shellMetrics.pageContainerWidth).toBeGreaterThan(1500);
  expect(shellMetrics.notesGridColumns).toBe(4);

  await page.goto('/chat');
  await page.getByPlaceholder('Ask anything about your notes...').fill('What should CI verify?');
  await page.keyboard.press('Enter');

  await expect(page.getByText('What should CI verify?')).toBeVisible();
  await expect(page.getByText(/Demo Mode|knowledge base|reliable information/)).toBeVisible();
});

test('split editor keeps panes internally scrollable and syncs preview scrolling', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('i18nextLng', 'en');
  });

  const email = `e2e-split-${Date.now()}@example.com`;
  const password = 'secret123';
  const longMarkdown = Array.from(
    { length: 80 },
    (_, index) => `## Section ${index + 1}\n\n- item ${index + 1}\n- more content ${index + 1}`,
  ).join('\n\n');

  await page.goto('/register');
  await page.locator('#email').fill(email);
  await page.getByRole('button', { name: 'Send Code' }).click();
  await expect(page.getByText(/Dev verification code:/)).toBeVisible();
  await page.locator('#password').fill(password);
  await page.locator('#confirmPassword').fill(password);
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByRole('heading', { name: 'My Notes' })).toBeVisible();
  await page.setViewportSize({ width: 1920, height: 1080 });

  await page.goto('/notes/new');
  await page.getByPlaceholder('Note title').fill('Split Editor Scroll Sync');
  await page.getByRole('button', { name: 'Markdown' }).click();
  await page.getByPlaceholder(/Write your note in Markdown/).fill(longMarkdown);
  await page.getByRole('button', { name: 'Split' }).click();

  const metrics = await page.evaluate(() => {
    const textarea = document.querySelector('[data-testid="split-markdown-pane"]');
    const preview = document.querySelector('[data-testid="split-preview-pane"]');

    return {
      bodyScrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      textareaClientHeight: textarea?.clientHeight ?? 0,
      textareaScrollHeight: textarea?.scrollHeight ?? 0,
      textareaWidth: textarea?.getBoundingClientRect().width ?? 0,
      previewClientHeight: preview?.clientHeight ?? 0,
      previewScrollHeight: preview?.scrollHeight ?? 0,
      previewWidth: preview?.getBoundingClientRect().width ?? 0,
    };
  });

  expect(metrics.bodyScrollHeight).toBeLessThan(metrics.viewportHeight + 120);
  expect(metrics.textareaScrollHeight).toBeGreaterThan(metrics.textareaClientHeight + 100);
  expect(metrics.previewScrollHeight).toBeGreaterThan(metrics.previewClientHeight + 100);
  expect(metrics.textareaWidth).toBeGreaterThan(760);
  expect(metrics.previewWidth).toBeGreaterThan(760);

  await page.locator('textarea').evaluate((textarea) => {
    textarea.scrollTop = 700;
    textarea.dispatchEvent(new Event('scroll', { bubbles: true }));
  });

  await expect
    .poll(async () => page.getByTestId('split-preview-pane').evaluate((preview) => preview.scrollTop))
    .toBeGreaterThan(50);

  const previewScrollBeforeClick = await page.getByTestId('split-preview-pane').evaluate((preview) => preview.scrollTop);
  await page.getByTestId('split-markdown-pane').click({ position: { x: 24, y: 24 } });
  await page.waitForTimeout(100);
  const previewScrollAfterClick = await page.getByTestId('split-preview-pane').evaluate((preview) => preview.scrollTop);

  expect(Math.abs(previewScrollAfterClick - previewScrollBeforeClick)).toBeLessThan(8);
});

test('note editor fills its pane and long AI summary scrolls inside the sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => {
    window.localStorage.setItem('i18nextLng', 'en');
  });

  const longSummary = Array.from(
    { length: 80 },
    (_, index) => `Summary point ${index + 1}: this line is intentionally long enough to wrap in the sidebar.`,
  ).join('\n');

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: { user: { id: 1, email: 'layout@example.com' } },
    });
  });

  await page.route('**/api/notes/11', async (route) => {
    await route.fulfill({
      json: {
        note: {
          id: 11,
          user_id: 1,
          title: 'Long AI Summary Layout',
          content: '<h1>Editor content</h1><p>Short body.</p>',
          markdown_content: '# Editor content\n\nShort body.',
          tags: ['layout'],
          category: 'UI',
          ai_summary: longSummary,
          ai_summary_content_hash: 'layout-summary',
          ai_summary_generated_at: '2026-06-16T00:00:00.000Z',
          created_at: '2026-06-16T00:00:00.000Z',
          updated_at: '2026-06-16T00:00:00.000Z',
        },
      },
    });
  });

  await page.goto('/notes/11');
  await expect(page.getByRole('heading', { name: 'Edit Note' })).toBeVisible();
  await expect(page.getByTestId('richtext-editor-pane')).toBeVisible();
  await expect(page.getByTestId('ai-summary-content')).toBeVisible();

  const metrics = await page.evaluate(() => {
    const editorPane = document.querySelector('[data-testid="richtext-editor-pane"]');
    const editorContent = editorPane?.querySelector('.ProseMirror');
    const summaryCard = document.querySelector('[data-testid="ai-summary-card"]');
    const summaryContent = document.querySelector('[data-testid="ai-summary-content"]');

    return {
      bodyScrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      editorPaneHeight: editorPane?.getBoundingClientRect().height ?? 0,
      editorPaneBottomGap: editorPane
        ? window.innerHeight - editorPane.getBoundingClientRect().bottom
        : 0,
      editorContentHeight: editorContent?.getBoundingClientRect().height ?? 0,
      summaryCardHeight: summaryCard?.getBoundingClientRect().height ?? 0,
      summaryContentClientHeight: summaryContent?.clientHeight ?? 0,
      summaryContentScrollHeight: summaryContent?.scrollHeight ?? 0,
    };
  });

  expect(metrics.bodyScrollHeight).toBeLessThan(metrics.viewportHeight + 120);
  expect(metrics.editorPaneBottomGap).toBeLessThan(120);
  expect(metrics.editorContentHeight).toBeGreaterThanOrEqual(metrics.editorPaneHeight - 2);
  expect(metrics.summaryCardHeight).toBeLessThan(420);
  expect(metrics.summaryContentScrollHeight).toBeGreaterThan(metrics.summaryContentClientHeight + 300);

  const richTextPane = page.getByTestId('richtext-editor-pane');
  const paneBox = await richTextPane.boundingBox();
  expect(paneBox).not.toBeNull();
  await richTextPane.click({
    position: {
      x: 40,
      y: Math.max(20, paneBox!.height - 24),
    },
  });
  await expect(page.locator('.ProseMirror')).toBeFocused();
});
