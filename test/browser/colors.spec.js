import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const paths = [
	'form-multi-switch.js',
	'form-multi-switch.css',
	'define.js',
	'test/browser.html',
	'test/browser.js',
	'demo/index.html',
	'demo/esm.html',
	'demo/unpkg.html',
	'demo/styles.css',
	'demo/demo.js',
	'demo/view-behavior.js',
	'demo/density-behavior.js',
	'demo/failing-behavior.js',
	'demo/monitor.svg',
	'demo/sun.svg',
	'demo/moon.svg',
];
const files = new Map(
	await Promise.all(
		paths.map(async (path) => [
			`/${path}`,
			await readFile(new URL(`../../${path}`, import.meta.url), 'utf8'),
		]),
	),
);

test.beforeEach(async ({ page }) => {
	await page.route('**/*', async (route) => {
		const path = new URL(route.request().url()).pathname;
		const body = files.get(path);
		if (body === undefined) {
			await route.abort();
			return;
		}
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
	});
});

async function fixture(page, { external = false, palette } = {}) {
	if (palette) {
		await page.route('**/form-multi-switch.*', async (route) => {
			const path = new URL(route.request().url()).pathname;
			let body = files.get(path);
			for (const [token, value] of Object.entries(palette)) {
				body = body.replace(new RegExp(`\\b${token}\\b`, 'g'), value);
			}
			await route.fulfill({
				body,
				contentType: path.endsWith('.css')
					? 'text/css'
					: 'text/javascript',
			});
		});
	}
	await page.route('**/fixture', (route) =>
		route.fulfill({
			contentType: 'text/html',
			body: `<!doctype html><html lang="en"><head>
		<style>:root {color-scheme: light dark} body {
			background: ${palette?.Canvas ?? 'Canvas'};
			color: ${palette?.CanvasText ?? 'CanvasText'};
		} form-multi-switch {max-inline-size: 45rem}</style>
		${external ? '<link id="form-multi-switch-styles" rel="stylesheet" href="/form-multi-switch.css">' : ''}
		</head><body><form>
		<form-multi-switch><fieldset><legend>Delivery speed</legend>
			<label><input type="radio" name="delivery" value="standard" checked>Standard</label>
			<label><input type="radio" name="delivery" value="express">Express</label>
			<label><input type="radio" name="delivery" value="overnight" disabled>Overnight</label>
		</fieldset></form-multi-switch>
		<button type="reset">Reset</button></form>
		<script type="module" src="/define.js"></script></body></html>`,
		}),
	);
	await page.goto('http://component.test/fixture');
	await expect(page.locator('form-multi-switch')).toHaveAttribute(
		'data-multi-switch-state',
		'ready',
	);
}

async function paint(label) {
	return label.evaluate((element) => {
		const style = getComputedStyle(element);
		const marker = getComputedStyle(element, '::after');
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = 1;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('Canvas measurement is unavailable.');
		const pixel = (color) => {
			context.clearRect(0, 0, 1, 1);
			context.fillStyle = color;
			context.fillRect(0, 0, 1, 1);
			return [...context.getImageData(0, 0, 1, 1).data];
		};
		let surface = element;
		while (pixel(getComputedStyle(surface).backgroundColor)[3] === 0) {
			surface = surface.parentElement;
			if (!surface) throw new Error('No opaque label surface found.');
		}
		const background = getComputedStyle(surface).backgroundColor;
		if (pixel(background)[3] !== 255) {
			throw new Error('Contrast requires a fully opaque label surface.');
		}
		const luminance = (color) =>
			pixel(color)
				.slice(0, 3)
				.map((channel) => {
					const value = channel / 255;
					return value <= 0.04045
						? value / 12.92
						: ((value + 0.055) / 1.055) ** 2.4;
				})
				.reduce(
					(sum, channel, index) =>
						sum + channel * [0.2126, 0.7152, 0.0722][index],
					0,
				);
		const ratio = (foreground, backdrop = background) => {
			const first = luminance(foreground);
			const second = luminance(backdrop);
			return (
				(Math.max(first, second) + 0.05) /
				(Math.min(first, second) + 0.05)
			);
		};
		const surround = getComputedStyle(
			element.closest('.demo') ?? document.body,
		).backgroundColor;
		return {
			background: style.backgroundColor,
			text: ratio(style.color),
			boundary: ratio(style.borderTopColor),
			marker: ratio(marker.borderBottomColor),
			markerWidth: parseFloat(marker.borderBottomWidth),
			markerStyle: marker.borderBottomStyle,
			markerContent: marker.content,
			focus: ratio(style.outlineColor, surround),
			focusWidth: parseFloat(style.outlineWidth),
			focusOffset: parseFloat(style.outlineOffset),
			adjustment: style.forcedColorAdjust,
		};
	});
}

