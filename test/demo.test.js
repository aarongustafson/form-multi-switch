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
		expect(button.textContent.trim()).toBe('Set Compact through the API');
	});
});
