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

async function fixture(
	page,
	{
		external = false,
		palette,
		separateLabels = false,
		firstLabel = 'Standard',
	} = {},
) {
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
			${
				separateLabels
					? `
			<input id="standard" type="radio" name="delivery" value="standard" checked><label for="standard">${firstLabel}</label>
			<input id="express" type="radio" name="delivery" value="express"><label for="express">Express</label>
			<input id="overnight" type="radio" name="delivery" value="overnight" disabled><label for="overnight">Overnight</label>
			`
					: `
			<label><input type="radio" name="delivery" value="standard" checked>${firstLabel}</label>
			<label><input type="radio" name="delivery" value="express">Express</label>
			<label><input type="radio" name="delivery" value="overnight" disabled>Overnight</label>
			`
			}
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

async function addNativeBaseline(page) {
	await page.locator('form-multi-switch').evaluate((control) => {
		const baseline = control.querySelector('fieldset').cloneNode(true);
		baseline.id = 'native-baseline';
		for (const element of [baseline, ...baseline.querySelectorAll('*')]) {
			for (const name of element.getAttributeNames()) {
				if (name.startsWith('data-')) element.removeAttribute(name);
			}
		}
		for (const input of baseline.querySelectorAll('input'))
			input.name = 'native-delivery';
		control.after(baseline);
	});
}

async function expectDisabledSelection(label, { forced = false } = {}) {
	await expect(label.getByRole('radio')).toBeChecked();
	await expect(label.getByRole('radio')).toBeDisabled();
	await expect(label).toHaveAttribute('data-disabled', '');
	const colors = await label.evaluate((element) => {
		const sample = document.createElement('span');
		sample.style.color = 'GrayText';
		document.body.append(sample);
		const gray = getComputedStyle(sample).color;
		sample.remove();
		return { actual: getComputedStyle(element).color, gray };
	});
	// Forced colors can replace authored text colors according to native semantics.
	if (!forced) expect(colors.actual).toBe(colors.gray);
}

for (const external of [false, true]) {
	for (const mode of ['host', 'fieldset', 'ancestor']) {
		test(`${external ? 'external' : 'installed'} CSS: ${mode} disabled groups match native selection, submission, and reset`, async ({
			page,
		}) => {
			await fixture(page, { external });
			await addNativeBaseline(page);
			const control = page.locator('form-multi-switch');
			const native = page.locator('#native-baseline');
			if (mode === 'ancestor') {
				await control.evaluate((element) => {
					const wrapper = document.createElement('fieldset');
					const legend = document.createElement('legend');
					legend.textContent = 'Shipping controls';
					wrapper.append(legend);
					element.before(wrapper);
					wrapper.append(
						element,
						document.querySelector('#native-baseline'),
					);
				});
				await expect(control).toHaveAttribute(
					'data-multi-switch-state',
					'ready',
				);
			}
			const setDisabled = async (disabled) =>
				control.evaluate(
					(element, { mode, disabled }) => {
						const target =
							mode === 'ancestor'
								? element.parentElement
								: mode === 'fieldset'
									? element.querySelector('fieldset')
									: element;
						target.disabled = disabled;
						if (mode !== 'ancestor')
							document.querySelector(
								'#native-baseline',
							).disabled = disabled;
					},
					{ mode, disabled },
				);
			const expectState = async (value, disabled) => {
				const state = await page.locator('form').evaluate((form) => ({
					value: form.querySelector('form-multi-switch').value,
					native:
						form.querySelector('#native-baseline input:checked')
							?.value ?? null,
					entries: [...new FormData(form)],
				}));
				expect(state.value).toBe(state.native);
				expect(state.value).toBe(value);
				expect(state.entries).toEqual(
					disabled
						? []
						: [
								['delivery', value],
								['native-delivery', value],
							],
				);
			};
			await control.locator('[data-value="express"]').click();
			await native.getByRole('radio', { name: 'Express' }).click();
			await control.evaluate((element) =>
				element.addEventListener(
					'form-multi-switch:change',
					(event) => {
						element.dataset.lastChange = JSON.stringify(
							event.detail,
						);
					},
				),
			);
			await setDisabled(true);
			await expectState('express', true);
			await expectDisabledSelection(control.locator('[data-selected]'));
			await expect(
				native.getByRole('radio', { name: 'Express' }),
			).toBeChecked();
			await expect(
				native.getByRole('radio', { name: 'Express' }),
			).toBeDisabled();
			await setDisabled(false);
			await expectState('express', false);
			await expect(control).not.toHaveAttribute('data-last-change');
			await control.locator('[data-value="standard"]').click();
			await native.getByRole('radio', { name: 'Standard' }).click();
			await expect(control).toHaveAttribute(
				'data-last-change',
				JSON.stringify({
					value: 'standard',
					previousValue: 'express',
					index: 0,
				}),
			);
			await control.evaluate((element) => {
				element.value = 'express';
			});
			await native
				.getByRole('radio', { name: 'Express' })
				.evaluate((input) => {
					input.checked = true;
				});
			await setDisabled(true);
			await page.locator('form').evaluate((form) => form.reset());
			await expect(control.locator('[data-selected]')).toHaveAttribute(
				'data-value',
				'standard',
			);
			await expectState('standard', true);
			await expectDisabledSelection(control.locator('[data-selected]'));
			await setDisabled(false);
			await expectState('standard', false);
			await expect(control).toHaveAttribute(
				'data-last-change',
				JSON.stringify({
					value: 'standard',
					previousValue: 'express',
					index: 0,
				}),
			);
		});
	}

	test(`${external ? 'external' : 'installed'} CSS: a disabled checked choice can be left but not reselected by users`, async ({
		page,
	}) => {
		await fixture(page, { external });
		await addNativeBaseline(page);
		const control = page.locator('form-multi-switch');
		const native = page.locator('#native-baseline');
		await page.locator('form').evaluate((form) => {
			for (const input of form.querySelectorAll(
				'input[value="standard"]',
			))
				input.disabled = true;
			for (const input of form.querySelectorAll(
				'input[value="overnight"]',
			))
				input.disabled = false;
		});
		await expectDisabledSelection(control.locator('[data-selected]'));
		await expect(
			native.getByRole('radio', { name: 'Standard' }),
		).toBeChecked();
		expect(
			await page
				.locator('form')
				.evaluate((form) => [...new FormData(form)]),
		).toEqual([]);
		await native.getByRole('radio', { name: 'Express' }).click();
		await page.keyboard.press('ArrowLeft');
		const expected = await native.locator('input:checked').inputValue();
		await control.locator('[data-value="express"]').click();
		await page.keyboard.press('ArrowLeft');
		expect(await control.evaluate((element) => element.value)).toBe(
			expected,
		);
		expect(expected).not.toBe('standard');
		// Skip Playwright's enabled check, not the browser's disabled behavior.
		await native
			.getByRole('radio', { name: 'Standard' })
			.locator('..')
			.click({ force: true });
		await control.locator('[data-value="standard"]').click({ force: true });
		expect(await native.locator('input:checked').inputValue()).toBe(
			expected,
		);
		expect(await control.evaluate((element) => element.value)).toBe(
			expected,
		);
		await control.evaluate((element) => {
			element.value = 'standard';
		});
		await native
			.getByRole('radio', { name: 'Standard' })
			.evaluate((input) => {
				input.checked = true;
			});
		await expectDisabledSelection(control.locator('[data-selected]'));
		expect(
			await page
				.locator('form')
				.evaluate((form) => [...new FormData(form)]),
		).toEqual([]);
		await page.locator('form').evaluate((form) => {
			for (const input of form.querySelectorAll(
				'input[value="standard"]',
			))
				input.disabled = false;
		});
		await expect(
			control.getByRole('radio', { name: 'Standard' }),
		).toBeChecked();
		await expect(
			control.getByRole('radio', { name: 'Standard' }),
		).toBeEnabled();
		expect(
			await page
				.locator('form')
				.evaluate((form) => [...new FormData(form)]),
		).toEqual([
			['delivery', 'standard'],
			['native-delivery', 'standard'],
		]);
	});
}

for (const external of [false, true]) {
	for (const wrapped of [false, true]) {
		test(`${external ? 'external' : 'installed'} CSS preserves actual label padding ${wrapped ? 'with wrappers' : 'without wrappers'}`, async ({
			page,
		}) => {
			await fixture(page, { external, firstLabel: 'Recommended' });
			const control = page.locator('form-multi-switch');
			if (wrapped) {
				await control.evaluate((element) => {
					for (const label of element.querySelectorAll('label')) {
						const wrapper = document.createElement('div');
						label.before(wrapper);
						wrapper.append(label);
					}
				});
			}
			for (const direction of ['ltr', 'rtl']) {
				for (const [width, padding] of [
					[320, null],
					[336, null],
					[336, '0.5em 1.5em'],
					[384, '0.5em 1.5em'],
					[672, null],
					[240, null],
				]) {
					await control.evaluate(
						(element, { width, padding, direction }) => {
							element.style.inlineSize = `${width}px`;
							element.style.fontFamily = 'system-ui';
							element.dir = direction;
							if (padding)
								element.style.setProperty(
									'--multi-switch-padding',
									padding,
								);
							else
								element.style.removeProperty(
									'--multi-switch-padding',
								);
						},
						{ width, padding, direction },
					);
					const insets = await control
						.locator('[data-multi-switch-choice]')
						.evaluateAll((labels) =>
							labels.map((label) => {
								const box = label.getBoundingClientRect();
								const range = document.createRange();
								range.selectNodeContents(
									label.querySelector(
										'[data-multi-switch-label]',
									),
								);
								const text = range.getBoundingClientRect();
								const style = getComputedStyle(label);
								return {
									left:
										text.left -
										box.left -
										parseFloat(style.borderLeftWidth),
									right:
										box.right -
										text.right -
										parseFloat(style.borderRightWidth),
									paddingLeft: parseFloat(style.paddingLeft),
									paddingRight: parseFloat(
										style.paddingRight,
									),
								};
							}),
						);
					for (const inset of insets) {
						expect(inset.left).toBeGreaterThanOrEqual(
							inset.paddingLeft - 0.5,
						);
						expect(inset.right).toBeGreaterThanOrEqual(
							inset.paddingRight - 0.5,
						);
					}
					expect(
						await control.evaluate(
							(element) =>
								element.scrollWidth <= element.clientWidth,
						),
					).toBe(true);
				}
			}
		});
	}
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
			focusStyle: style.outlineStyle,
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

for (const width of [1280, 320]) {
	test(`${width}px shoe grid keeps decimal sizes on one line with visible padding`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('http://component.test/demo/index.html');
		const control = page.locator('#shoe-sizes');
		await expect(control).toHaveAttribute(
			'data-multi-switch-state',
			'ready',
		);
		await control.evaluate((element) => {
			element.style.maxInlineSize = '14.5rem';
		});
		const geometry = await control
			.locator('[data-value="10.5"]')
			.evaluate((label) => {
				const range = document.createRange();
				range.selectNodeContents(
					label.querySelector('[data-multi-switch-label]'),
				);
				const text = range.getBoundingClientRect();
				const box = label.getBoundingClientRect();
				const style = getComputedStyle(label);
				return {
					lines: range.getClientRects().length,
					width: box.width,
					height: box.height,
					left:
						text.left -
						box.left -
						parseFloat(style.borderLeftWidth),
					right:
						box.right -
						text.right -
						parseFloat(style.borderRightWidth),
					paddingLeft: parseFloat(style.paddingLeft),
					paddingRight: parseFloat(style.paddingRight),
				};
			});
		expect(geometry.lines).toBe(1);
		expect(geometry.left).toBeGreaterThanOrEqual(
			geometry.paddingLeft - 0.5,
		);
		expect(geometry.right).toBeGreaterThanOrEqual(
			geometry.paddingRight - 0.5,
		);
		expect(geometry.width).toBeGreaterThanOrEqual(44);
		expect(geometry.height).toBeGreaterThanOrEqual(44);
	});
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
			expect(focus.focusStyle).toBe('solid');
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

for (const external of [false, true]) {
	for (const separateLabels of [false, true]) {
		test(`${external ? 'external' : 'installed'} CSS outline properties work with ${separateLabels ? 'separate' : 'wrapping'} labels and preserve the color hook`, async ({
			page,
			browserName,
		}) => {
			await fixture(page, { external, separateLabels });
			const control = page.locator('form-multi-switch');
			const radio = page.getByRole('radio', { name: 'Standard' });
			const root = page.locator('html');
			await control.evaluate((element) => {
				element.style.setProperty(
					'--multi-switch-focus-color',
					'rgb(0, 95, 204)',
				);
			});
			await page.keyboard.press(
				browserName === 'webkit' && process.platform === 'darwin'
					? 'Alt+Tab'
					: 'Tab',
			);
			await expect(radio).toBeFocused();
			expect(
				await control
					.locator('[data-focus]')
					.evaluate(
						(element) => getComputedStyle(element).outlineColor,
					),
			).toBe('rgb(0, 95, 204)');
			await root.evaluate((element) => {
				element.style.setProperty(
					'--site-focus-ring',
					'4px dashed rgb(128, 0, 128)',
				);
				element.style.setProperty(
					'--multi-switch-outline',
					'var(--site-focus-ring)',
				);
				element.style.setProperty(
					'--multi-switch-outline-offset',
					'6px',
				);
			});
			let focus = await paint(control.locator('[data-focus]'));
			expect(focus.focusStyle).toBe('dashed');
			expect(focus.focusWidth).toBe(4);
			expect(focus.focusOffset).toBe(6);
			expect(
				await control
					.locator('[data-focus]')
					.evaluate(
						(element) => getComputedStyle(element).outlineColor,
					),
			).toBe('rgb(128, 0, 128)');
			await root.evaluate((element) =>
				element.style.setProperty(
					'--multi-switch-outline',
					'auto CanvasText',
				),
			);
			expect(
				(await paint(control.locator('[data-focus]'))).focusStyle,
			).toBe('auto');
			await root.evaluate((element) =>
				element.style.removeProperty('--multi-switch-outline'),
			);
			focus = await paint(control.locator('[data-focus]'));
			expect(focus.focusStyle).toBe('solid');
			expect(focus.focusWidth).toBe(3);
			expect(focus.focusOffset).toBe(6);
			expect(
				await control
					.locator('[data-focus]')
					.evaluate(
						(element) => getComputedStyle(element).outlineColor,
					),
			).toBe('rgb(0, 95, 204)');
			await root.evaluate((element) =>
				element.style.removeProperty('--multi-switch-outline-offset'),
			);
			expect(
				(await paint(control.locator('[data-focus]'))).focusOffset,
			).toBe(3);
			await page.keyboard.press('ArrowRight');
			const nextRadio = page.getByRole('radio', { name: 'Express' });
			await expect(nextRadio).toBeChecked();
			await expect(nextRadio).toBeFocused();
			await expect(control.locator('[data-focus]')).toHaveText('Express');
			const focusVisible = await nextRadio.evaluate((element) =>
				element.matches(':focus-visible'),
			);
			await expect(control.locator('[data-focus]')).toHaveCSS(
				'outline-style',
				focusVisible ? 'solid' : 'none',
			);
			await nextRadio.blur();
			expect(
				await control
					.locator('[data-multi-switch-choice]')
					.evaluateAll((choices) =>
						choices.map(
							(choice) => getComputedStyle(choice).outlineStyle,
						),
					),
			).toEqual(['none', 'none', 'none']);
		});
	}

	test(`${external ? 'external' : 'installed'} CSS outline overrides work in forced colors with safe unset defaults`, async ({
		page,
		browserName,
	}) => {
		test.skip(
			browserName !== 'chromium',
			'Forced-color emulation is Chromium-only here.',
		);
		await page.emulateMedia({ forcedColors: 'active' });
		await fixture(page, { external, separateLabels: true });
		const control = page.locator('form-multi-switch');
		await control.evaluate((element) =>
			element.style.setProperty('--multi-switch-focus-color', 'red'),
		);
		await page.getByRole('radio', { name: 'Standard' }).focus();
		let focus = await paint(control.locator('[data-focus]'));
		expect(focus.focusStyle).toBe('solid');
		expect(focus.focusWidth).toBe(3);
		expect(focus.focusOffset).toBe(3);
		expect(focus.focus).toBeGreaterThanOrEqual(3);
		await control.evaluate((element) => {
			element.style.setProperty(
				'--multi-switch-outline',
				'4px dashed CanvasText',
			);
			element.style.setProperty('--multi-switch-outline-offset', '5px');
		});
		focus = await paint(control.locator('[data-focus]'));
		expect(focus.focusStyle).toBe('dashed');
		expect(focus.focusWidth).toBe(4);
		expect(focus.focusOffset).toBe(5);
		expect(focus.focus).toBeGreaterThanOrEqual(3);
		expect(focus.adjustment).toBe('auto');
		await control.evaluate((element) => {
			element.style.removeProperty('--multi-switch-outline');
			element.style.removeProperty('--multi-switch-outline-offset');
		});
		focus = await paint(control.locator('[data-focus]'));
		expect(focus.focusStyle).toBe('solid');
		expect(focus.focusWidth).toBe(3);
		expect(focus.focusOffset).toBe(3);
		expect(focus.focus).toBeGreaterThanOrEqual(3);
	});
}

test('global focus rules do not inherit, but matching author rules override the focus layer', async ({
	page,
}) => {
	await fixture(page);
	const radio = page.getByRole('radio', { name: 'Standard' });
	await page.addStyleTag({
		content: ':focus-visible { outline: 7px dotted CanvasText; }',
	});
	await radio.focus();
	expect(
		await radio.evaluate(
			(element) => getComputedStyle(element).outlineStyle,
		),
	).toBe('dotted');
	expect((await paint(page.locator('[data-focus]'))).focusStyle).toBe(
		'solid',
	);
	await page.locator('form-multi-switch').evaluate((element) => {
		element.style.setProperty(
			'--multi-switch-focus-color',
			'rgb(0, 95, 204)',
		);
	});
	expect(
		await page
			.locator('[data-focus]')
			.evaluate((element) => getComputedStyle(element).outlineColor),
	).toBe('rgb(0, 95, 204)');
	const browserStyle = await page.addStyleTag({
		content:
			'form-multi-switch label:has(input:focus-visible) { outline: auto CanvasText; }',
	});
	expect((await paint(page.locator('[data-focus]'))).focusStyle).toBe('auto');
	await browserStyle.evaluate((element) => element.remove());
	const shared = await page.addStyleTag({
		content: `:root { --site-focus-ring: 4px dashed CanvasText; }
			form-multi-switch label:has(input:focus-visible) {
				outline: var(--site-focus-ring); outline-offset: 4px;
			}`,
	});
	await shared.evaluate((element) => document.head.prepend(element));
	const focus = await paint(page.locator('[data-focus]'));
	expect(focus.focusStyle).toBe('dashed');
	expect(focus.focusWidth).toBe(4);
	expect(focus.focusOffset).toBe(4);
});

test('separate for/id labels still receive the mapped focus ring', async ({
	page,
}) => {
	await fixture(page, { separateLabels: true });
	await page.getByRole('radio', { name: 'Standard' }).focus();
	await expect(page.locator('[data-focus]')).toHaveAttribute(
		'for',
		'standard',
	);
	expect((await paint(page.locator('[data-focus]'))).focusStyle).toBe(
		'solid',
	);
	await page.keyboard.press('ArrowRight');
	await expect(page.getByRole('radio', { name: 'Express' })).toBeChecked();
	await expect(page.locator('[data-focus]')).toHaveAttribute(
		'for',
		'express',
	);
});

for (const scheme of ['light', 'dark']) {
	test(`${scheme} custom focus demo uses an author-defined ring without changing native radios`, async ({
		page,
	}) => {
		await page.emulateMedia({ colorScheme: scheme });
		await page.goto('http://component.test/demo/index.html');
		const control = page.locator('#custom-focus');
		await expect(control).toHaveAttribute(
			'data-multi-switch-state',
			'ready',
		);
		const radio = control.getByRole('radio', {
			name: 'Recommended',
			exact: true,
		});
		await radio.focus();
		const focus = await paint(control.locator('[data-focus]'));
		expect(focus.focusStyle).toBe('dashed');
		expect(focus.focusWidth).toBe(4);
		expect(focus.focusOffset).toBe(4);
		expect(focus.focus).toBeGreaterThanOrEqual(3);
		await page.keyboard.press('ArrowRight');
		await expect(
			control.getByRole('radio', { name: 'Newest', exact: true }),
		).toBeChecked();
	});
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
			for (const choice of await page
				.locator('[data-selected]:not([data-disabled])')
				.all()) {
				await expectSelection(choice);
				const input = choice.getByRole('radio');
				await input.focus();
				const result = await paint(choice);
				expect(result.focusWidth).toBeGreaterThanOrEqual(3);
				expect(result.focus).toBeGreaterThanOrEqual(3);
			}
			for (const choice of await page
				.locator('[data-selected][data-disabled]')
				.all()) {
				await expectDisabledSelection(choice);
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

for (const demo of ['index.html', 'esm.html', 'unpkg.html']) {
	test(`${demo} leaves ordinary demo controls with browser focus outlines`, async ({
		page,
	}) => {
		await page.goto(`http://component.test/demo/${demo}`);
		await page.evaluate(() => {
			document.documentElement.style.colorScheme = getComputedStyle(
				document.documentElement,
			).colorScheme;
		});
		const controls = await page.locator('a, button').all();
		const outlines = async () => {
			const values = [];
			for (const control of controls) {
				await control.focus();
				values.push(
					await control.evaluate((element) => {
						const style = getComputedStyle(element);
						return {
							style: style.outlineStyle,
							width: style.outlineWidth,
							offset: style.outlineOffset,
						};
					}),
				);
			}
			return values;
		};
		const authored = await outlines();
		await page.locator('link[rel="stylesheet"]').evaluate((link) => {
			link.disabled = true;
		});
		const native = await outlines();
		expect(native.some((outline) => outline.style !== 'none')).toBe(true);
		expect(authored).toEqual(native);
	});
}

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
	for (const label of await page
		.locator('[data-selected]:not([data-disabled])')
		.all()) {
		await expectSelection(label, { forced: true });
		expect((await paint(label)).adjustment).toBe('auto');
	}
	for (const label of await page
		.locator('[data-selected][data-disabled]')
		.all()) {
		await expectDisabledSelection(label, { forced: true });
		const result = await paint(label);
		expect(result.markerStyle).toBe('solid');
		expect(result.markerWidth).toBeGreaterThanOrEqual(3);
		expect(result.adjustment).toBe('auto');
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
	for (const label of await page
		.locator('[data-selected]:not([data-disabled])')
		.all()) {
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
