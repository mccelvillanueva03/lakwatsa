import { test, expect } from '@playwright/test';
test.setTimeout(60000);
test('planner creates, member claims and votes, planner finalizes and records exact payment', async ({
  page,
  browser,
}, info) => {
  await page.goto('/register');
  await page.getByLabel('Email').fill(`browser-${Date.now()}-${info.project.name}@e2e.test`);
  await page.getByLabel('Password', { exact: true }).fill('my excellent password');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.getByRole('link', { name: 'Plan a trip' }).first().click();
  await page.getByLabel('Trip name').fill('Our beach escape');
  await page.getByLabel('Member names').fill('Ana\nBen');
  await page.getByLabel('Destination options').fill('La Union\nBaguio');
  for (const i of [1, 2]) {
    await page
      .getByLabel(`Start ${i}`, { exact: true })
      .fill(`2026-12-${i === 1 ? '01' : '08'}T10:00`);
    await page
      .getByLabel(`End ${i}`, { exact: true })
      .fill(`2026-12-${i === 1 ? '02' : '09'}T12:00`);
  }
  await page.getByLabel('Per-member amount options').fill('1000.10\n1500.20');
  await page.getByLabel('Destination options').fill('La Union\nLa Union');
  await page.getByRole('button', { name: 'Create trip', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Remove duplicate destinations.' }),
  ).toBeVisible();
  await expect(page.getByLabel('Trip name')).toHaveValue('Our beach escape');
  await expect(page.getByLabel('Member names')).toHaveValue('Ana\nBen');
  await expect(page.getByLabel('Destination options')).toHaveValue('La Union\nLa Union');
  await expect(page.getByLabel('Start 1', { exact: true })).toHaveValue('2026-12-01T10:00');
  await page.getByLabel('Destination options').fill('La Union\nBaguio');
  await page.getByRole('button', { name: 'Create trip', exact: true }).click();
  await expect(page.getByText('Your private trip code')).toBeVisible();
  const code = (await page.locator('.invite-box .font-mono').innerText()).replaceAll('-', '');
  const manage = await page.getByRole('link', { name: 'Manage your trip' }).getAttribute('href');
  const memberContext = await browser.newContext({
    viewport:
      info.project.name === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
  });
  const member = await memberContext.newPage();
  await member.goto(`/invite?code=${code}`);
  await expect(member).toHaveURL(/entry/);
  await member.getByLabel('Your name').selectOption({ label: 'Ana' });
  await member.getByRole('button', { name: 'Join as member' }).click();
  await page.goto(manage!);
  await expect(page.getByTestId('trip-code')).toHaveText(code.match(/.{1,4}/g)!.join('-'));
  await page.reload();
  await expect(page.getByTestId('trip-code')).toHaveText(code.match(/.{1,4}/g)!.join('-'));
  await page.goto('/dashboard');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          document.body.dataset.copiedInvite = text;
        },
      },
      configurable: true,
    });
  });
  await page.getByRole('button', { name: 'Share Our beach escape', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Invite link copied.' })).toBeVisible();
  expect(await page.locator('body').getAttribute('data-copied-invite')).toContain(
    `/invite?code=${code}`,
  );
  await page.goto(manage!);
  await member.getByLabel('Destination vote').selectOption({ label: 'Baguio' });
  await member.getByRole('button', { name: 'Save destination vote' }).click();
  await expect(member.getByText('Vote saved.')).toBeVisible();
  await expect(page.getByText('1 vote', { exact: true })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole('button', { name: 'Finalize trip', exact: true }).click();
  await page.getByLabel('Date decision').selectOption({ index: 1 });
  await page.getByLabel('Contribution decision').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Confirm and close voting' }).click();
  await expect(page.getByText('Voting is closed')).toBeVisible();
  const payment = page.getByTestId('payment-Ana');
  await payment.getByLabel('Amount paid').fill('1200.25');
  await payment.getByRole('button', { name: 'Update payment' }).click();
  await expect(payment.getByRole('status')).toContainText('Saved.');
  await member.reload();
  await expect(member.getByText('Paid 1,200.25', { exact: true })).toBeVisible();
  await expect(member.getByLabel('Destination vote')).toHaveCount(0);
  await page.getByText('Need a new code?', { exact: true }).click();
  await page.getByRole('button', { name: 'Generate new access code', exact: true }).click();
  await expect(page.getByTestId('trip-code')).not.toHaveText(code.match(/.{1,4}/g)!.join('-'));
  const replacement = await page.getByTestId('trip-code').innerText();
  await page.reload();
  await expect(page.getByTestId('trip-code')).toHaveText(replacement);
  await member.goto(`/invite?code=${code}`);
  await expect(member.getByRole('alert').filter({ hasText: 'Invalid trip code.' })).toBeVisible();
  await memberContext.close();
  await page.screenshot({
    path: `test-results/planned-${info.project.name}.png`,
    fullPage: true,
  });
});
test('direct Planned trip without contributions skips claims and payment UI', async ({
  page,
  browser,
}, info) => {
  await page.goto('/register');
  await page.getByLabel('Email').fill(`direct-${Date.now()}-${info.project.name}@e2e.test`);
  await page.getByLabel('Password', { exact: true }).fill('my excellent password');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByRole('link', { name: 'Plan a trip' }).first().click();
  await page.getByLabel('Trip name').fill('Settled staycation');
  await page.getByLabel('How far along').selectOption('PLANNED');
  await page.getByLabel('Member names').fill('Ana');
  await page.getByLabel('Settled destination').fill('Tagaytay');
  await page.getByLabel('Start 1', { exact: true }).fill('2026-12-20T10:00');
  await page.getByLabel('End 1', { exact: true }).fill('2026-12-21T10:00');
  await page.getByLabel('Track member contributions').uncheck();
  await page.getByRole('button', { name: 'Create trip', exact: true }).click();
  await expect(page.getByText('Your private trip code')).toBeVisible();
  const code = (await page.locator('.invite-box .font-mono').innerText()).replaceAll('-', '');
  const visitor = await browser.newContext();
  const view = await visitor.newPage();
  await view.goto(`/invite?code=${code}`);
  await expect(view.getByRole('heading', { name: 'Settled staycation' })).toBeVisible();
  await expect(view.getByLabel('Your name')).toHaveCount(0);
  await expect(view.getByText('Contribution progress')).toHaveCount(0);
  await visitor.close();
});
