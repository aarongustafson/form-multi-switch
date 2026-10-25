import {
	FormMultiSwitchElement,
	type MultiSwitchBehaviorModule,
	type MultiSwitchConfiguration,
	type MultiSwitchState,
} from '../form-multi-switch.js';
import { defineFormMultiSwitch } from '../define.js';

const configuration: MultiSwitchConfiguration = {
	name: 'density',
	label: 'Display density',
	choices: [
		{ label: 'Comfortable', value: 'comfortable' },
		{ label: 'Compact' },
	],
	value: null,
	iconOnly: false,
};
const control = new FormMultiSwitchElement();
control.configure(configuration);
control.value = 'comfortable';
control.value = null;
control.disabled = true;
control.required = true;
control.script = './behavior.js';
control.name = undefined;
control.label = 'Density';
const state: MultiSwitchState = control.state;
const ready: Promise<void> = control.ready;
const refreshed: Promise<void> = control.refresh();
const defined: boolean = defineFormMultiSwitch();
document.querySelector('form-multi-switch')?.configure(configuration);
control.addEventListener('form-multi-switch-change', (event) => {
	const value: string | null = event.detail.value;
	const index: number = event.detail.index;
	console.log(value, index);
});
control.addEventListener('form-multi-switch-error', (event) => {
	const error: unknown = event.detail.error;
	console.error(event.detail.phase, error);
});
class SpecializedSwitch extends FormMultiSwitchElement {
	protected override async loadModule(
		_url: string,
	): Promise<MultiSwitchBehaviorModule> {
		return {
			initialize: (_element, { signal }) => {
				console.log(signal.aborted);
			},
		};
	}
}
console.log(state, ready, refreshed, defined, SpecializedSwitch);
