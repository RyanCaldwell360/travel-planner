import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const pw = { ryan: 'Synthetic browser Ryan 2027', lily: 'Synthetic browser Lily 2027' };
async function login(page: Page, user: 'ryan' | 'lily') {
  await page.goto('/');
  await page.getByLabel('Your name').selectOption(user);
  await page.getByLabel('Password', { exact: true }).fill(pw[user]);
  await page.getByRole('button', { name: 'Open our journal' }).click();
  await expect(page.getByRole('heading', { name: 'Let’s make 2027 a good one.' })).toBeVisible();
}
test('year-planning loop: two logins, protected fall, February deficit, multi-trip repair, saved alternative and reload', async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your story starts here.' })).toBeVisible();
  await page
    .getByLabel('Private server setup code')
    .fill(readFileSync(process.env.E2E_DATA_DIR + '/setup-code.txt', 'utf8'));
  await page.getByLabel('Ryan’s password').fill(pw.ryan);
  await page.getByLabel('Lily’s different password').fill(pw.lily);
  await page.getByRole('button', { name: 'Create private household' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back, wanderer.' })).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill(pw.ryan);
  await page.getByRole('button', { name: 'Open our journal' }).click();
  await page.getByRole('button', { name: 'Open synthetic demo journal' }).click();
  await expect(page.getByText('DEMO JOURNAL', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/year-overview.png', fullPage: true });
  await page.getByRole('button', { name: 'Add a trip', exact: true }).click();
  let dialog = page.getByRole('dialog').last();
  await dialog.getByLabel('Trip name').fill('Long February · demo');
  await dialog.getByLabel('Ryan is traveling').check();
  await dialog.getByLabel('Ryan arrives').fill('2027-02-15');
  await dialog.getByLabel('Ryan departs').fill('2027-02-19');
  await dialog.getByRole('button', { name: 'Preview year impact' }).click();
  dialog = page.getByRole('dialog').last();
  await expect(dialog.getByText(/Ryan is 8 h short on/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Find flexible-trip tradeoffs' }).click();
  await expect(dialog.getByRole('heading', { name: 'Option 1 · 2 flexible trips' })).toBeVisible();
  await expect(dialog.getByText('Remove travel on 2027-09-10 · frees 8 h')).toBeVisible();
  await expect(dialog.getByText('Remove travel on 2027-10-08 · frees 8 h')).toBeVisible();
  await page.screenshot({ path: 'test-results/tradeoff-preview.png', fullPage: true });
  await dialog.getByRole('button', { name: 'Preview this alternative' }).first().click();
  await dialog.getByLabel('Alternative name').fill('February, with fall protected');
  await dialog.getByRole('button', { name: 'Save named alternative' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Active scenario')).toHaveValue(/.+/);
  await expect(page.getByLabel('Active scenario').locator('option:checked')).toHaveText(
    'February, with fall protected · alternative',
  );
  const second = await browser.newContext();
  const lily = await second.newPage();
  await login(lily, 'lily');
  await lily
    .getByLabel('Active scenario')
    .selectOption({ label: 'February, with fall protected · alternative' });
  await expect(lily.getByRole('button', { name: /Long February · demo/ }).first()).toBeVisible();
  await lily.getByRole('button', { name: 'Add non-trip leave' }).click();
  await lily.getByLabel('What is it for?').fill('Lily appointment · demo');
  await lily.getByLabel('Person').selectOption('lily');
  await lily.getByLabel('Date', { exact: true }).fill('2027-04-01');
  await lily.getByLabel('PTO hours', { exact: true }).fill('2');
  await lily.getByRole('button', { name: 'Preview leave impact' }).click();
  await lily
    .getByRole('dialog')
    .filter({ has: lily.getByRole('heading', { name: 'Review non-trip leave', exact: true }) })
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await page.getByRole('button', { name: 'Reload shared plan', exact: true }).click();
  await expect(page.getByText('Lily appointment · demo', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('DEMO JOURNAL', { exact: true })).toBeVisible();
  await page
    .getByLabel('Active scenario')
    .selectOption({ label: 'February, with fall protected · alternative' });
  await expect(page.getByText('Lily appointment · demo', { exact: true })).toBeVisible();
  await page.getByLabel('Active scenario').selectOption('baseline');
  await expect(
    page.getByRole('button', { name: /A little September escape/ }).first(),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Long February · demo/ })).toHaveCount(0);
  await page
    .getByRole('button', { name: /Autumn by the sea/ })
    .first()
    .click();
  await expect(page.getByLabel('Trip name')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Remove trip', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Explore places', exact: true }).click();
  await page.getByRole('button', { name: /Kyoto/ }).last().click();
  await expect(page.locator('.destination-detail h2')).toHaveText('Kyoto');
  await expect(page.locator('.leaflet-interactive').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/explore-map.png', fullPage: true });
  await page.getByRole('button', { name: /^Our year/ }).click();
  await page
    .getByRole('button', { name: /A little September escape/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Check sources', exact: true }).click();
  await expect(
    page.getByText('Provider credentials are not configured. No fare has been retrieved.'),
  ).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'PTO & setup', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'PTO, on your terms.' })).toBeVisible();
  await expect(page.getByLabel('Known closing balance (hours)')).toHaveValue('40');
  await page.screenshot({ path: 'test-results/setup.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /^Our year/ }).click();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  await page.screenshot({ path: 'test-results/mobile-year.png', fullPage: true });
  expect(errors).toEqual([]);
  await second.close();
});

test('empty real setup, selectable year, precise credits, paid/required holidays, correction and real save conflict', async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  await login(page, 'ryan');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Start a real journal', exact: true }).click();
  await expect(page.getByText('DEMO JOURNAL', { exact: true })).toHaveCount(0);
  await page.getByLabel('Planning year', { exact: true }).fill('2028');
  await page.getByRole('button', { name: 'Create 2028 plan', exact: true }).click();
  await page
    .getByRole('dialog')
    .last()
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await page.getByRole('button', { name: 'PTO & setup', exact: true }).click();
  await page.getByLabel('Known closing balance (hours)').fill('40');
  await page.getByLabel('Balance as of', { exact: true }).fill('2027-12-31');
  await page.getByLabel('Payroll credit schedule').selectOption('explicit');
  await page
    .getByLabel(/Actual credit dates/)
    .fill('2028-01-15, 7.6923\n2028-02-15, 7.6923\n2028-03-15, 7.6923');
  await page.getByLabel(/Employer holidays: date/).fill('2028-01-03, 0, Synthetic paid holiday');
  await page.getByLabel(/I reviewed Ryan/).check();
  await page.getByLabel(/I confirmed the carryover rule/).check();
  await page.getByRole('button', { name: 'Preview shared input changes' }).click();
  let dialog = page.getByRole('dialog').last();
  await expect(
    dialog.getByText('Shared input changes recompute every alternative.', { exact: false }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('button', { name: 'Lily', exact: true }).click();
  await page.getByLabel('Known closing balance (hours)').fill('24');
  await page.getByLabel('Balance as of', { exact: true }).fill('2027-12-31');
  await page.getByLabel('Payroll credit schedule').selectOption('explicit');
  await page
    .getByLabel(/Employer holidays: date/)
    .fill('2028-01-03, 8, Synthetic required holiday');
  await page.getByLabel(/I reviewed Lily/).check();
  await page.getByLabel(/I confirmed the carryover rule/).check();
  await page.getByRole('button', { name: 'Preview shared input changes' }).click();
  await page
    .getByRole('dialog')
    .last()
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await page.getByRole('button', { name: /^Our year/ }).click();
  await expect(page.locator('.forecast-card.ryan .balance')).toHaveText('63.0769 h');
  await expect(page.locator('.forecast-card.lily .balance')).toHaveText('16 h');
  // A genuine overlapping edit: Lily opens an old snapshot; Ryan commits first.
  const second = await browser.newContext();
  const lily = await second.newPage();
  await login(lily, 'lily');
  await lily.getByLabel('Planning year', { exact: true }).fill('2028');
  await lily.getByRole('button', { name: 'Add non-trip leave' }).click();
  await lily.getByLabel('What is it for?').fill('Unsaved stale appointment');
  await lily.getByLabel('Date', { exact: true }).fill('2028-04-03');
  await lily.getByRole('button', { name: 'Preview leave impact' }).click();
  await page.getByRole('button', { name: 'Add non-trip leave' }).click();
  await page.getByLabel('What is it for?').fill('Saved current appointment');
  await page.getByLabel('Date', { exact: true }).fill('2028-04-04');
  await page.getByLabel('PTO hours', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Preview leave impact' }).click();
  await page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: 'Review non-trip leave', exact: true }) })
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await lily
    .getByRole('dialog')
    .filter({ has: lily.getByRole('heading', { name: 'Review non-trip leave', exact: true }) })
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await expect(lily.getByRole('alert')).toContainText('Another person saved changes.');
  await expect(lily.getByRole('button', { name: 'Download unsaved draft' })).toBeVisible();
  await page.getByRole('button', { name: 'Reload shared plan', exact: true }).click();
  await expect(page.getByText('Saved current appointment', { exact: true })).toBeVisible();
  await expect(page.getByText('Unsaved stale appointment', { exact: true })).toHaveCount(0);
  await second.close();
});

test('free Cloudflare deployment: signed email identities share and edit a named tradeoff alternative', async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  await page.goto('http://127.0.0.1:3200/__fixture/login?person=ryan');
  await page.getByRole('button', { name: 'Open synthetic demo journal' }).click();
  await page.getByRole('button', { name: 'Add a trip', exact: true }).click();
  let dialog = page.getByRole('dialog').last();
  await dialog.getByLabel('Trip name').fill('Free-hosted February · demo');
  await dialog.getByLabel('Ryan is traveling').check();
  await dialog.getByLabel('Ryan arrives').fill('2027-02-15');
  await dialog.getByLabel('Ryan departs').fill('2027-02-19');
  await dialog.getByRole('button', { name: 'Preview year impact' }).click();
  dialog = page.getByRole('dialog').last();
  await dialog.getByRole('button', { name: 'Find flexible-trip tradeoffs' }).click();
  await expect(dialog.getByRole('heading', { name: 'Option 1 · 2 flexible trips' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Preview this alternative' }).first().click();
  await dialog.getByLabel('Alternative name').fill('Shared from free deployment');
  await dialog.getByRole('button', { name: 'Save named alternative' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const other = await browser.newContext();
  const lily = await other.newPage();
  await lily.goto('http://127.0.0.1:3200/__fixture/login?person=lily');
  await lily
    .getByLabel('Active scenario')
    .selectOption({ label: 'Shared from free deployment · alternative' });
  await expect(lily.getByRole('button', { name: /Free-hosted February/ }).first()).toBeVisible();
  await lily.getByRole('button', { name: 'Add non-trip leave' }).click();
  await lily.getByLabel('What is it for?').fill('Lily saved via D1 · demo');
  await lily.getByLabel('Person').selectOption('lily');
  await lily.getByLabel('Date', { exact: true }).fill('2027-04-01');
  await lily.getByLabel('PTO hours', { exact: true }).fill('2');
  await lily.getByRole('button', { name: 'Preview leave impact' }).click();
  await lily
    .getByRole('dialog')
    .filter({ has: lily.getByRole('heading', { name: 'Review non-trip leave', exact: true }) })
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await page.getByRole('button', { name: 'Reload shared plan', exact: true }).click();
  await expect(page.getByText('Lily saved via D1 · demo', { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByLabel('Active scenario')
    .selectOption({ label: 'Shared from free deployment · alternative' });
  await expect(page.getByText('Lily saved via D1 · demo', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/cloudflare-shared-year.png', fullPage: true });
  await other.close();
});
