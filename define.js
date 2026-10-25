import { FormMultiSwitchElement } from './form-multi-switch.js';

export function defineComponentName(tagName = 'form-multi-switch') {
	const hasWindow = typeof window !== 'undefined';
	const registry = hasWindow ? window.customElements : undefined;

	if (!registry || typeof registry.define !== 'function') {
		return false;
	}

	if (!registry.get(tagName)) {
		registry.define(tagName, FormMultiSwitchElement);
	}

	return true;
}

defineComponentName();
