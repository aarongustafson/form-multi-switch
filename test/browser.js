import '../define.js';

const fixture = document.querySelector('#fixture');
const results = document.querySelector('#results');

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

async function until(predicate) {
	for (let attempt = 0; attempt < 120; attempt += 1) {
		if (predicate()) return;
		await new Promise((resolve) => requestAnimationFrame(resolve));
	}
	throw new Error('The observed update did not complete.');
}

async function setup() {
	fixture.innerHTML = `<form><form-multi-switch>
		<fieldset><legend>Delivery speed</legend>
			<label><input type="radio" name="speed" value="standard" checked>Standard</label>
			<label><input type="radio" name="speed" value="express">Express</label>
			<label><input type="radio" name="speed" value="overnight" disabled>Overnight</label>
		</fieldset>
	</form-multi-switch><button>Submit</button></form>`;
	const control = fixture.querySelector('form-multi-switch');
	await control.ready;
	return {
		control,
		form: fixture.querySelector('form'),
		inputs: [...control.querySelectorAll('input')],
	};
}

const tests = [
	[
		'Demo styles preserve shared borders in horizontal and vertical layouts',
		async () => {
			const stylesheet = document.createElement('link');
			stylesheet.rel = 'stylesheet';
			stylesheet.href = new URL(
				'../demo/styles.css',
				import.meta.url,
			).href;
			try {
				await new Promise((resolve, reject) => {
					stylesheet.onload = resolve;
					stylesheet.onerror = () =>
						reject(new Error('Demo stylesheet failed to load.'));
					document.head.append(stylesheet);
				});
				const { inputs } = await setup();
				for (const width of [720, 240]) {
					fixture.style.inlineSize = `${width}px`;
					const boxes = inputs.map((input) =>
						input.labels[0].getBoundingClientRect(),
					);
					const overlap =
						width < 320
							? boxes[0].bottom - boxes[1].top
							: boxes[0].right - boxes[1].left;
					assert(
						Math.abs(overlap - 1) < 0.5,
						`Demo styles removed the shared border overlap at ${width}px.`,
					);
				}
			} finally {
				stylesheet.remove();
				fixture.style.removeProperty('inline-size');
			}
		},
	],
	[
		'Removing generated value clears submission and native reset defaults',
		async () => {
			fixture.innerHTML = `<form><form-multi-switch name="density" label="Density"
				choices='[{"label":"Comfortable","value":"comfortable"},{"label":"Compact","value":"compact"}]'
				value="comfortable"></form-multi-switch></form>`;
			const control = fixture.querySelector('form-multi-switch');
			const form = fixture.querySelector('form');
			await control.ready;
			control.removeAttribute('value');
			assert(
				control.value === null && !new FormData(form).has('density'),
				'Removed value remains selected or submitted.',
			);
			control.value = 'compact';
			form.reset();
			await Promise.resolve();
			assert(
				control.value === null &&
					!control.querySelector('[data-selected]'),
				'Reset restored a removed default.',
			);
		},
	],
	[
		'Input-only updates preserve the next native change and its previous value',
		async () => {
			const { control, inputs } = await setup();
			const changes = [];
			control.addEventListener('form-multi-switch:change', (event) =>
				changes.push(event.detail),
			);
			inputs[1].checked = true;
			inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
			assert(
				changes.length === 0,
				'An input-only update emitted a custom change.',
			);
			inputs[0].click();
			assert(
				changes.length === 1 &&
					changes[0].previousValue === 'express' &&
					changes[0].value === 'standard',
				'The next native change was lost or used a stale baseline.',
			);
			inputs[1].click();
			assert(
				changes.length === 2 && changes[1].previousValue === 'standard',
				'The native input/change sequence lost its baseline.',
			);
		},
	],
	[
		'Authored markup overrides configuration attributes without changing submission or reset',
		async () => {
			fixture.innerHTML = `<form><form-multi-switch
				name="ignored" label="Ignored" choices="not JSON" value="express">
				<fieldset><legend>Delivery speed</legend>
					<label><input type="radio" name="speed" value="standard" checked>Standard</label>
					<label><input type="radio" name="speed" value="express">Express</label>
				</fieldset></form-multi-switch></form>`;
			const control = fixture.querySelector('form-multi-switch');
			const form = fixture.querySelector('form');
			await control.ready;
			assert(
				control.name === 'speed' && control.label === 'Delivery speed',
				'Component attributes overrode the authored name or legend.',
			);
			assert(
				control.value === 'standard',
				'The value attribute overrode authored checked state.',
			);
			assert(
				new FormData(form).get('speed') === 'standard' &&
					!new FormData(form).has('ignored'),
				'Conflicting attributes changed the submitted name or value.',
			);
			control.value = 'express';
			form.reset();
			await Promise.resolve();
			assert(
				control.value === 'standard',
				'The ignored value attribute changed reset defaults.',
			);
			control.setAttribute('value', 'missing');
			control.setAttribute('choices', '[]');
			await new Promise((resolve) => requestAnimationFrame(resolve));
			assert(
				control.state === 'ready' && control.value === 'standard',
				'Changing ignored attributes invalidated authored controls.',
			);
			control.querySelector('input[value="express"]').labels[0].click();
			assert(
				new FormData(form).get('speed') === 'express',
				'Native interaction stopped updating submission.',
			);
		},
	],
	[
		'Defaults install once and ordinary CSS overrides them without an external stylesheet',
		async () => {
			const { inputs } = await setup();
			assert(
				document.querySelectorAll('#form-multi-switch-styles')
					.length === 1,
				'Default styles were duplicated.',
			);
			assert(
				!document.querySelector('link[href*="form-multi-switch.css"]'),
				'The test relies on external component CSS.',
			);
			const style = document.createElement('style');
			style.textContent = 'label { border-radius: 17px; }';
			document.head.prepend(style);
			try {
				assert(
					getComputedStyle(inputs[0].labels[0])
						.borderTopLeftRadius === '17px',
					'An earlier ordinary author rule did not override the defaults.',
				);
			} finally {
				style.remove();
			}
		},
	],
	[
		'Observed choice changes update endpoints, events, and submitted values',
		async () => {
			const { control, form } = await setup();
			const label = document.createElement('label');
			label.innerHTML =
				'<input type="radio" name="speed" value="collection">Collection';
			control.querySelector('fieldset').append(label);
			await until(() => label.hasAttribute('data-last'));
			let changes = 0;
			control.addEventListener('form-multi-switch:change', () => {
				changes += 1;
			});
			label.click();
			assert(
				new FormData(form).get('speed') === 'collection',
				'A new radio did not submit.',
			);
			assert(
				changes === 1,
				'A new radio emitted duplicate or missing change events.',
			);
			label.remove();
			await until(
				() =>
					control.querySelector('[data-last]')?.dataset.value ===
					'overnight',
			);
		},
	],
	[
		'Ancestor disabled state and external form ownership update automatically',
		async () => {
			const { control, inputs, form } = await setup();
			const ancestor = document.createElement('fieldset');
			control.replaceWith(ancestor);
			ancestor.append(control);
			await control.ready;
			ancestor.disabled = true;
			await until(
				() => control.querySelectorAll('[data-disabled]').length === 3,
			);
			assert(
				!new FormData(form).has('speed'),
				'Disabled ancestor controls were submitted.',
			);
			ancestor.disabled = false;
			await until(
				() => control.querySelectorAll('[data-disabled]').length === 1,
			);
			const external = document.createElement('form');
			external.id = 'external-owner';
			fixture.append(external);
			const reassociated = new Promise((resolve) =>
				control.addEventListener('form-multi-switch:ready', resolve, {
					once: true,
				}),
			);
			for (const input of inputs) input.setAttribute('form', external.id);
			await reassociated;
			control.value = 'express';
			external.reset();
			await Promise.resolve();
			assert(
				control.value === 'standard',
				'Reset listener did not move to the new form.',
			);
			const renamed = new Promise((resolve) =>
				control.addEventListener('form-multi-switch:ready', resolve, {
					once: true,
				}),
			);
			external.id = 'renamed-owner';
			await renamed;
			assert(
				inputs[0].form === null,
				'A renamed form retained an obsolete association.',
			);
			external.remove();
		},
	],
	[
		'Selected and unselected segments share one connected border',
		async () => {
			fixture.style.inlineSize = '45rem';
			const { inputs } = await setup();
			const first = inputs[0].labels[0];
			const second = inputs[1].labels[0];
			const firstStyle = getComputedStyle(first);
			const secondStyle = getComputedStyle(second);
			assert(
				firstStyle.borderTopColor === secondStyle.borderTopColor,
				'Selection changed the shared border color.',
			);
			const overlap =
				first.getBoundingClientRect().right -
				second.getBoundingClientRect().left;
			assert(
				Math.abs(overlap - parseFloat(firstStyle.borderRightWidth)) <
					0.5,
				'Adjacent segments must share a single border, not double it.',
			);
			fixture.style.removeProperty('inline-size');
		},
	],
	[
		'Narrow controls stack as one connected item instead of wrapping',
		async () => {
			fixture.style.inlineSize = '15rem';
			const { inputs } = await setup();
			const labels = inputs.map((input) => input.labels[0]);
			const boxes = labels.map((label) => label.getBoundingClientRect());
			assert(
				boxes.every(
					(box) =>
						Math.abs(box.left - boxes[0].left) < 0.5 &&
						Math.abs(box.width - boxes[0].width) < 0.5,
				),
				'Narrow choices did not form one full-width column.',
			);
			assert(
				boxes.every(
					(box, index) =>
						index === 0 ||
						Math.abs(boxes[index - 1].bottom - box.top - 1) < 0.5,
				),
				'Stacked choices did not share their borders.',
			);
			const first = getComputedStyle(labels[0]);
			const last = getComputedStyle(labels.at(-1));
			assert(
				parseFloat(first.borderStartStartRadius) > 0 &&
					parseFloat(first.borderStartEndRadius) > 0 &&
					parseFloat(last.borderEndStartRadius) > 0 &&
					parseFloat(last.borderEndEndRadius) > 0,
				'Stacked corners did not follow the top and bottom endpoints.',
			);
			fixture.style.removeProperty('inline-size');
		},
	],
	[
		'Wrapped choices keep shared borders in both directions and layouts',
		async () => {
			fixture.innerHTML = `<form-multi-switch>
				<fieldset><legend>Reading width</legend>
					<div><input id="wrapped-narrow" type="radio" name="wrapped-width" value="narrow" checked><label for="wrapped-narrow">Narrow</label></div>
					<div><input id="wrapped-standard" type="radio" name="wrapped-width" value="standard"><label for="wrapped-standard">Standard</label></div>
					<div><input id="wrapped-wide" type="radio" name="wrapped-width" value="wide"><label for="wrapped-wide">Wide</label></div>
				</fieldset>
			</form-multi-switch>`;
			const control = fixture.querySelector('form-multi-switch');
			await control.ready;
			for (const direction of ['ltr', 'rtl']) {
				control.dir = direction;
				for (const width of [720, 240]) {
					fixture.style.inlineSize = `${width}px`;
					const boxes = [
						...control.querySelectorAll(
							'[data-multi-switch-choice]',
						),
					].map((label) => label.getBoundingClientRect());
					for (let index = 1; index < boxes.length; index += 1) {
						const previous = boxes[index - 1];
						const current = boxes[index];
						const overlap =
							width < 320
								? previous.bottom - current.top
								: direction === 'rtl'
									? current.right - previous.left
									: previous.right - current.left;
						assert(
							Math.abs(overlap - 1) < 0.5,
							`Wrapper borders separated at ${width}px in ${direction}.`,
						);
					}
				}
			}
		},
	],
	[
		'Canceled activation restores the selected styling',
		async () => {
			const { control, inputs } = await setup();
			let changes = 0;
			control.addEventListener('form-multi-switch:change', () => {
				changes += 1;
			});
			control.addEventListener('click', (event) =>
				event.preventDefault(),
			);
			inputs[1].click();
			await Promise.resolve();
			assert(
				control.value === 'standard',
				'Native selection did not roll back.',
			);
			assert(
				control.querySelector('[data-selected]')?.dataset.value ===
					'standard',
				'Selected hook did not roll back.',
			);
			assert(changes === 0, 'Canceled activation emitted a change.');
		},
	],
	[
		'Canceled form reset preserves current selection',
		async () => {
			const { control, form } = await setup();
			control.value = 'express';
			form.addEventListener('reset', (event) => event.preventDefault());
			form.reset();
			await Promise.resolve();
			assert(
				control.value === 'express',
				'Canceled reset changed the selection.',
			);
			assert(
				control.querySelector('[data-selected]')?.dataset.value ===
					'express',
				'Canceled reset changed the hook.',
			);
		},
	],
	[
		'Native required validation focuses a retained radio',
		async () => {
			const { control, form, inputs } = await setup();
			control.required = true;
			control.value = null;
			assert(
				!form.checkValidity(),
				'An empty required group passed validation.',
			);
			form.reportValidity();
			assert(
				inputs.includes(document.activeElement),
				'Validation did not focus a radio.',
			);
			control.value = 'express';
			assert(form.checkValidity(), 'A selected group failed validation.');
		},
	],
	[
		'FormData and reset use the native inputs',
		async () => {
			const { control, form } = await setup();
			control.value = 'express';
			assert(
				new FormData(form).get('speed') === 'express',
				'Submission value is incorrect.',
			);
			form.reset();
			await Promise.resolve();
			assert(
				control.value === 'standard',
				'Reset did not restore the default.',
			);
		},
	],
	[
		'Inputs remain focusable and labels provide usable pointer targets',
		async () => {
			const { control, inputs } = await setup();
			const label = inputs[0].labels[0];
			const styles = getComputedStyle(inputs[0]);
			assert(
				styles.display !== 'none' && styles.visibility !== 'hidden',
				'A radio was removed from the accessibility tree.',
			);
			inputs[0].focus();
			assert(
				document.activeElement === inputs[0],
				'A radio could not receive focus.',
			);
			assert(
				control.querySelector('[data-focus]') === label,
				'Keyboard focus has no visible segment hook.',
			);
			const focusStyle = getComputedStyle(label);
			const hasOuterRing =
				parseFloat(focusStyle.outlineWidth) >= 3 &&
				parseFloat(focusStyle.outlineOffset) > 0;
			assert(
				hasOuterRing === inputs[0].matches(':focus-visible'),
				'The outer ring must follow native focus-visible, independently of selection.',
			);
			assert(
				label.getBoundingClientRect().height >= 44,
				'The target is shorter than 44 CSS pixels.',
			);
		},
	],
];

let failures = 0;
for (const [name, run] of tests) {
	const item = document.createElement('li');
	try {
		await run();
		item.textContent = `PASS: ${name}`;
	} catch (error) {
		failures += 1;
		item.textContent = `FAIL: ${name}: ${error.message}`;
		console.error(error);
	}
	fixture.style.removeProperty('inline-size');
	results.append(item);
}
fixture.replaceChildren();
results.dataset.failures = String(failures);
results.dataset.complete = 'true';
