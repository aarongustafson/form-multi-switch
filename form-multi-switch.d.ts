export interface MultiSwitchChoice {
	label: string;
	/** Defaults to label. Values must be unique within the group. */
	value?: string;
	disabled?: boolean;
}

export interface MultiSwitchConfiguration {
	name: string;
	label: string;
	choices: MultiSwitchChoice[];
	/** Establishes the initial selection and form-reset default. */
	value?: string | null;
	disabled?: boolean;
	required?: boolean;
	iconOnly?: boolean;
}

export type MultiSwitchState = 'pending' | 'loading' | 'ready' | 'error';
export type MultiSwitchCleanup = () => void;
export interface MultiSwitchBehaviorModule {
	initialize?: (
		element: FormMultiSwitchElement,
		context: { signal: AbortSignal },
	) => void | MultiSwitchCleanup | Promise<void | MultiSwitchCleanup>;
}

export interface MultiSwitchSelectionDetail {
	value: string | null;
	previousValue: string | null;
	index: number;
}

export interface MultiSwitchErrorDetail {
	error: unknown;
	phase:
		| 'configuration'
		| 'module'
		| 'initialization'
		| 'enhancement'
		| 'cleanup';
}

export class FormMultiSwitchElement extends HTMLElement {
	static readonly observedAttributes: string[];
	/** Authored radio name takes precedence; the setter configures generated controls only. */
	get name(): string | null;
	set name(value: string | null | undefined);
	/** Authored legend takes precedence; the setter configures generated controls only. */
	get label(): string | null;
	set label(value: string | null | undefined);
	get value(): string | null;
	set value(value: string | null);
	disabled: boolean;
	required: boolean;
	iconOnly: boolean;
	get script(): string | null;
	set script(value: string | null | undefined);
	readonly state: MultiSwitchState;
	readonly ready: Promise<void>;
	configure(configuration: MultiSwitchConfiguration): void;
	/** Force reinitialization; ordinary markup changes are observed automatically. */
	refresh(): Promise<void>;
	/** Override only to customize loading in a subclass. */
	protected loadModule(url: string): Promise<MultiSwitchBehaviorModule>;
	connectedCallback(): void;
	disconnectedCallback(): void;
	attributeChangedCallback(
		name: string,
		oldValue: string | null,
		newValue: string | null,
	): void;
}

declare global {
	interface HTMLElementTagNameMap {
		'form-multi-switch': FormMultiSwitchElement;
	}
	interface HTMLElementEventMap {
		'form-multi-switch:activate': CustomEvent<MultiSwitchSelectionDetail>;
		'form-multi-switch:change': CustomEvent<MultiSwitchSelectionDetail>;
		'form-multi-switch:ready': CustomEvent<{ value: string | null }>;
		'form-multi-switch:error': CustomEvent<MultiSwitchErrorDetail>;
	}
}
