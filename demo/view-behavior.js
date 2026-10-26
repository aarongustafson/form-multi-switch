export function initialize(control, { signal }) {
	const preview = control.parentElement.querySelector('[data-view-preview]');
	const update = () => {
		preview.dataset.view = control.value;
	};
	control.addEventListener('form-multi-switch:change', update, { signal });
	update();
	return () => preview.removeAttribute('data-view');
}
