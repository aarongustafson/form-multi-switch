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
	fixture.style.removeProperty('inline-size');
	results.append(item);
}
fixture.replaceChildren();
results.dataset.failures = String(failures);
results.dataset.complete = 'true';
