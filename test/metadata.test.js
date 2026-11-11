import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { FormMultiSwitchElement } from '../form-multi-switch.js';

const directory = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(resolve(directory, path), 'utf8');
const manifest = JSON.parse(read('../custom-elements.json'));
const declaration = manifest.modules[0].declarations[0];
const metadata = JSON.parse(read('../package.json'));
const defaultStyles = read('../form-multi-switch.js').match(
	/const DEFAULT_STYLES = `([\s\S]*?)`;/,
)[1];

describe('package metadata', () => {
	it('documents the full focus outline and offset properties', () => {
		for (const [name, value] of [
			[
				'--multi-switch-outline',
				'3px solid var(--multi-switch-focus-color, CanvasText)',
			],
			['--multi-switch-outline-offset', '3px'],
		]) {
			expect(
				declaration.cssProperties.find(
					(property) => property.name === name,
				)?.default,
			).toBe(value);
		}
	});

	it.each([
		['enabled', /\[data-multi-switch-choice\]\s*\{([^}]+)\}/, 'pointer'],
		['disabled', /\[data-disabled\]\s*\{([^}]+)\}/, 'not-allowed'],
		['read-only', /\[data-readonly\]\s*\{([^}]+)\}/, 'not-allowed'],
	])(
		'uses the intended cursor for %s choices in both stylesheets',
		(_state, selector, cursor) => {
			for (const styles of [
				defaultStyles,
				read('../form-multi-switch.css'),
			]) {
				const rule = styles.match(selector);
				expect(rule).not.toBeNull();
				expect(rule[1]).toMatch(
					new RegExp(`cursor:\\s*${cursor}\\s*;`),
				);
			}
		},
	);

	it('requires native focus-visible for outer focus outlines, including forced colors', () => {
		const selectors = [
			...read('../form-multi-switch.css').matchAll(
				/([^{}]+)\{[^{}]*outline:\s*var\(\s*--multi-switch-outline,/g,
			),
		].map((match) => match[1]);
		expect(selectors).toHaveLength(2);
		for (const selector of selectors) {
			expect(selector).toContain(':focus-visible');
		}
		expect(
			declaration.cssProperties.find(
				({ name }) => name === '--multi-switch-focus-color',
			).description,
		).toContain(':focus-visible');
	});

	it('keeps the optional external CSS identical to the automatically installed defaults', () => {
		expect(defaultStyles.replace(/\s/g, '')).toBe(
			read('../form-multi-switch.css').replace(/\s/g, ''),
		);
	});
	it('documents every observed attribute', () => {
		expect(declaration.attributes.map(({ name }) => name).sort()).toEqual(
			[...FormMultiSwitchElement.observedAttributes].sort(),
		);
	});

	it('documents each stylesheet custom property', () => {
		const properties = [
			...new Set(
				read('../form-multi-switch.css').match(
					/--multi-switch-[a-z-]+/g,
				),
			),
		];
		expect(
			declaration.cssProperties.map(({ name }) => name).sort(),
		).toEqual(properties.sort());
	});

	it('keeps documented defaults aligned with the actual CSS, including nested fallbacks', () => {
		const defaults = new Map();
		const styles = read('../form-multi-switch.css');
		for (const match of styles.matchAll(
			/var\(\s*(--multi-switch-[a-z-]+),\s*/g,
		)) {
			const name = match[1];
			const start = match.index + match[0].length;
			let end = start;
			let depth = 1;
			while (depth && end < styles.length) {
				const character = styles[end++];
				if (character === '(') depth++;
				else if (character === ')') depth--;
			}
			expect(depth, name).toBe(0);
			if (!defaults.has(name)) {
				defaults.set(name, styles.slice(start, end - 1).trim());
			}
		}
		for (const property of declaration.cssProperties) {
			expect(property.default, property.name).toBe(
				defaults.get(property.name),
			);
		}
	});

	it('types every documented event', () => {
		const types = read('../form-multi-switch.d.ts');
		for (const event of declaration.events) {
			expect(types).toContain(`'${event.name}'`);
		}
	});

	it('includes each export in the published file list', () => {
		for (const value of Object.values(metadata.exports)) {
			const paths =
				typeof value === 'string' ? [value] : Object.values(value);
			for (const path of paths) {
				expect(existsSync(resolve(directory, '..', path)), path).toBe(
					true,
				);
				expect(metadata.files).toContain(path.replace('./', ''));
			}
		}
	});

	it('keeps registration metadata in the definition module', () => {
		expect(
			manifest.modules[0].exports.some(
				(entry) => entry.kind === 'custom-element-definition',
			),
		).toBe(false);
		expect(
			manifest.modules[1].exports.some(
				(entry) => entry.kind === 'custom-element-definition',
			),
		).toBe(true);
	});
});