async function expectSelection(label, { forced = false } = {}) {
	const result = await paint(label);
	expect(result.text).toBeGreaterThanOrEqual(4.5);
	if (forced) {
		expect(result.markerContent).not.toBe('none');
		expect(result.markerStyle).toBe('solid');
		expect(result.markerWidth).toBeGreaterThanOrEqual(3);
		expect(result.marker).toBeGreaterThanOrEqual(3);
	} else {
		expect(result.markerContent).toBe('none');
	}
}

for (const external of [false, true]) {
	for (const scheme of ['light', 'dark']) {
		test(`${external ? 'external' : 'installed'} CSS: ${scheme} selection and keyboard focus are independent`, async ({
			page,
			browserName,
		}) => {
			await page.emulateMedia({ colorScheme: scheme });
			await fixture(page, { external });
			const selected = page.locator('[data-selected]');
			await expectSelection(selected);
			const unselected = page.locator(
				'[data-multi-switch-choice]:not([data-selected]):not([data-disabled])',
			);
			expect((await paint(selected)).background).not.toBe(
				(await paint(unselected)).background,
			);
			expect((await paint(unselected)).boundary).toBeGreaterThanOrEqual(
				3,
			);
			await page.keyboard.press(
				browserName === 'webkit' && process.platform === 'darwin'
					? 'Alt+Tab'
					: 'Tab',
			);
			await expect(
				page.getByRole('radio', { name: 'Standard' }),
			).toBeFocused();
			const focus = await paint(page.locator('[data-focus]'));
			expect(focus.focusWidth).toBeGreaterThanOrEqual(3);
			expect(focus.focusOffset).toBeGreaterThan(0);
			expect(focus.focus).toBeGreaterThanOrEqual(3);
			await page.keyboard.press('ArrowRight');
			await expect(
				page.getByRole('radio', { name: 'Express' }),
			).toBeChecked();
			await expectSelection(page.locator('[data-selected]'));
			await page.getByRole('radio', { name: 'Standard' }).focus();
			await expect(page.locator('[data-focus]')).toHaveAttribute(
				'data-value',
				'standard',
			);
			await expect(page.locator('[data-selected]')).toHaveAttribute(
				'data-value',
				'express',
			);
			await expectSelection(page.locator('[data-selected]'));
			await page.getByRole('radio', { name: 'Express' }).focus();
			await page.keyboard.press('ArrowLeft');
			await expect(
				page.getByRole('radio', { name: 'Standard' }),
			).toBeChecked();
			await page.keyboard.press('ArrowRight');
			expect(
				await page
					.locator('form')
					.evaluate((form) => new FormData(form).get('delivery')),
			).toBe('express');
			await page.getByRole('button', { name: 'Reset' }).click();
			await expect(
				page.getByRole('radio', { name: 'Standard' }),
			).toBeChecked();
			await expectSelection(page.locator('[data-selected]'));
		});
	}
}

// Nine Canvas pairs represent all 62 study observations, not 62 OS setups.
const recordedPairs = [
	[16, '#ffffff', '#000000'],
	[8, '#121212', '#ffffff'],
	[3, '#1c1b22', '#fbfbfe'],
	[1, '#1e1e1e', '#ffffff'],
	[7, '#202020', '#ffffff'],
	[6, '#fffaef', '#3d3d3d'],
	[12, '#2d3236', '#ffffff'],
	[8, '#000000', '#ffffff'],
	[1, '#282828', '#ffffff'],
];
for (const [observations, Canvas, CanvasText] of recordedPairs) {
	test(`selected Canvas pair ${Canvas} (${observations} study observations)`, async ({
		page,
	}) => {
		await fixture(page, { palette: { Canvas, CanvasText } });
		await expectSelection(page.locator('[data-selected]'));
	});
}

