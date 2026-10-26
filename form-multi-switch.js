const DEFAULT_STYLES = `@layer form-multi-switch {
	[data-multi-switch-state] {
		display: block;
		container-name: multi-switch;
		container-type: inline-size;
	}
	[data-multi-switch-state][hidden] { display: none; }
	[data-multi-switch-state='ready'] [data-multi-switch-group] {
		display: flex;
		flex-wrap: nowrap;
		gap: 0;
		min-inline-size: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}
	[data-multi-switch-state='ready'] [data-multi-switch-group] > :not(legend, [data-multi-switch-input], [data-multi-switch-choice]) {
		display: flex;
		flex: 1 1 0;
		min-inline-size: 0;
	}
	[data-multi-switch-state='ready'] [data-multi-switch-group] > legend {
		margin-block-end: 0.5em;
		padding: 0;
		font-weight: 600;
	}
	[data-multi-switch-state='ready'] [data-multi-switch-input],
	[data-multi-switch-state='ready'][icon-only] [data-multi-switch-label] {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}
	[data-multi-switch-state='ready'] [data-multi-switch-choice] {
		position: relative;
		display: inline-flex;
		flex: 1 1 0;
		align-items: center;
		justify-content: center;
		gap: 0.5em;
		min-inline-size: 2.75rem;
		min-block-size: 2.75rem;
		box-sizing: border-box;
		padding: var(--multi-switch-padding, 0.5em 0.85em);
		border: 1px solid var(--multi-switch-border, ButtonBorder);
		background: var(--multi-switch-background, Canvas);
		color: var(--multi-switch-color, CanvasText);
		cursor: pointer;
	}
	[data-multi-switch-state='ready'] [data-multi-switch-choice]:not([data-first]) { margin-inline-start: -1px; }
	[data-multi-switch-state='ready'] [data-multi-switch-choice][data-first] {
		border-start-start-radius: var(--multi-switch-radius, 0.5rem);
		border-end-start-radius: var(--multi-switch-radius, 0.5rem);
	}
	[data-multi-switch-state='ready'] [data-multi-switch-choice][data-last] {
		border-start-end-radius: var(--multi-switch-radius, 0.5rem);
		border-end-end-radius: var(--multi-switch-radius, 0.5rem);
	}
	[data-multi-switch-state='ready'] [data-selected] {
		background: var(--multi-switch-selected-background, Highlight);
		color: var(--multi-switch-selected-color, HighlightText);
		box-shadow: inset 0 0 0 1px var(--multi-switch-border, ButtonBorder);
	}
	[data-multi-switch-state='ready']:has([data-multi-switch-input]:focus-visible) [data-focus] {
		z-index: 1;
		outline: 3px solid var(--multi-switch-focus-color, Highlight);
		outline-offset: 3px;
	}
	[data-multi-switch-state='ready'] [data-disabled] {
		color: GrayText;
		cursor: not-allowed;
	}
	@container multi-switch (inline-size < 20rem) {
		[data-multi-switch-state='ready'] [data-multi-switch-group] { flex-direction: column; }
		[data-multi-switch-state='ready'] [data-multi-switch-choice]:not([data-first]) {
			margin-inline-start: 0;
			margin-block-start: -1px;
		}
		[data-multi-switch-state='ready'] [data-multi-switch-choice]:is([data-first], [data-last]) { border-radius: 0; }
		[data-multi-switch-state='ready'] [data-multi-switch-choice][data-first] {
			border-start-start-radius: var(--multi-switch-radius, 0.5rem);
			border-start-end-radius: var(--multi-switch-radius, 0.5rem);
		}
		[data-multi-switch-state='ready'] [data-multi-switch-choice][data-last] {
			border-end-start-radius: var(--multi-switch-radius, 0.5rem);
			border-end-end-radius: var(--multi-switch-radius, 0.5rem);
		}
	}
	@media (forced-colors: active) {
		[data-multi-switch-state='ready'] [data-selected] {
			outline: 2px solid Highlight;
			outline-offset: -4px;
		}
		[data-multi-switch-state='ready']:has([data-multi-switch-input]:focus-visible) [data-focus] {
			outline: 3px solid CanvasText;
			outline-offset: 3px;
		}
	}
}`;

function labelText(label) {
	const copy = label.cloneNode(true);
	for (const decoration of copy.querySelectorAll(
		'input, [aria-hidden="true"], [hidden], script, style',
	)) {
		decoration.remove();
	}
	return copy.textContent.trim();
}

