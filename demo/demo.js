import '../define.js';

const configured = document.querySelector('#js-density');
configured.configure({
	name: 'density',
	label: 'Display density',
	choices: [
		{ label: 'Comfortable', value: 'comfortable' },
		{ label: 'Compact', value: 'compact' },
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

for (const form of document.querySelectorAll('form')) {
	form.addEventListener('submit', (event) => {
		event.preventDefault();
		form.querySelector('output').textContent = JSON.stringify(
			Object.fromEntries(new FormData(form)),
		);
	});
}

const entries = [];
for (const name of ['activate', 'change']) {
	document.addEventListener(`form-multi-switch-${name}`, (event) => {
		entries.unshift(
			`${event.target.id}: ${name} ${JSON.stringify(event.detail)}`,
		);
		entries.length = Math.min(entries.length, 6);
		document.querySelector('#event-log').textContent = entries.join('\n');
	});
}

document.addEventListener('form-multi-switch-ready', (event) => {
	const status = event.target
		.closest('section')
		.querySelector('[data-status]');
	if (status) status.textContent = 'The preview behavior is ready.';
});

document.addEventListener('form-multi-switch-error', (event) => {
	const section = event.target.closest('section');
	const status = section.querySelector('[data-status]');
	if (status) status.textContent = section.dataset.errorMessage;
});
