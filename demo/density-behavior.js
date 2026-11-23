export function initialize(control, { signal }) {
	const preview = control.parentElement.querySelector('[data-preview]');
	const original = preview.style.lineHeight;
	const update = () => {
		preview.style.lineHeight = control.value === 'compact' ? '1.2' : '2.4';
	};
	control.addEventListener('form-multi-switch:change', update, { signal });
	update();
	return () => {
		preview.style.lineHeight = original;
	};
}
