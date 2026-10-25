export async function initialize(control, { signal }) {
	await new Promise((resolve, reject) => {
		const abort = () => {
			clearTimeout(timer);
			reject(signal.reason);
		};
		const timer = setTimeout(() => {
			signal.removeEventListener('abort', abort);
			resolve();
		}, 800);
		signal.addEventListener('abort', abort, { once: true });
	});
	signal.throwIfAborted();
	const preview = control.closest('section').querySelector('[data-preview]');
	const original = preview.style.lineHeight;
	const update = () => {
		preview.style.lineHeight = control.value === 'compact' ? '1.2' : '2.4';
	};
	control.addEventListener('form-multi-switch-change', update, { signal });
	update();
	return () => {
		preview.style.lineHeight = original;
	};
}
