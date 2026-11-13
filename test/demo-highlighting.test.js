import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const name = 'form-multi-switch';
const hashes = {
	'esm.html':
		'1505cf791df38ac7d36f7f4a849dd0d24657820e7b111614df5f1357c1f4fe82',
	'index.html':
		'c2dd9e40581ea6f41b0a608a032d0178bc95cb5c0f6e0ca616964d45c1b280fe',
	'unpkg.html':
		'557997f9b3bf9bc4338549022d3bd0b76d3cb8a177b44268e7ccecf30f980226',
};

describe('displayed component code', () => {
	for (const [file, hash] of Object.entries(hashes)) {
		it(`highlights component snippets without changing code in ${file}`, () => {
			const template = document.createElement('template');
			template.innerHTML = readFileSync(`demo/${file}`, 'utf8');
			const blocks = [...template.content.querySelectorAll('pre code')];
			const text = blocks.map((code) => code.textContent).join('\n');
			expect(createHash('sha256').update(text).digest('hex')).toBe(hash);
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
		});
	}
});
