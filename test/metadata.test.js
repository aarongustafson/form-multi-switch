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

describe('package metadata', () => {
	it('requires native focus-visible for outer focus outlines, including forced colors', () => {
		const selectors = [
			...read('../form-multi-switch.css').matchAll(
				/([^{}]+)\{[^{}]*outline:\s*3px/g,
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
		const source = read('../form-multi-switch.js');
		const styles = source.match(/const DEFAULT_STYLES = `([\s\S]*?)`;/)[1];
		expect(styles.replace(/\s/g, '')).toBe(
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
