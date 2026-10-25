import '../define.js';

const fixture = document.querySelector('#fixture');
const results = document.querySelector('#results');

function assert(condition, message) {
	if (!condition) throw new Error(message);
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
		'Canceled activation restores the selected styling',
		async () => {
			const { control, inputs } = await setup();
			let changes = 0;
			control.addEventListener('form-multi-switch-change', () => {
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
			assert(
				parseFloat(focusStyle.outlineWidth) >= 3 &&
					parseFloat(focusStyle.outlineOffset) >= 0,
				'Focus must have an outer outline distinct from the selected state.',
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
	results.append(item);
}
fixture.replaceChildren();
results.dataset.failures = String(failures);
results.dataset.complete = 'true';
