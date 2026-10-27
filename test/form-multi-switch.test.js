import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FormMultiSwitchElement } from '../form-multi-switch.js';

const choices = [
	{ label: 'Comfortable', value: 'comfortable' },
	{ label: 'Compact', value: 'compact' },
	{ label: 'Condensed', value: 'condensed', disabled: true },
];
const configuration = {
	name: 'density',
	label: 'Display density',
	choices,
	value: 'comfortable',
};

function authored(extra = '') {
	const element = document.createElement('form-multi-switch');
	element.innerHTML = `<fieldset ${extra}>
		<legend>Display density</legend>
		<label><input type="radio" name="density" value="comfortable" checked>Comfortable</label>
		<label><input type="radio" name="density" value="compact">Compact</label>
		<label><input type="radio" name="density" value="condensed" disabled>Condensed</label>
	</fieldset>`;
	return element;
}

async function connect(element, parent = document.body) {
	parent.append(element);
	await element.ready;
	return element;
}

describe('form-multi-switch', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it('keeps native controls and labels in light DOM without redundant roles', async () => {
		const element = authored();
		const input = element.querySelector('input');
		await connect(element);
		expect(element).toBeInstanceOf(FormMultiSwitchElement);
		expect(element.shadowRoot).toBeNull();
		expect(element.querySelector('input')).toBe(input);
		expect(element.querySelector('[role]')).toBeNull();
		expect(element.querySelector('legend').textContent).toBe(
			'Display density',
		);
		expect(element.state).toBe('ready');
		expect(input.hidden).toBe(false);
		expect(input.hasAttribute('aria-hidden')).toBe(false);
	});

	it('uses component-name:event names for every custom event', async () => {
		const element = authored();
		const listeners = Object.fromEntries(
			['ready', 'activate', 'change', 'error'].map((name) => {
				const listener = vi.fn();
				element.addEventListener(`form-multi-switch:${name}`, listener);
				return [name, listener];
			}),
		);
		await connect(element);
		element.querySelectorAll('input')[1].click();
		element.querySelector('legend').remove();
		await vi.waitFor(() => expect(listeners.error).toHaveBeenCalledOnce());
		for (const listener of Object.values(listeners)) {
			expect(listener).toHaveBeenCalledOnce();
		}
		expect(listeners.change.mock.calls[0][0].detail).toEqual({
			value: 'compact',
			previousValue: 'comfortable',
			index: 1,
		});
	});

	it('installs overridable default styles once per document without a CSS import', async () => {
		await connect(authored());
		await connect(authored());
		const styles = document.querySelectorAll('#form-multi-switch-styles');
		expect(styles).toHaveLength(1);
		expect(styles[0].textContent).toContain('@layer form-multi-switch');
		expect(styles[0].textContent).toContain('--multi-switch-border');
	});

	it('automatically observes added, removed, and reordered choices without looping', async () => {
		const element = await connect(authored());
		const ready = vi.fn();
		element.addEventListener('form-multi-switch:ready', ready);
		const label = document.createElement('label');
		label.innerHTML =
			'<input type="radio" name="density" value="spacious">Spacious';
		element.querySelector('fieldset').append(label);
		await vi.waitFor(() =>
			expect(label.hasAttribute('data-last')).toBe(true),
		);
		expect(element.querySelectorAll('[data-last]')).toHaveLength(1);
		label.remove();
		await vi.waitFor(() =>
			expect(element.querySelector('[data-last]').dataset.value).toBe(
				'condensed',
			),
		);
		element
			.querySelector('fieldset')
			.append(element.querySelector('label'));
		await vi.waitFor(() =>
			expect(element.querySelector('[data-last]').dataset.value).toBe(
				'comfortable',
			),
		);
		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(ready).toHaveBeenCalledTimes(3);
	});

	it('revalidates labels and values and recovers when invalid markup is corrected', async () => {
		const element = await connect(authored());
		const input = element.querySelectorAll('input')[1];
		input.value = 'dense';
		await vi.waitFor(() =>
			expect(input.labels[0].dataset.value).toBe('dense'),
		);
		const text = input.labels[0].querySelector('[data-multi-switch-label]');
		text.textContent = '';
		await vi.waitFor(() => expect(element.state).toBe('error'));
		expect(element.querySelector('[data-multi-switch-group]')).toBeNull();
		text.textContent = 'Dense';
		await vi.waitFor(() => expect(element.state).toBe('ready'));
	});

	it('updates inherited disabled state without restarting behavior', async () => {
		const parent = document.createElement('fieldset');
		document.body.append(parent);
		const element = await connect(authored(), parent);
		const ready = vi.fn();
		element.addEventListener('form-multi-switch:ready', ready);
		const sync = vi.spyOn(element, '_sync');
		parent.disabled = true;
		await vi.waitFor(() => expect(sync).toHaveBeenCalledOnce());
		parent.disabled = false;
		await vi.waitFor(() => expect(sync).toHaveBeenCalledTimes(2));
		expect(ready).not.toHaveBeenCalled();
	});

	it('uses an author-provided CSP stylesheet instead of injecting another style', async () => {
		document.getElementById('form-multi-switch-styles')?.remove();
		const link = document.createElement('link');
		link.id = 'form-multi-switch-styles';
		document.head.append(link);
		try {
			await connect(authored());
			expect(
				document.querySelectorAll('#form-multi-switch-styles'),
			).toHaveLength(1);
			expect(document.getElementById('form-multi-switch-styles')).toBe(
				link,
			);
		} finally {
			link.remove();
		}
	});

	it('coalesces structural edits and stops observing after disconnection', async () => {
		const element = await connect(authored());
		const ready = vi.fn();
		element.addEventListener('form-multi-switch:ready', ready);
		element.querySelector('legend').textContent = 'Density';
		element.querySelectorAll('input')[1].value = 'dense';
		element.querySelectorAll('input')[2].value = 'condensed-new';
		await vi.waitFor(() => expect(ready).toHaveBeenCalledOnce());
		element.remove();
		element.querySelector('legend').textContent = 'Disconnected';
		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(ready).toHaveBeenCalledOnce();
		expect(element.state).toBe('pending');
		await connect(element);
		expect(element.label).toBe('Disconnected');
		expect(ready).toHaveBeenCalledTimes(2);
	});

	it('observes replacement fieldsets and changed label associations', async () => {
		const element = await connect(authored());
		element.innerHTML = `<fieldset><legend>Fit</legend>
			<input id="regular-fit" name="fit" type="radio" value="regular">
			<label for="regular-fit">Regular</label>
			<input id="slim-fit" name="fit" type="radio" value="slim">
			<label for="slim-fit">Slim</label></fieldset>`;
		await vi.waitFor(() =>
			expect(element.querySelector('[data-last]')?.dataset.value).toBe(
				'slim',
			),
		);
		element.querySelector('label').htmlFor = 'wrong-id';
		await vi.waitFor(() => expect(element.state).toBe('error'));
		element.querySelector('label').htmlFor = 'regular-fit';
		await vi.waitFor(() => expect(element.state).toBe('ready'));
	});

	it('waits for parsing to finish before inspecting streamed child markup', async () => {
		vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
		const element = document.createElement('form-multi-switch');
		document.body.append(element);
		await new Promise((resolve) => requestAnimationFrame(resolve));
		expect(element.state).toBe('pending');
		element.innerHTML = authored().innerHTML;
		document.dispatchEvent(new Event('DOMContentLoaded'));
		await element.ready;
		expect(element.state).toBe('ready');
	});

	it('supports explicit label associations and wrappers with reliable endpoint hooks', async () => {
		const element = document.createElement('form-multi-switch');
		element.innerHTML = `<fieldset><legend>Layout</legend>
			<div><input id="wide" type="radio" name="layout" value="wide">
				<label for="wide">Wide</label></div>
			<div><input id="narrow" type="radio" name="layout" value="narrow">
				<label for="narrow">Narrow</label></div>
		</fieldset>`;
		await connect(element);
		const labels = element.querySelectorAll('[data-multi-switch-choice]');
		expect(labels).toHaveLength(2);
		expect(labels[0].hasAttribute('data-first')).toBe(true);
		expect(labels[1].hasAttribute('data-last')).toBe(true);
		expect(labels[1].hasAttribute('data-first')).toBe(false);
	});

	it('generates controls from attributes and preserves translated text', async () => {
		const element = document.createElement('form-multi-switch');
		element.setAttribute('name', 'densite');
		element.setAttribute('label', 'Densité');
		element.setAttribute(
			'choices',
			JSON.stringify([{ label: 'Aérée' }, { label: 'Compacte' }]),
		);
		element.setAttribute('value', 'Compacte');
		element.setAttribute('icon-only', '');
		await connect(element);
		expect(element.querySelector('legend').textContent).toBe('Densité');
		expect(element.value).toBe('Compacte');
		expect(
			element.querySelectorAll('[data-multi-switch-label]'),
		).toHaveLength(2);
		expect(element.iconOnly).toBe(true);
		for (const input of element.querySelectorAll('input')) {
			expect(input.labels).toHaveLength(1);
			expect(input.name).toBe('densite');
		}
	});

	it('configures atomically and treats labels as text, never HTML', async () => {
		const element = document.createElement('form-multi-switch');
		element.configure({
			...configuration,
			choices: [{ label: '<img src=x onerror=alert(1)>', value: 'safe' }],
			value: 'safe',
			iconOnly: true,
		});
		await connect(element);
		expect(element.querySelector('img')).toBeNull();
		expect(
			element.querySelector('[data-multi-switch-label]').textContent,
		).toContain('<img');
		expect(() =>
			element.configure({ ...configuration, choices: [] }),
		).toThrow();
		expect(element.value).toBe('safe');
	});

	it('refuses to replace authored markup through configure()', async () => {
		const element = await connect(authored());
		expect(() => element.configure(configuration)).toThrow(/authored/i);
		expect(element.querySelectorAll('input')).toHaveLength(3);
	});

	it('preserves native values when omitted in authored markup', async () => {
		const element = authored();
		element.querySelector('input').removeAttribute('value');
		await connect(element);
		expect(element.value).toBe('on');
	});

	it('rejects duplicate choice values before changing configuration', () => {
		const element = document.createElement('form-multi-switch');
		expect(() =>
			element.configure({
				...configuration,
				choices: [
					{ label: 'One', value: 'same' },
					{ label: 'Two', value: 'same' },
				],
			}),
		).toThrow(/unique/i);
		expect(element.hasAttribute('choices')).toBe(false);
	});

	it.each([
		[
			'missing legend',
			(element) => element.querySelector('legend').remove(),
		],
		[
			'mixed names',
			(element) => {
				element.querySelectorAll('input')[1].name = 'other';
			},
		],
		[
			'duplicate values',
			(element) => {
				element.querySelectorAll('input')[1].value = 'comfortable';
			},
		],
		[
			'missing label',
			(element) => {
				const label = element.querySelector('label');
				label.replaceWith(label.querySelector('input'));
			},
		],
		[
			'decorative-only label',
			(element) => {
				const label = element.querySelector('label');
				const input = label.querySelector('input');
				label.replaceChildren(input);
				const icon = document.createElement('span');
				icon.setAttribute('aria-hidden', 'true');
				icon.textContent = 'Sun';
				label.append(icon);
			},
		],
	])(
		'reports %s and leaves fallback controls unenhanced',
		async (_name, mutate) => {
			const element = authored();
			mutate(element);
			const error = vi.fn();
			element.addEventListener('form-multi-switch:error', error);
			document.body.append(element);
			await expect(element.ready).rejects.toBeInstanceOf(Error);
			expect(element.state).toBe('error');
			expect(element.querySelectorAll('input')).toHaveLength(3);
			expect(
				element.querySelector('[data-multi-switch-choice]'),
			).toBeNull();
			expect(error).toHaveBeenCalledOnce();
			expect(console.error).toHaveBeenCalledOnce();
		},
	);

	it('reports malformed declarative choices without generating partial controls', async () => {
		const element = document.createElement('form-multi-switch');
		element.setAttribute('choices', '{invalid');
		document.body.append(element);
		await expect(element.ready).rejects.toBeInstanceOf(Error);
		expect(element.querySelector('fieldset')).toBeNull();
	});

	it('keeps native submission and form reset defaults after property updates', async () => {
		const form = document.createElement('form');
		document.body.append(form);
		const element = await connect(authored(), form);
		element.value = 'compact';
		expect(new FormData(form).get('density')).toBe('compact');
		expect(
			element
				.querySelector('[data-value="compact"]')
				.hasAttribute('data-selected'),
		).toBe(true);
		form.reset();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(element.value).toBe('comfortable');
		expect(
			element
				.querySelector('[data-value="comfortable"]')
				.hasAttribute('data-selected'),
		).toBe(true);
		element.value = null;
		expect(new FormData(form).has('density')).toBe(false);
		expect(() => {
			element.value = 'missing';
		}).toThrow(RangeError);
	});

	it('preserves required and disabled behavior without losing per-choice disabling', async () => {
		const element = await connect(authored());
		element.required = true;
		element.value = null;
		expect(element.querySelector('input').required).toBe(true);
		expect(element.querySelector('input').validity.valueMissing).toBe(true);
		element.disabled = true;
		expect(element.querySelector('fieldset').disabled).toBe(true);
		element.disabled = false;
		expect(element.querySelector('fieldset').disabled).toBe(false);
		expect(element.querySelectorAll('input')[2].disabled).toBe(true);
	});

	it('reconciles reset styling and the change baseline after the default-action checkpoint', async () => {
		const form = document.createElement('form');
		document.body.append(form);
		const element = await connect(authored(), form);
		element.value = 'compact';
		form.dispatchEvent(
			new Event('reset', { bubbles: true, cancelable: true }),
		);
		await Promise.resolve();
		element.querySelector('input[value="comfortable"]').checked = true;
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(element.querySelector('[data-selected]').dataset.value).toBe(
			'comfortable',
		);
		const change = vi.fn();
		element.addEventListener('form-multi-switch:change', change);
		element.querySelector('input[value="compact"]').click();
		expect(change.mock.calls[0][0].detail.previousValue).toBe(
			'comfortable',
		);
	});

	it('clears generated selection and reset defaults when its value attribute is removed', async () => {
		const form = document.createElement('form');
		document.body.append(form);
		const element = document.createElement('form-multi-switch');
		element.configure(configuration);
		await connect(element, form);
		element.removeAttribute('value');
		expect(element.value).toBeNull();
		expect(new FormData(form).has('density')).toBe(false);
		expect(
			[...element.querySelectorAll('input')].every(
				(input) => !input.defaultChecked,
			),
		).toBe(true);
		element.value = 'compact';
		form.reset();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(element.value).toBeNull();
		expect(element.querySelector('[data-selected]')).toBeNull();
		element.setAttribute('value', 'comfortable');
		expect(element.value).toBe('comfortable');
	});

	it.each([false, true])(
		'tracks input-only updates before the next native change (wait: %s)',
		async (wait) => {
			const element = await connect(authored());
			const changes = vi.fn();
			element.addEventListener('form-multi-switch:change', changes);
			const [comfortable, compact] = element.querySelectorAll('input');
			compact.checked = true;
			compact.dispatchEvent(new Event('input', { bubbles: true }));
			expect(changes).not.toHaveBeenCalled();
			if (wait) await Promise.resolve();
			comfortable.click();
			expect(changes).toHaveBeenCalledOnce();
			expect(changes.mock.calls[0][0].detail).toEqual({
				value: 'comfortable',
				previousValue: 'compact',
				index: 0,
			});
			compact.click();
			expect(changes).toHaveBeenCalledTimes(2);
			expect(changes.mock.calls[1][0].detail.previousValue).toBe(
				'comfortable',
			);
		},
	);

	it('retains the native change baseline across a microtask checkpoint', async () => {
		const element = await connect(authored());
		const changes = vi.fn();
		element.addEventListener('form-multi-switch:change', changes);
		const compact = element.querySelector('input[value="compact"]');
		compact.checked = true;
		compact.dispatchEvent(new Event('input', { bubbles: true }));
		await Promise.resolve();
		compact.dispatchEvent(new Event('change', { bubbles: true }));
		expect(changes).toHaveBeenCalledOnce();
		expect(changes.mock.calls[0][0].detail.previousValue).toBe(
			'comfortable',
		);
	});

	it('uses the native form owner even with an explicit form attribute', async () => {
		const form = document.createElement('form');
		form.id = 'settings';
		document.body.append(form);
		const element = authored();
		for (const input of element.querySelectorAll('input')) {
			input.setAttribute('form', 'settings');
		}
		await connect(element);
		element.value = 'compact';
		form.reset();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(element.value).toBe('comfortable');
		expect(
			element
				.querySelector('[data-value="comfortable"]')
				.hasAttribute('data-selected'),
		).toBe(true);
	});

	it('emits native and custom change once, with separate repeat activation', async () => {
		const element = await connect(authored());
		const change = vi.fn();
		const activate = vi.fn();
		const native = vi.fn();
		element.addEventListener('form-multi-switch:change', change);
		element.addEventListener('form-multi-switch:activate', activate);
		element.addEventListener('change', native);
		element.querySelectorAll('label')[1].click();
		expect(change).toHaveBeenCalledOnce();
		expect(native).toHaveBeenCalledOnce();
		expect(activate).toHaveBeenCalledOnce();
		expect(change.mock.calls[0][0].detail).toEqual({
			value: 'compact',
			previousValue: 'comfortable',
			index: 1,
		});
		element.querySelectorAll('input')[1].click();
		expect(change).toHaveBeenCalledOnce();
		expect(activate).toHaveBeenCalledTimes(2);
		element.value = 'comfortable';
		expect(change).toHaveBeenCalledOnce();
	});

	it('refreshes deliberately changed markup and clears stale endpoint markers', async () => {
		const element = await connect(authored());
		const last = element.querySelectorAll('label')[2];
		last.remove();
		await element.refresh();
		expect(element.querySelectorAll('[data-last]')).toHaveLength(1);
		expect(
			element.querySelector('[data-last]').getAttribute('data-value'),
		).toBe('compact');
	});

	it('supports attribute reconfiguration without duplicating fieldsets', async () => {
		const element = document.createElement('form-multi-switch');
		element.configure(configuration);
		await connect(element);
		element.label = 'Density preference';
		await element.ready;
		expect(element.querySelector('legend').textContent).toBe(
			'Density preference',
		);
		expect(element.querySelectorAll('fieldset')).toHaveLength(1);
	});

	it('ignores configuration attributes when authored markup supplies the group', async () => {
		const element = authored();
		const fieldset = element.querySelector('fieldset');
		element.setAttribute('choices', 'not JSON');
		element.setAttribute('name', 'ignored-name');
		element.setAttribute('label', 'Ignored legend');
		element.setAttribute('value', 'missing');
		expect(element.name).toBe('density');
		expect(element.label).toBe('Display density');
		await connect(element);
		expect(element.querySelector('fieldset')).toBe(fieldset);
		expect(element.querySelectorAll('input')).toHaveLength(3);
		expect(element.value).toBe('comfortable');
		expect(element.querySelector('input').defaultChecked).toBe(true);
		element.name = 'still-ignored';
		element.label = 'Still ignored';
		element.setAttribute('choices', '[]');
		element.setAttribute('value', 'compact');
		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(element.name).toBe('density');
		expect(element.label).toBe('Display density');
		expect(element.value).toBe('comfortable');
		expect(element.state).toBe('ready');
	});

	it('keeps authored selection and reset defaults even with a valid conflicting value', async () => {
		const form = document.createElement('form');
		document.body.append(form);
		const element = authored();
		element.setAttribute('value', 'compact');
		try {
			await connect(element, form);
			expect(element.value).toBe('comfortable');
			element.value = 'compact';
			expect(new FormData(form).get('density')).toBe('compact');
			form.reset();
			await new Promise((resolve) => setTimeout(resolve, 0));
			expect(element.value).toBe('comfortable');
		} finally {
			form.remove();
		}
	});

	it('does not fill an unselected authored group from the value attribute', async () => {
		const element = authored();
		element.querySelector('input').removeAttribute('checked');
		element.setAttribute('value', 'compact');
		await connect(element);
		expect(element.value).toBeNull();
	});

	it('uses authored markup when it replaces a generated fieldset', async () => {
		const element = document.createElement('form-multi-switch');
		element.configure(configuration);
		await connect(element);
		element.innerHTML = authored().innerHTML;
		element.querySelector('legend').textContent = 'Authored density';
		await vi.waitFor(() => expect(element.label).toBe('Authored density'));
		await vi.waitFor(() => expect(element.state).toBe('ready'));
		expect(element.querySelectorAll('fieldset')).toHaveLength(1);
	});

	it('reports invalid authored markup rather than replacing it with configured choices', async () => {
		const element = authored();
		element.querySelector('legend').remove();
		element.setAttribute('name', configuration.name);
		element.setAttribute('label', configuration.label);
		element.setAttribute('choices', JSON.stringify(choices));
		document.body.append(element);
		await expect(element.ready).rejects.toThrow(/legend/i);
		expect(element.querySelector('legend')).toBeNull();
	});

	it('does not restart behavior for ignored attributes or host state attributes', async () => {
		const element = authored();
		const initialize = vi.fn();
		vi.spyOn(element, 'loadModule').mockResolvedValue({ initialize });
		element.script = './behavior.js';
		await connect(element);
		element.setAttribute('value', 'compact');
		element.setAttribute('choices', 'invalid JSON');
		element.name = 'ignored';
		element.label = 'Ignored';
		element.required = true;
		element.disabled = true;
		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(element.value).toBe('comfortable');
		expect(initialize).toHaveBeenCalledOnce();
		expect(element.state).toBe('ready');
	});

	it('retains decorative icons and accessible label text in authored icon mode', async () => {
		const element = authored();
		element.iconOnly = true;
		const icon = document.createElement('span');
		icon.setAttribute('aria-hidden', 'true');
		icon.textContent = '☀';
		element.querySelector('label').append(icon);
		await connect(element);
		expect(icon.parentElement).toBe(element.querySelector('label'));
		expect(
			element.querySelector('[data-multi-switch-label]').textContent,
		).toBe('Comfortable');
	});

	it('upgrades properties assigned before registration', async () => {
		const element = document.createElement('late-multi-switch');
		element.innerHTML = authored().innerHTML;
		element.value = 'compact';
		element.iconOnly = true;
		document.body.append(element);
		class LateSwitch extends FormMultiSwitchElement {}
		customElements.define('late-multi-switch', LateSwitch);
		await element.ready;
		expect(element.value).toBe('compact');
		expect(element.iconOnly).toBe(true);
	});

	it('does not duplicate listeners when disconnected and reconnected', async () => {
		const element = await connect(authored());
		const listener = vi.fn();
		element.addEventListener('form-multi-switch:change', listener);
		element.remove();
		await connect(element);
		element.querySelectorAll('input')[1].click();
		expect(listener).toHaveBeenCalledOnce();
	});

	it('rejects readiness if removed before its scheduled initialization', async () => {
		const element = authored();
		document.body.append(element);
		const ready = element.ready;
		element.remove();
		await expect(ready).rejects.toHaveProperty('name', 'AbortError');
		await connect(element);
		expect(element.state).toBe('ready');
	});

	it('recovers after correcting an invalid initial-value attribute', async () => {
		const element = document.createElement('form-multi-switch');
		element.configure(configuration);
		await connect(element);
		element.setAttribute('value', 'missing');
		expect(element.state).toBe('error');
		element.setAttribute('value', 'compact');
		await element.ready;
		expect(element.state).toBe('ready');
		expect(element.value).toBe('compact');
	});

	it('makes the registration helper available under the component-specific name', async () => {
		const { defineFormMultiSwitch } = await import('../define.js');
		expect(defineFormMultiSwitch).toBeTypeOf('function');
		expect(defineFormMultiSwitch()).toBe(true);
	});

	it('reports a registration conflict rather than claiming success', async () => {
		const { defineFormMultiSwitch } = await import('../define.js');
		vi.spyOn(window.customElements, 'get').mockReturnValue(
			class extends HTMLElement {},
		);
		expect(() => defineFormMultiSwitch()).toThrow(/already/i);
	});
});

