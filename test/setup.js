import { beforeAll } from 'vitest';
import { FormMultiSwitchElement } from '../form-multi-switch.js';

const elementName = 'form-multi-switch'.toLowerCase();

// Define the custom element before tests run
beforeAll(() => {
	if (!customElements.get(elementName)) {
		customElements.define(elementName, FormMultiSwitchElement);
	}

	// Make the class available globally for testing static methods
	globalThis.FormMultiSwitchElement = FormMultiSwitchElement;
});