function normalizeConfiguration(config) {
	if (!config || typeof config !== 'object') {
		throw new TypeError('Provide a switch configuration object.');
	}
	for (const key of ['name', 'label']) {
		if (typeof config[key] !== 'string' || !config[key].trim()) {
			throw new TypeError(`Provide a nonempty ${key}.`);
		}
	}
	if (!Array.isArray(config.choices) || config.choices.length === 0) {
		throw new TypeError('Provide at least one choice.');
	}
	const values = new Set();
	const choices = config.choices.map((choice) => {
		if (
			!choice ||
			typeof choice.label !== 'string' ||
			!choice.label.trim()
		) {
			throw new TypeError('Each choice needs a nonempty text label.');
		}
		const value = choice.value === undefined ? choice.label : choice.value;
		if (typeof value !== 'string' || values.has(value)) {
			throw new TypeError('Choice values must be unique strings.');
		}
		if (
			choice.disabled !== undefined &&
			typeof choice.disabled !== 'boolean'
		) {
			throw new TypeError('Choice disabled states must be booleans.');
		}
		values.add(value);
		return {
			label: choice.label,
			value,
			disabled: choice.disabled ?? false,
		};
	});
	if (
		config.value !== undefined &&
		config.value !== null &&
		!values.has(config.value)
	) {
		throw new RangeError('The initial value must match a choice.');
	}
	for (const key of ['disabled', 'required', 'iconOnly']) {
		if (config[key] !== undefined && typeof config[key] !== 'boolean') {
			throw new TypeError(`${key} must be a boolean.`);
		}
	}
	return { ...config, choices };
}

/**
 * Enhance one native radio group without replacing its form controls.
 * Default styles are installed once per document in a named cascade layer.
 * The outer focus ring follows the native radio's :focus-visible state.
 *
 * @element form-multi-switch
 */
export class FormMultiSwitchElement extends HTMLElement {
	static get observedAttributes() {
		return [
			'name',
			'label',
			'choices',
			'value',
			'disabled',
			'required',
			'icon-only',
			'script',
		];
	}

	constructor() {
		super();
		this._fieldset = null;
		this._inputs = [];
		this._labels = [];
		this._generatedFieldset = null;
		this._signature = null;
		this._version = 0;
		this._scheduled = null;
		this._controller = null;
		this._listeners = null;
		this._observer = null;
		this._contextObserver = null;
		this._formObserver = null;
		this._cleanup = null;
		this._batch = false;
		this._state = 'pending';
		this._disabledControlled = false;
		this._requiredControlled = false;
		this._defaultApplied = false;
		this._pendingValue = undefined;
		this._previousValue = null;
		this._createReady();
	}

	connectedCallback() {
		if (!this.ownerDocument.getElementById('form-multi-switch-styles')) {
			const style = this.ownerDocument.createElement('style');
			style.id = 'form-multi-switch-styles';
			style.textContent = DEFAULT_STYLES;
			this.ownerDocument.head.append(style);
		}
		for (const property of [
			'name',
			'label',
			'value',
			'disabled',
			'required',
			'iconOnly',
			'script',
		]) {
			if (Object.prototype.hasOwnProperty.call(this, property)) {
				const value = this[property];
				delete this[property];
				this[property] = value;
			}
		}
		this._schedule();
	}

