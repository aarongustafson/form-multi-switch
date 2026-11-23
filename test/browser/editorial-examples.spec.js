import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.route('**/*', async (route) => {
		const url = new URL(route.request().url());
		if (url.origin !== 'http://demo.test') return route.abort();
		const path =
			url.pathname === '/demo/'
				? 'demo/index.html'
				: url.pathname.slice(1);
		if (!/^(demo\/[\w.-]+|define\.js|form-multi-switch\.js)$/.test(path)) {
			return route.abort();
		}
		try {
			const body = await readFile(
				new URL(`../../${path}`, import.meta.url),
			);
			await route.fulfill({
				body,
				contentType: path.endsWith('.html')
					? 'text/html'
					: path.endsWith('.css')
						? 'text/css'
						: path.endsWith('.svg')
							? 'image/svg+xml'
							: 'text/javascript',
			});
		} catch {
			await route.abort();
		}
	});
});

test('every authored example has its own unique fragment destination', async ({
	page,
}) => {
	for (const path of ['index.html', 'esm.html', 'unpkg.html']) {
		await page.goto(`http://demo.test/demo/${path}`);
		const ids = await page
			.locator('[id]')
			.evaluateAll((elements) => elements.map((element) => element.id));
		expect(new Set(ids).size).toBe(ids.length);
		for (const example of await page.locator('.demo-section').all()) {
			const id = await example.getAttribute('id');
			expect(id).toMatch(/^[a-z][a-z0-9-]+$/);
			await page.evaluate((fragment) => {
				location.hash = fragment;
			}, id);
			await expect(example).toHaveJSProperty('id', id);
			expect(await page.locator(':target').getAttribute('id')).toBe(id);
		}
	}
});

test('the native form validates, submits, and restores its authored reset default', async ({
	page,
}) => {
	await page.goto('http://demo.test/demo/');
	await expect(page.locator('#required')).toHaveAttribute(
		'data-multi-switch-state',
		'ready',
	);
	const form = page.locator('#required-form');
	await form.getByRole('button', { name: 'Validate preference' }).click();
	await expect(form.locator('input[value="email"]')).toBeFocused();
	await page.keyboard.press('Space');
	await form.getByRole('button', { name: 'Validate preference' }).click();
	await expect(form.locator('output')).toHaveText('{"contact":"email"}');
	await form
		.getByRole('button', { name: 'Reset form', exact: false })
		.click();
	await expect(form.locator('input[value="email"]')).not.toBeChecked();
	await expect(form.locator('[data-selected]')).toHaveCount(0);
});

test('functional examples precede optional presentation examples', async ({
	page,
}) => {
	await page.goto('http://demo.test/demo/');
	const order = await page
		.locator('main > section')
		.evaluateAll((sections) => sections.map((section) => section.id));
	for (const id of [
		'generated-choices',
		'native-forms',
		'labels-and-languages',
		'script-loading',
		'preview-spacing',
		'interaction-events',
	]) {
		expect(order.indexOf(id)).toBeLessThan(order.indexOf('icon-choices'));
		expect(order.indexOf(id)).toBeLessThan(order.indexOf('restyling'));
	}
});

test('interaction output stays beside its own control and ignores unrelated groups', async ({
	page,
}) => {
	await page.goto('http://demo.test/demo/');
	const example = page.locator('#interaction-events');
	await expect(example.locator('form-multi-switch')).toHaveAttribute(
		'data-multi-switch-state',
		'ready',
	);
	await example.getByRole('radio', { name: 'Grid', exact: true }).focus();
	await page.keyboard.press('Space');
	await expect(example.locator('#event-log')).toContainText('change');
	await expect(example.locator('#event-log')).toContainText('"value":"grid"');
	const output = await example.locator('#event-log').textContent();
	await page
		.locator('#delivery')
		.getByRole('radio', { name: 'Express', exact: true })
		.focus();
	await page.keyboard.press('Space');
	await expect(example.locator('#event-log')).toHaveText(output);
});

test('a failed behavior keeps native choices usable and recovers with a corrected module', async ({
	page,
}) => {
	await page.goto('http://demo.test/demo/');
	const control = page.locator('#behavior');
	await expect(control).toHaveAttribute('data-multi-switch-state', 'ready');
	await control.evaluate(async (element) => {
		element.script = './failing-behavior.js';
		await element.ready.catch(() => {});
	});
	await expect(control).toHaveAttribute('data-multi-switch-state', 'error');
	await expect(
		control.getByRole('radio', { name: 'Compact', exact: true }),
	).toBeVisible();
	await control.getByRole('radio', { name: 'Compact', exact: true }).check();
	await expect(page.locator('#preview-spacing [data-status]')).toContainText(
		'could not load',
	);
	await control.evaluate(async (element) => {
		await element.refresh().catch(() => {});
		element.script = './density-behavior.js?corrected';
		await element.ready;
	});
	await expect(control).toHaveAttribute('data-multi-switch-state', 'ready');
	await expect(
		control.getByRole('radio', { name: 'Compact', exact: true }),
	).toBeChecked();
	expect(
		await page
			.locator('[data-preview]')
			.evaluate((element) => element.style.lineHeight),
	).toBe('1.2');
	await control.evaluate(async (element) => {
		element.script = null;
		await element.ready;
	});
	expect(
		await page
			.locator('[data-preview]')
			.evaluate((element) => element.style.lineHeight),
	).toBe('');
});

test('spacing initialization releases its listener and restores preview styles on disconnect', async ({
	page,
}) => {
	await page.goto('http://demo.test/demo/');
	await expect(page.locator('#behavior')).toHaveAttribute(
		'data-multi-switch-state',
		'ready',
	);
	const state = await page.locator('#behavior').evaluate(async (element) => {
		const preview = element.parentElement.querySelector('[data-preview]');
		const parent = element.parentElement;
		element.remove();
		element.dispatchEvent(new CustomEvent('form-multi-switch:change'));
		const disconnected = preview.style.lineHeight;
		parent.prepend(element);
		await element.ready;
		return { disconnected, reconnected: preview.style.lineHeight };
	});
	expect(state).toEqual({ disconnected: '', reconnected: '2.4' });
});