describe('behavior module readiness', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});
	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it('waits for async initialization before enhancing the radio presentation', async () => {
		let finish;
		const pending = new Promise((resolve) => {
			finish = resolve;
		});
		const initialize = vi.fn(() => pending);
		const element = authored();
		const load = vi
			.spyOn(element, 'loadModule')
			.mockResolvedValue({ initialize });
		element.script = './behavior.js';
		document.body.append(element);
		await vi.waitFor(() => expect(initialize).toHaveBeenCalledOnce());
		expect(load).toHaveBeenCalledWith(
			new URL('./behavior.js', document.baseURI).href,
		);
		expect(element.state).toBe('loading');
		expect(element.querySelector('[data-multi-switch-choice]')).toBeNull();
		expect(initialize.mock.calls[0][0]).toBe(element);
		expect(initialize.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
		finish();
		await element.ready;
		expect(element.state).toBe('ready');
	});

	it('allows modules without an initializer', async () => {
		const element = authored();
		vi.spyOn(element, 'loadModule').mockResolvedValue({});
		element.script = './behavior.js';
		await connect(element);
		expect(element.state).toBe('ready');
	});

	it.each([
		['import failure', () => Promise.reject(new Error('network failed'))],
		['invalid initializer', () => Promise.resolve({ initialize: true })],
		[
			'initialization failure',
			() =>
				Promise.resolve({
					initialize() {
						throw new Error('setup failed');
					},
				}),
		],
	])(
		'reports %s while preserving the native group',
		async (_name, loader) => {
			const element = authored();
			vi.spyOn(element, 'loadModule').mockImplementation(loader);
			element.script = './behavior.js';
			document.body.append(element);
			await expect(element.ready).rejects.toBeInstanceOf(Error);
			expect(element.state).toBe('error');
			expect(element.querySelector('input').checked).toBe(true);
			expect(
				element.querySelector('[data-multi-switch-choice]'),
			).toBeNull();
		},
	);

	it('rejects executable and inline module URL schemes', async () => {
		const element = authored();
		const load = vi.spyOn(element, 'loadModule');
		element.script = 'data:text/javascript,alert(1)';
		document.body.append(element);
		await expect(element.ready).rejects.toThrow(/https?/i);
		expect(load).not.toHaveBeenCalled();
	});

	it('aborts and ignores stale initialization when the source changes', async () => {
		let finish;
		let oldSignal;
		const cleanup = vi.fn();
		const element = authored();
		vi.spyOn(element, 'loadModule')
			.mockResolvedValueOnce({
				initialize(_element, { signal }) {
					oldSignal = signal;
					return new Promise((resolve) => {
						finish = () => resolve(cleanup);
					});
				},
			})
			.mockResolvedValueOnce({});
		element.script = './first.js';
		document.body.append(element);
		await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
		const oldReady = element.ready;
		element.script = './second.js';
		await expect(oldReady).rejects.toHaveProperty('name', 'AbortError');
		await element.ready;
		finish();
		await Promise.resolve();
		await Promise.resolve();
		expect(oldSignal.aborted).toBe(true);
		expect(cleanup).toHaveBeenCalledOnce();
		expect(element.state).toBe('ready');
	});

	it('cleans up initialized behavior when disconnected', async () => {
		const cleanup = vi.fn();
		const element = authored();
		vi.spyOn(element, 'loadModule').mockResolvedValue({
			initialize: () => cleanup,
		});
		element.script = './behavior.js';
		await connect(element);
		element.remove();
		expect(cleanup).toHaveBeenCalledOnce();
		expect(element.state).toBe('pending');
	});

	it('does not enhance after configuration fails during module initialization', async () => {
		let finish;
		let signal;
		const element = document.createElement('form-multi-switch');
		element.configure(configuration);
		vi.spyOn(element, 'loadModule').mockResolvedValue({
			initialize(_control, context) {
				signal = context.signal;
				return new Promise((resolve) => {
					finish = resolve;
				});
			},
		});
		element.script = './behavior.js';
		document.body.append(element);
		await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
		const ready = element.ready;
		element.setAttribute('value', 'missing');
		await expect(ready).rejects.toBeInstanceOf(RangeError);
		finish();
		await Promise.resolve();
		await Promise.resolve();
		expect(signal.aborted).toBe(true);
		expect(element.state).toBe('error');
		expect(element.querySelector('[data-multi-switch-choice]')).toBeNull();
	});
});