	disconnectedCallback() {
		this._cancel();
		this._version += 1;
		this._setState('pending');
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue || this._batch) {
			return;
		}
		if (name === 'disabled') this._disabledControlled = true;
		if (name === 'required') this._requiredControlled = true;
		if (name === 'value') this._defaultApplied = false;
		if (this.isConnected && this.state === 'error') {
			this._schedule();
			return;
		}
		if (
			this._fieldset &&
			['disabled', 'required', 'icon-only', 'value'].includes(name)
		) {
			try {
				this._applyOptions();
				if (name === 'value') this._previousValue = this.value;
				this._sync();
			} catch (error) {
				this._fail(error, 'configuration');
			}
		} else if (this.isConnected) {
			this._schedule();
		}
	}

	get name() {
		return this.getAttribute('name') ?? this._inputs[0]?.name ?? null;
	}
	set name(value) {
		this._stringAttribute('name', value);
	}
	get label() {
		return (
			this.getAttribute('label') ??
			this._fieldset?.querySelector('legend')?.textContent ??
			null
		);
	}
	set label(value) {
		this._stringAttribute('label', value);
	}
	get value() {
		const inputs = this._fieldset
			? this._inputs
			: [...this.querySelectorAll('input[type="radio"]')];
		return inputs.find((input) => input.checked)?.value ?? null;
	}
	set value(value) {
		if (value !== null && typeof value !== 'string') {
			throw new TypeError('The value must be a string or null.');
		}
		if (!this._fieldset) {
			this._pendingValue = value;
			return;
		}
		this._select(value);
		this._previousValue = this.value;
		this._sync();
	}
	get disabled() {
		return (
			this.hasAttribute('disabled') || Boolean(this._fieldset?.disabled)
		);
	}
	set disabled(value) {
		this._disabledControlled = true;
		this.toggleAttribute('disabled', Boolean(value));
		if (this._fieldset) {
			this._applyOptions();
			this._sync();
		}
	}
	get required() {
		return (
			this.hasAttribute('required') ||
			this._inputs.some((input) => input.required)
		);
	}
	set required(value) {
		this._requiredControlled = true;
		this.toggleAttribute('required', Boolean(value));
		if (this._fieldset) {
			this._applyOptions();
			this._sync();
		}
	}
	get iconOnly() {
		return this.hasAttribute('icon-only');
	}
	set iconOnly(value) {
		this.toggleAttribute('icon-only', Boolean(value));
	}
	get script() {
		return this.getAttribute('script');
	}
	set script(value) {
		this._stringAttribute('script', value);
	}
	get state() {
		return this._state;
	}
	get ready() {
		return this._ready;
	}

	configure(config) {
		const normalized = normalizeConfiguration(config);
		if (
			[...this.querySelectorAll('fieldset')].some(
				(fieldset) => fieldset !== this._generatedFieldset,
			)
		) {
			throw new TypeError(
				'configure() cannot replace an authored fieldset.',
			);
		}
		this._batch = true;
		this.name = normalized.name;
		this.label = normalized.label;
		this.setAttribute('choices', JSON.stringify(normalized.choices));
		this._stringAttribute('value', normalized.value);
		this.toggleAttribute('disabled', normalized.disabled ?? false);
		this.toggleAttribute('required', normalized.required ?? false);
		this.toggleAttribute('icon-only', normalized.iconOnly ?? false);
		this._batch = false;
		this._disabledControlled = true;
		this._requiredControlled = true;
		this._defaultApplied = false;
		this._signature = null;
		if (this.isConnected) this._schedule();
	}

	refresh() {
		if (!this.isConnected) {
			throw new DOMException(
				'Connect the switch before refreshing it.',
				'InvalidStateError',
			);
		}
		this._schedule();
		return this.ready;
	}

	/** Override in a subclass only when supplying a different module loader. */
	loadModule(url) {
		return import(new URL(url, this.baseURI).href);
	}

	_stringAttribute(name, value) {
		if (value === null || value === undefined) this.removeAttribute(name);
		else this.setAttribute(name, value);
	}

	_createReady() {
		this._settled = false;
		this._ready = new Promise((resolve, reject) => {
			this._resolveReady = resolve;
			this._rejectReady = reject;
		});
		// Errors also surface through an event and console; prevent an unobserved
		// readiness promise from becoming a second, global unhandled rejection.
		this._ready.catch(() => {});
	}

	_setState(state) {
		this._state = state;
		this.setAttribute('data-multi-switch-state', state);
	}

	_schedule() {
		if (this._scheduled !== null) return;
		this._cancel();
		if (this._version > 0) this._createReady();
		const version = ++this._version;
		this._setState('pending');
		this._scheduled = requestAnimationFrame(() => {
			this._scheduled = null;
			this._initialize(version);
		});
		this._observe();
	}

	_cancel() {
		const wasPending =
			this._scheduled !== null || this._controller !== null;
		if (this._scheduled !== null) cancelAnimationFrame(this._scheduled);
		this._scheduled = null;
		if (this._controller) {
			this._controller.abort();
			this._controller = null;
		}
		if (wasPending && !this._settled) {
			this._settled = true;
			this._rejectReady(
				new DOMException(
					'Switch initialization was superseded.',
					'AbortError',
				),
			);
		}
		this._listeners?.abort();
		this._listeners = null;
		this._observer?.disconnect();
		this._contextObserver?.disconnect();
		this._formObserver?.disconnect();
		if (this._cleanup) {
			const cleanup = this._cleanup;
			this._cleanup = null;
			this._dispose(cleanup);
		}
		this._clearHooks();
	}

	_clearHooks() {
		this._fieldset?.removeAttribute('data-multi-switch-group');
		for (const input of this._inputs)
			input.removeAttribute('data-multi-switch-input');
		for (const label of this._labels) {
			for (const name of [
				'data-multi-switch-choice',
				'data-value',
				'data-first',
				'data-last',
				'data-selected',
				'data-disabled',
				'data-focus',
			]) {
				label.removeAttribute(name);
			}
		}
	}

	async _initialize(version) {
		const controller = new AbortController();
		this._controller = controller;
		let phase = 'configuration';
		try {
			if (this.ownerDocument.readyState === 'loading') {
				await new Promise((resolve, reject) => {
					const abort = () => reject(controller.signal.reason);
					this.ownerDocument.addEventListener(
						'DOMContentLoaded',
						() => {
							controller.signal.removeEventListener(
								'abort',
								abort,
							);
							resolve();
						},
						{ once: true, signal: controller.signal },
					);
					controller.signal.addEventListener('abort', abort, {
						once: true,
					});
				});
				if (version !== this._version || controller.signal.aborted)
					return;
			}
			this._observer?.disconnect();
			this._prepare();
			this._applyOptions();
			this._observe();
			if (this._pendingValue !== undefined) {
				this._select(this._pendingValue);
				this._pendingValue = undefined;
			}
			if (this.script !== null) {
				phase = 'module';
				const url = new URL(this.script, this.baseURI);
				if (
					!['http:', 'https:'].includes(url.protocol) ||
					!this.script.trim()
				) {
					throw new TypeError('Use an http or https module URL.');
				}
				this._setState('loading');
				const module = await this.loadModule(url.href);
				if (version !== this._version || controller.signal.aborted)
					return;
				if ('initialize' in module) {
					if (typeof module.initialize !== 'function') {
						throw new TypeError(
							'The module initialize export must be a function.',
						);
					}
					phase = 'initialization';
					const cleanup = await module.initialize(this, {
						signal: controller.signal,
					});
					if (
						cleanup !== undefined &&
						typeof cleanup !== 'function'
					) {
						throw new TypeError(
							'An initializer may return a cleanup function or undefined.',
						);
					}
					if (
						version !== this._version ||
						controller.signal.aborted
					) {
						if (cleanup) this._dispose(cleanup);
						return;
					}
					this._cleanup = cleanup ?? null;
				}
			}
			if (version !== this._version || controller.signal.aborted) return;
			phase = 'enhancement';
			this._observer?.disconnect();
			this._decorate();
			this._listen();
			this._observe();
			this._previousValue = this.value;
			this._sync();
			this._setState('ready');
			this._settled = true;
			this._resolveReady();
			this._emit('ready', { value: this.value });
		} catch (error) {
			if (version === this._version && !controller.signal.aborted)
				this._fail(error, phase);
		}
	}

	_prepare() {
		if (this.hasAttribute('choices')) {
			const config = normalizeConfiguration({
				name: this.getAttribute('name'),
				label: this.getAttribute('label'),
				choices: JSON.parse(this.getAttribute('choices')),
				value: this.getAttribute('value'),
			});
			if (
				[...this.querySelectorAll('fieldset')].some(
					(fieldset) => fieldset !== this._generatedFieldset,
				)
			) {
				throw new TypeError(
					'Do not combine authored fieldsets with configured choices.',
				);
			}
			const signature = JSON.stringify([
				config.name,
				config.label,
				config.choices,
			]);
			if (
				signature !== this._signature ||
				!this._generatedFieldset?.isConnected
			) {
				const fieldset = this.ownerDocument.createElement('fieldset');
				const legend = this.ownerDocument.createElement('legend');
				legend.textContent = config.label;
				fieldset.append(legend);
				for (const choice of config.choices) {
					const label = this.ownerDocument.createElement('label');
					const input = this.ownerDocument.createElement('input');
					const text = this.ownerDocument.createElement('span');
					input.type = 'radio';
					input.name = config.name;
					input.value = choice.value;
					input.disabled = choice.disabled;
					text.setAttribute('data-multi-switch-label', '');
					text.textContent = choice.label;
					label.append(input, text);
					fieldset.append(label);
				}
				if (this._generatedFieldset?.parentElement === this)
					this._generatedFieldset.replaceWith(fieldset);
				else this.append(fieldset);
				this._generatedFieldset = fieldset;
				this._signature = signature;
				this._defaultApplied = false;
			}
		} else if (this._generatedFieldset) {
			throw new TypeError(
				'Keep choices configured while using generated controls.',
			);
		}
		const fieldsets = [...this.querySelectorAll('fieldset')];
		if (fieldsets.length !== 1)
			throw new TypeError('Provide exactly one fieldset.');
		const fieldset = fieldsets[0];
		const legend = [...fieldset.children].find(
			(child) => child.tagName === 'LEGEND',
		);
		if (!legend?.textContent.trim())
			throw new TypeError('Provide a legend naming the radio group.');
		const inputs = [...fieldset.querySelectorAll('input[type="radio"]')];
		if (
			!inputs.length ||
			inputs.length !==
				this.querySelectorAll('input[type="radio"]').length
		) {
			throw new TypeError('Place all choices in one fieldset.');
		}
		const values = new Set();
		const labels = inputs.map((input) => {
			if (
				!input.name ||
				input.name !== inputs[0].name ||
				input.form !== inputs[0].form
			) {
				throw new TypeError(
					'All radios need the same nonempty name and form owner.',
				);
			}
			if (values.has(input.value))
				throw new TypeError('Choice values must be unique.');
			values.add(input.value);
			const associated = [...input.labels];
			if (
				associated.length !== 1 ||
				!fieldset.contains(associated[0]) ||
				!labelText(associated[0])
			) {
				throw new TypeError(
					'Give each radio one text label inside its fieldset.',
				);
			}
			if (
				associated[0].querySelector(
					'a,button,select,textarea,input:not([type="radio"])',
				)
			) {
				throw new TypeError(
					'Do not put other interactive controls in a choice label.',
				);
			}
			return associated[0];
		});
		this._fieldset = fieldset;
		this._inputs = inputs;
		this._labels = labels;
	}

	_applyOptions() {
		if (!this._fieldset) return;
		// Discard only our own reflected option writes, not queued author edits.
		const records = this._observer?.takeRecords() ?? [];
		if (this._disabledControlled || this.hasAttribute('disabled'))
			this._fieldset.disabled = this.hasAttribute('disabled');
		if (this._requiredControlled || this.hasAttribute('required')) {
			for (const input of this._inputs)
				input.required = this.hasAttribute('required');
		}
		if (!this._defaultApplied && this.hasAttribute('value')) {
			const value = this.getAttribute('value');
			this._select(value);
			for (const input of this._inputs)
				input.defaultChecked = input.value === value;
		}
		this._defaultApplied = true;
		this._observer?.takeRecords();
		if (records.length) this._handleMutations(records);
	}

	_select(value) {
		if (
			value !== null &&
			!this._inputs.some((input) => input.value === value)
		) {
			throw new RangeError('The value must match a choice.');
		}
		for (const input of this._inputs) input.checked = input.value === value;
	}

	_decorate() {
		this._fieldset.setAttribute('data-multi-switch-group', '');
		this._labels.forEach((label, index) => {
			label.setAttribute('data-multi-switch-choice', '');
			label.setAttribute('data-value', this._inputs[index].value);
			label.toggleAttribute('data-first', index === 0);
			label.toggleAttribute(
				'data-last',
				index === this._labels.length - 1,
			);
			this._inputs[index].setAttribute('data-multi-switch-input', '');
			if (!label.querySelector('[data-multi-switch-label]')) {
				const text = this.ownerDocument.createElement('span');
				text.setAttribute('data-multi-switch-label', '');
				for (const node of [...label.childNodes]) {
					if (
						node === this._inputs[index] ||
						(node.nodeType === 1 &&
							node.getAttribute('aria-hidden') === 'true')
					)
						continue;
					text.append(node);
				}
				label.append(text);
			}
		});
	}

	_sync() {
		this._inputs.forEach((input, index) => {
			const label = this._labels[index];
			label.toggleAttribute('data-selected', input.checked);
			label.toggleAttribute('data-disabled', input.matches(':disabled'));
			label.toggleAttribute(
				'data-focus',
				input === this.ownerDocument.activeElement,
			);
		});
	}

	_listen() {
		this._listeners = new AbortController();
		const { signal } = this._listeners;
		this.addEventListener(
			'click',
			(event) => {
				const index = this._inputs.indexOf(event.target);
				if (index < 0 || event.target.matches(':disabled')) return;
				this._sync();
				queueMicrotask(() => {
					if (!signal.aborted) this._sync();
				});
				this._emit('activate', {
					value: this.value,
					previousValue: this._previousValue,
					index,
				});
			},
			{ signal },
		);
		this.addEventListener(
			'input',
			(event) => {
				if (this._inputs.includes(event.target)) this._sync();
			},
			{ signal },
		);
		this.addEventListener(
			'change',
			(event) => {
				const index = this._inputs.indexOf(event.target);
				if (index < 0) return;
				const value = this.value;
				const previousValue = this._previousValue;
				this._previousValue = value;
				this._sync();
				if (value !== previousValue)
					this._emit('change', { value, previousValue, index });
			},
			{ signal },
		);
		for (const name of ['focusin', 'focusout']) {
			this.addEventListener(name, () => this._sync(), { signal });
		}
		this._inputs[0].form?.addEventListener(
			'reset',
			(event) => {
				queueMicrotask(() => {
					if (!event.defaultPrevented && !signal.aborted) {
						this._previousValue = this.value;
						this._sync();
					}
				});
			},
			{ signal },
		);
	}

	_handleMutations(records) {
		if (this.state === 'pending' && this._controller) return;
		records = records.filter(
			(record) => record.type !== 'attributes' || record.target !== this,
		);
		if (!records.length) return;
		if (
			records.some(
				(record) =>
					record.type !== 'attributes' ||
					!['disabled', 'checked', 'required'].includes(
						record.attributeName,
					),
			)
		) {
			this._schedule();
		} else {
			this._previousValue = this.value;
			this._sync();
		}
	}

	_observe() {
		if (!this.isConnected) return;
		this._observer ??= new MutationObserver((records) =>
			this._handleMutations(records),
		);
		this._observer.disconnect();
		this._observer.observe(this, {
			subtree: true,
			childList: true,
			characterData: true,
			attributes: true,
			attributeFilter: [
				'disabled',
				'checked',
				'required',
				'name',
				'type',
				'value',
				'id',
				'for',
				'form',
				'aria-hidden',
				'hidden',
			],
		});
		this._contextObserver ??= new MutationObserver(() => this._sync());
		this._contextObserver.disconnect();
		for (
			let ancestor = this.parentElement;
			ancestor;
			ancestor = ancestor.parentElement
		) {
			if (ancestor.tagName === 'FIELDSET') {
				this._contextObserver.observe(ancestor, {
					attributes: true,
					attributeFilter: ['disabled'],
					childList: true,
				});
			}
		}
		// Form association can change outside the component's own subtree.
		this._formObserver ??= new MutationObserver((records) => {
			if (
				records.some((record) =>
					this._inputs.some((input) => {
						const id = input.getAttribute('form');
						if (id === null) return false;
						if (record.type === 'attributes')
							return (
								record.target.id === id ||
								record.oldValue === id
							);
						return [
							...record.addedNodes,
							...record.removedNodes,
						].some(
							(node) =>
								node.nodeType === 1 &&
								(node.id === id ||
									[...node.querySelectorAll('[id]')].some(
										(child) => child.id === id,
									)),
						);
					}),
				)
			)
				this._schedule();
		});
		this._formObserver.disconnect();
		if (!this._inputs.some((input) => input.hasAttribute('form'))) return;
		this._formObserver.observe(this.ownerDocument, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeOldValue: true,
			attributeFilter: ['id'],
		});
	}

	_emit(name, detail) {
		this.dispatchEvent(
			new CustomEvent(`form-multi-switch:${name}`, {
				detail,
				bubbles: true,
				composed: true,
			}),
		);
	}

	_dispose(cleanup) {
		try {
			cleanup();
		} catch (error) {
			this._emit('error', { error, phase: 'cleanup' });
			console.error('form-multi-switch: cleanup failed.', error);
		}
	}

	_fail(error, phase) {
		if (!this._settled) {
			this._settled = true;
			this._rejectReady(error);
		}
		this._cancel();
		this._setState('error');
		this._observe();
		this._emit('error', { error, phase });
		console.error(`form-multi-switch: ${phase} failed.`, error);
	}
}
