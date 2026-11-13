import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const name = 'form-multi-switch';
const hashes = {
	'esm.html':
		'78c8b9ba42743d1ef9869a0e19522eb11924c7a7bb86f0314e2a487a5dd6b019',
	'index.html':
		'c2dd9e40581ea6f41b0a608a032d0178bc95cb5c0f6e0ca616964d45c1b280fe',
	'unpkg.html':
		'557997f9b3bf9bc4338549022d3bd0b76d3cb8a177b44268e7ccecf30f980226',
};

function normalizedCode(file, text) {
	if (file !== 'esm.html') return text;
	return text.replace(
		new RegExp(
			'(https://esm[.]sh/@aarongustafson/form-multi-switch@)[0-9]+[.][0-9]+[.][0-9]+(?:-[0-9A-Za-z.-]+)?(?:[+][0-9A-Za-z.-]+)?(?=/)',
			'g',
		),
		'$1<version>',
	);
}

function verifyDemo(source, file) {
	const template = document.createElement('template');
	template.innerHTML = source;
	const blocks = [...template.content.querySelectorAll('pre code')];
	const text = blocks.map((code) => code.textContent).join('\n');
	expect(
		createHash('sha256').update(normalizedCode(file, text)).digest('hex'),
	).toBe(hashes[file]);
	expect(template.content.querySelector('mark mark')).toBeNull();
	for (const code of blocks) {
		const marks = [...code.querySelectorAll('mark')].map(
			(mark) => mark.textContent,
		);
		const snippets = [
			...code.textContent.matchAll(
				new RegExp(`<\\/?${name}\\b[^>]*>`, 'g'),
			),
			...code.textContent.matchAll(/import\s[\s\S]*?;/g),
			...code.textContent.matchAll(
				/(?:customElements\.(?:get|define)\([\s\S]*?\)|define[A-Z]\w*\(\))/g,
			),
		];
		for (const [snippet] of snippets) {
			expect(
				marks.some((mark) => mark.includes(snippet)),
				`${file}: ${snippet}`,
			).toBe(true);
		}
	}
}

describe('displayed component code', () => {
	for (const file of Object.keys(hashes)) {
		it(`highlights component snippets without changing code in ${file}`, () => {
			verifyDemo(readFileSync(`demo/${file}`, 'utf8'), file);
		});
	}

	it('allows the publishing helper to update CDN versions without changing other displayed code', () => {
		const fixture = `test/.demo-highlighting-release-${randomUUID()}`;
		mkdirSync(`${fixture}/scripts`, { recursive: true });
		mkdirSync(`${fixture}/demo`);
		try {
			writeFileSync(
				`${fixture}/package.json`,
				JSON.stringify({
					name: `@aarongustafson/${name}`,
					type: 'module',
					version: '9.8.7',
				}),
			);
			writeFileSync(
				`${fixture}/scripts/update-demo-versions.js`,
				readFileSync('scripts/update-demo-versions.js'),
			);
			writeFileSync(
				`${fixture}/demo/esm.html`,
				readFileSync('demo/esm.html'),
			);
			execFileSync(process.execPath, [
				`${fixture}/scripts/update-demo-versions.js`,
			]);
			const updated = readFileSync(`${fixture}/demo/esm.html`, 'utf8');
			expect(updated).toContain(`@aarongustafson/${name}@9.8.7/`);
			verifyDemo(updated, 'esm.html');
			expect(() =>
				verifyDemo(
					updated.replace(/(<pre[^>]*><code[^>]*>)/, '$1changed'),
					'esm.html',
				),
			).toThrow();
			const url = `https://esm.sh/@aarongustafson/${name}@9.8.7/define.js`;
			expect(normalizedCode('esm.html', url)).toBe(
				url.replace('@9.8.7/', '@<version>/'),
			);
			expect(normalizedCode('unpkg.html', url)).toBe(url);
			expect(
				normalizedCode(
					'esm.html',
					url.replace('esm.sh', 'other.invalid'),
				),
			).toBe(url.replace('esm.sh', 'other.invalid'));
		} finally {
			rmSync(fixture, { recursive: true, force: true });
		}
	});
});