for (const demo of ['index.html', 'esm.html', 'unpkg.html']) {
	for (const scheme of ['light', 'dark']) {
		test(`${demo} ${scheme}: selected labels and authored focus stay readable`, async ({
			page,
		}) => {
			await page.emulateMedia({
				colorScheme: scheme,
				reducedMotion: 'reduce',
			});
			await page.goto(`http://component.test/demo/${demo}`);
			await expect(
				page.locator('form-multi-switch').first(),
			).toHaveAttribute('data-multi-switch-state', 'ready');
			for (const choice of await page.locator('[data-selected]').all()) {
				await expectSelection(choice);
				const input = choice.getByRole('radio');
				await input.focus();
				const result = await paint(choice);
				expect(result.focusWidth).toBeGreaterThanOrEqual(3);
				expect(result.focus).toBeGreaterThanOrEqual(3);
			}
		});
	}
	test(`${demo} code/live pairs reflow at 1280px and 320px`, async ({
		page,
	}) => {
		await page.goto(`http://component.test/demo/${demo}`);
		for (const width of [1280, 320]) {
			await page.setViewportSize({ width, height: 900 });
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= innerWidth,
				),
			).toBe(true);
			for (const pair of await page.locator('.code-demo-pair').all()) {
				const code = await pair.locator(':scope > pre').boundingBox();
				const live = await pair.locator('.demo').boundingBox();
				expect(code).not.toBeNull();
				expect(live).not.toBeNull();
				if (width === 1280) {
					expect(live.x).toBeGreaterThan(code.x);
					expect(Math.abs(live.y - code.y)).toBeLessThan(1);
				} else {
					expect(live.y).toBeGreaterThanOrEqual(code.y + code.height);
				}
			}
		}
	});
}

test('existing native browser behavior suite passes', async ({ page }) => {
	await page.goto('http://component.test/test/browser.html');
	await expect(page.locator('#results')).toHaveAttribute(
		'data-complete',
		'true',
	);
	expect(await page.locator('#results li').allTextContents()).not.toEqual([]);
	await expect(page.locator('#results')).toHaveAttribute(
		'data-failures',
		'0',
	);
});

test('forced colors retain automatic adjustment, markers, and readable icon labels', async ({
	page,
	browserName,
}) => {
	test.skip(
		browserName !== 'chromium',
		'Forced-color emulation is Chromium-only here.',
	);
	await page.emulateMedia({ forcedColors: 'active' });
	await page.goto('http://component.test/demo/index.html');
	await expect(page.locator('#delivery')).toHaveAttribute(
		'data-multi-switch-state',
		'ready',
	);
	for (const label of await page.locator('[data-selected]').all()) {
		await expectSelection(label, { forced: true });
		expect((await paint(label)).adjustment).toBe('auto');
	}
	const disabled = page.locator('#shoe-sizes [data-disabled]');
	expect(
		await disabled.evaluate((element) => {
			const slash = getComputedStyle(element, '::after');
			return {
				width: slash.borderTopWidth,
				style: slash.borderTopStyle,
				adjustment: slash.forcedColorAdjust,
			};
		}),
	).toEqual({ width: '2px', style: 'solid', adjustment: 'auto' });
	const text = page.locator('#icons [data-multi-switch-label]').first();
	expect(
		await text.evaluate((element) => getComputedStyle(element).clipPath),
	).toBe('none');
	await expect(
		page.getByRole('radio', { name: 'System', exact: true }),
	).toHaveCount(1);
	await page.emulateMedia({ forcedColors: 'none' });
	for (const label of await page.locator('[data-selected]').all()) {
		await expectSelection(label);
	}
});

test.describe('no JavaScript', () => {
	test.use({ javaScriptEnabled: false });
	test('authored radios retain names, selection, and form behavior', async ({
		page,
	}) => {
		await page.goto('http://component.test/demo/index.html');
		const express = page.locator('#delivery input[value="express"]');
		await expect(express).toBeVisible();
		await express.check();
		await expect(express).toBeChecked();
		await expect(page.locator('#set-density')).toBeHidden();
		await expect(page.locator('[data-selected]')).toHaveCount(0);
	});
});

test('module failure leaves the native group operable', async ({ page }) => {
	await page.route('**/define.js', (route) => route.abort());
	await page.goto('http://component.test/demo/index.html');
	const express = page.locator('#delivery input[value="express"]');
	await expect(express).toBeVisible();
	await express.check();
	await expect(express).toBeChecked();
	await expect(page.locator('[data-selected]')).toHaveCount(0);
});
