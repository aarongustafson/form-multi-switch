import { FormMultiSwitchElement } from './form-multi-switch.js';

export function defineFormMultiSwitch() {
	const tagName = 'form-multi-switch';
	const hasWindow = typeof window !== 'undefined';
	const registry = hasWindow ? window.customElements : undefined;

	if (!registry || typeof registry.define !== 'function') {
		return false;
	}

	const existing = registry.get(tagName);
	if (existing && existing !== FormMultiSwitchElement) {
		throw new Error(
			`${tagName} is already registered with a different class.`,
		);
	}
	if (!existing) {
		registry.define(tagName, FormMultiSwitchElement);
	}

	return true;
}

defineFormMultiSwitch();
