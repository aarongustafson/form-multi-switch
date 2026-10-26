import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const directory = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(directory, '../demo/index.html'), 'utf8');
const template = document.createElement('template');
template.innerHTML = html;
const demo = template.content;

describe('demo examples', () => {
	it('leaves shared-border overlap margins to the component defaults', () => {
		const css = readFileSync(
			resolve(directory, '../demo/styles.css'),
			'utf8',
		);
		expect(css).not.toMatch(
			/form-multi-switch\[data-multi-switch-state=['"]ready['"]\]\s+label\s*\{[^}]*margin:\s*0/,
		);
	});

	it('introduces script loading with a working example before the loading and failure demos', () => {
		const intro = demo.querySelector('#script-loading');
		expect(intro).not.toBeNull();
		const first = demo.querySelector('form-multi-switch[script]');
		expect(first?.id).toBe('script-example');
		expect(first?.closest('section')).toBe(intro);
		const code = intro.querySelector('pre code').textContent;
		expect(code).toContain('export function initialize');
		expect(code).toContain('form-multi-switch:change');
		expect(code).toContain('{ signal }');
	});

	it('updates the script example and releases its listener and preview state', async () => {
		const { initialize } = await import('../demo/view-behavior.js');
		const wrapper = document.createElement('div');
		wrapper.innerHTML = `<form-multi-switch><fieldset><legend>View</legend>
			<label><input type="radio" name="view" value="list" checked>List</label>
			<label><input type="radio" name="view" value="grid">Grid</label>
			</fieldset></form-multi-switch><ul data-view-preview></ul>`;
		const control = wrapper.querySelector('form-multi-switch');
		const preview = wrapper.querySelector('[data-view-preview]');
		document.body.append(wrapper);
		await control.ready;
		const controller = new AbortController();
		try {
			const cleanup = initialize(control, { signal: controller.signal });
			expect(preview.dataset.view).toBe('list');
			control.querySelector('input[value="grid"]').click();
			expect(preview.dataset.view).toBe('grid');
			controller.abort();
			cleanup();
			control.dispatchEvent(new CustomEvent('form-multi-switch:change'));
			expect(preview.hasAttribute('data-view')).toBe(false);
		} finally {
			controller.abort();
			wrapper.remove();
		}
	});

	it('does not require authors to link the component stylesheet', () => {
		expect(html).not.toContain('href="../form-multi-switch.css"');
	});

	it('shows clothing sizes and a wrapping native shoe-size list', () => {
		expect(
			[...demo.querySelectorAll('#clothing-sizes input')].map(
				(input) => input.value,
			),
		).toEqual(['S', 'M', 'L', 'XL']);
		const shoes = demo.querySelector('#shoe-sizes');
		expect(
			shoes.querySelectorAll('ul > li > label > input').length,
		).toBeGreaterThan(6);
		expect(shoes.classList.contains('size-grid')).toBe(true);
		const code = shoes
			.closest('.code-demo-pair')
			.querySelector('code').textContent;
		expect(code).toContain('grid-template-columns');
	});

	it('keeps unavailable shoe-size text accessible but visually hidden', () => {
		const label = demo
			.querySelector('#shoe-sizes input[disabled]')
			.closest('label');
		const text = label.querySelector('.visually-hidden');
		expect(text?.textContent).toContain('unavailable');
		expect(text?.hasAttribute('aria-hidden')).toBe(false);
		const css = readFileSync(
			resolve(directory, '../demo/styles.css'),
			'utf8',
		);
		expect(css).toContain('.size-grid [data-disabled]::after');
		expect(css).toMatch(/linear-gradient\(\s*135deg/);
	});

	it('keeps just the README link in the introduction', () => {
		const links = [...demo.querySelectorAll('header a')];
		expect(links).toHaveLength(1);
		expect(links[0].textContent.trim()).toBe('README');
		expect(links[0].getAttribute('href')).toBe(
			'https://github.com/aarongustafson/form-multi-switch/blob/main/README.md',
		);
	});

	it('ends with the shared author credit instead of repository navigation', () => {
		const footer = demo.querySelector('footer');
		expect(footer.textContent.replace(/\s+/g, ' ').trim()).toBe(
			'Made with ❤️ by Aaron Gustafson.',
		);
		const links = [...footer.querySelectorAll('a')];
		expect(links).toHaveLength(1);
		expect(links[0].getAttribute('href')).toBe(
			'https://github.com/aarongustafson',
		);
	});

	it('pairs code on the left with every live example', () => {
		const sections = [...demo.querySelectorAll('.demo-section')];
		expect(sections.length).toBeGreaterThanOrEqual(10);
		for (const section of sections) {
			const pair = section.querySelector('.code-demo-pair');
			expect(pair, section.textContent).not.toBeNull();
			expect(pair.firstElementChild.tagName).toBe('PRE');
			expect(pair.lastElementChild.classList.contains('demo')).toBe(true);
		}
		for (const control of demo.querySelectorAll('form-multi-switch')) {
			expect(control.closest('.code-demo-pair > .demo')).not.toBeNull();
		}
	});

	it('starts with a fully enabled three-choice native group', () => {
		const inputs = [...demo.querySelectorAll('#delivery input')];
		expect(inputs).toHaveLength(3);
		expect(inputs.every((input) => !input.disabled)).toBe(true);
		const code = demo
			.querySelector('#delivery')
			.closest('.code-demo-pair')
			.querySelector('code');
		expect(code.textContent.match(/<input/g)).toHaveLength(3);
	});

	it.each(['esm.html', 'unpkg.html'])(
		'uses the same code/live layout in %s',
		(filename) => {
			const page = document.createElement('template');
			page.innerHTML = readFileSync(
				resolve(directory, '../demo', filename),
				'utf8',
			);
			const pair = page.content.querySelector('.code-demo-pair');
			expect(pair).not.toBeNull();
			expect(pair.firstElementChild.tagName).toBe('PRE');
			expect(
				pair.lastElementChild.querySelector('form-multi-switch'),
			).not.toBeNull();
		},
	);

	it('offers several fully enabled three-choice configurations', () => {
		for (const id of ['billing', 'icons', 'branded', 'underline']) {
			const control = demo.querySelector(`#${id}`);
			expect(control, id).not.toBeNull();
			const choices = JSON.parse(control.getAttribute('choices'));
			expect(choices, id).toHaveLength(3);
			expect(
				choices.every((choice) => !choice.disabled),
				id,
			).toBe(true);
		}
	});

	it('explains both custom-property and selector-based restyling', () => {
		const restyling = demo.querySelector('#restyling');
		expect(restyling).not.toBeNull();
		const samples = [...restyling.querySelectorAll('pre')]
			.map((pre) => pre.textContent)
			.join('\n');
		expect(samples).toContain('--multi-switch-radius');
		expect(samples).toContain('--multi-switch-border');
		expect(samples).toContain('[data-selected]');
	});

	it('shows an individually disabled option separately from the basic control', () => {
		expect(
			demo.querySelector('#unavailable input[disabled]'),
		).not.toBeNull();
		expect(
			demo.querySelector('#disabled fieldset[disabled]'),
		).not.toBeNull();
	});

	it('keeps the JavaScript-only action hidden until its control is ready', () => {
		const button = demo.querySelector('#set-density');
		expect(button.hidden).toBe(true);
		expect(button.textContent).toContain('Compact');
	});
});
