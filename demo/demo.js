import '../define.js';

const configured = document.querySelector('#js-density');
configured.configure({
	name: 'density',
	label: 'Display density',
	choices: [
		{ label: 'Comfortable', value: 'comfortable' },
		{ label: 'Compact', value: 'compact' },
		{ label: 'Condensed', value: 'condensed' },
	],
	value: 'comfortable',
});

document.querySelector('#set-density').addEventListener('click', () => {
	configured.value = 'compact';
});
configured.ready.then(
	() => {
		document.querySelector('#set-density').hidden = false;
	},
	(error) => {
		console.error(
			'The configured demo control could not initialize.',
			error,
		);
	},
);

const form = document.querySelector('#required-form');
form.addEventListener('submit', (event) => {
	event.preventDefault();
	form.querySelector('output').textContent = JSON.stringify(
		Object.fromEntries(new FormData(form)),
	);
});

const control = document.querySelector('#event-view');
const output = document.querySelector('#event-log');
const entries = [];
for (const name of ['activate', 'change']) {
	control.addEventListener(`form-multi-switch:${name}`, (event) => {
		entries.unshift(`${name} ${JSON.stringify(event.detail)}`);
		entries.length = Math.min(entries.length, 6);
		output.textContent = entries.join('\n');
	});
}

const behavior = document.querySelector('#behavior');
const section = behavior.closest('section');
const status = section.querySelector('[data-status]');
behavior.addEventListener('form-multi-switch:ready', () => {
	status.textContent = 'The preview behavior is ready.';
});
behavior.addEventListener('form-multi-switch:error', () => {
	status.textContent = section.dataset.errorMessage;
});
