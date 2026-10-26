# `form-multi-switch` Web Component

[![npm version](https://img.shields.io/npm/v/@aarongustafson/form-multi-switch.svg)](https://www.npmjs.com/package/@aarongustafson/form-multi-switch) [![Build Status](https://img.shields.io/github/actions/workflow/status/aarongustafson/form-multi-switch/ci.yml?branch=main)](https://github.com/aarongustafson/form-multi-switch/actions)

Turn a native radio group into a segmented control without replacing its `<input>` elements.
Your `<fieldset>`, `<legend>`, `<label>` elements, and radio controls stay in light DOM. The browser still
handles keyboard navigation, validation, form submission, and reset.

You can also generate the same controls from attributes or JavaScript
configuration for pure-JS interactions. If your experience needs to work without JS, upgrade an
authored `<fieldset>` instead.

## Demos

- [All examples](./demo/index.html): authored and generated controls, form behavior, restyling, icons, translation, and module loading.
- [Manual registration](./demo/esm.html): import the class and register it yourself, with an esm.sh import example.
- [Automatic registration](./demo/unpkg.html): use the definition helper, with an unpkg import example.

To run the demos locally, follow the [development instructions](#development).

## Installation

```sh
npm install @aarongustafson/form-multi-switch
```

Import the `class`, then register the element:

```js
import { FormMultiSwitchElement } from '@aarongustafson/form-multi-switch';

customElements.define('form-multi-switch', FormMultiSwitchElement);
```

Or import the definition module to register the element automatically:

```js
import '@aarongustafson/form-multi-switch/define.js';
```

The package root and `form-multi-switch.js` export the class without registering
it. The `define.js` module also exports `defineFormMultiSwitch()`. You can call
that helper again safely if the element is already registered with this `class`;
it throws if another `class` has claimed the name.

If you serve the installed files directly, load the registration module from
HTML instead:

```html
<script
  type="module"
  src="./node_modules/@aarongustafson/form-multi-switch/define.js"
></script>
```

The component installs its default styles once per document. You don’t need a
separate CSS import. It applies the segmented presentation only after
initialization succeeds. While a behavior module loads, or if initialization
fails, your authored radios keep their ordinary presentation.

## Usage

### Enhance your existing radios

Wrap your fieldset in `<form-multi-switch>`:

```html
<form-multi-switch>
  <fieldset>
    <legend>Display density</legend>
    <label>
      <input type="radio" name="density" value="comfortable" checked />
      Comfortable
    </label>
    <label>
      <input type="radio" name="density" value="compact" />
      Compact
    </label>
    <label>
      <input type="radio" name="density" value="condensed" />
      Condensed
    </label>
  </fieldset>
</form-multi-switch>
```

Use one fieldset with a nonempty legend. Give every radio the same nonempty
`name` and form owner, a unique value, and one text label inside that fieldset.
You can wrap the input in its label or associate them with `for` and `id`.
Keep links and other interactive controls out of the labels.

You don’t need to repeat the name or legend on the component. If you omit a
radio’s `value`, the browser uses `"on"`; because values must be unique, only one
choice can rely on that default.

Put the fieldset inside a form to submit its selected value. Explicit `form`
attributes on authored inputs also work. Use different radio names for separate
groups in the same form.

### Generate controls from attributes

For an interaction that depends on JavaScript, supply the group name, legend,
and choices as attributes:

```html
<form-multi-switch
  name="density"
  label="Display density"
  choices='[
    {"label":"Comfortable","value":"comfortable"},
    {"label":"Compact","value":"compact"},
    {"label":"Condensed","value":"condensed"}
  ]'
  value="comfortable"
></form-multi-switch>
```

Write `choices` as a JSON array. Each choice needs a nonempty text `label`.
Its optional `value` defaults to that label. Values must be unique strings;
`disabled` must be a JSON boolean.

Add `"disabled": true` to an individual choice to make it unavailable.
Supply explicit values when you translate labels so a language change doesn’t
change the values your form submits.

The component generates a fieldset, legend, and wrapping labels. It uses text
nodes for labels, not HTML strings. Don’t combine a `choices` attribute with an
authored fieldset.

### Generate controls with JavaScript

Call `configure()` when your application supplies the choices:

```html
<form-multi-switch id="density"></form-multi-switch>
```

```js
await customElements.whenDefined('form-multi-switch');

const control = document.querySelector('#density');

control.configure({
  name: 'density',
  label: 'Display density',
  choices: [
    { label: 'Comfortable', value: 'comfortable' },
    { label: 'Compact', value: 'compact' },
    { label: 'Condensed', value: 'condensed' },
  ],
  value: 'comfortable',
});

await control.ready;
```

`configure()` validates the whole configuration before changing its attributes.
It rejects an authored fieldset rather than replacing your markup. Call it again
to replace a configuration-generated group and establish new reset defaults.

Omit `value`, or use `null`, to start without a selection. Optional `disabled`,
`required`, and `iconOnly` flags default to `false`. Supply `script` separately
as an attribute or property if you need a behavior module.

## Attributes and properties

| Attribute   | Property   | What you control                                                                                          |
| ----------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| `name`      | `name`     | Generated radios’ submission name.                                                                        |
| `label`     | `label`    | Generated legend text.                                                                                    |
| `choices`   | —          | JSON configuration for generated choices. Use `configure()` to update the whole configuration atomically. |
| `value`     | `value`    | Attribute: current selection and reset default. Property: current selection only.                         |
| `disabled`  | `disabled` | Group-level disabled state.                                                                               |
| `required`  | `required` | Whether the group requires a selection.                                                                   |
| `icon-only` | `iconOnly` | Visually hide the choice text after enhancement.                                                          |
| `script`    | `script`   | Optional behavior-module URL.                                                                             |
| —           | `state`    | Read-only initialization state: `pending`, `loading`, `ready`, or `error`.                                |
| —           | `ready`    | Read-only promise for the current initialization attempt.                                                 |

The `name` and `label` getters fall back to authored markup. Set those attributes
or properties to configure generated controls. To change an authored group, edit
the native markup; the component observes those changes.

Boolean attributes follow HTML rules: their presence enables the option.
`disabled="false"` still disables the group.

### Update the current selection

```js
control.value = 'compact';
control.value = null; // Clear the selection.
```

The `value` property returns the selected string, or `null`. Setting it changes
the current selection and styling without changing reset defaults or emitting
interaction events. An unknown value throws a `RangeError`; a value other than
a string or `null` throws a `TypeError`.

The `value` **attribute** establishes both the current selection and its
form-reset default when you set it. User interaction doesn’t reflect the current
selection back to that attribute.

### Update your markup

The component observes added, removed, and reordered choices, label and legend
text, and attributes that affect values, names, label associations, or form
ownership. It batches structural changes into one initialization per animation
frame, revalidates the group, and reruns an optional behavior initializer.
Invalid markup restores the native presentation and emits an error. Correcting
the markup triggers another attempt automatically.

Changes to native `disabled`, `checked`, and `required` attributes update state
hooks without restarting the behavior initializer. The component also observes
disabled ancestor fieldsets and changes to explicitly referenced external forms.
It disconnects its observers when you remove it from the document.

A MutationObserver can’t see property-only assignments such as `input.checked`.
Use `control.value` to change the live selection, or dispatch a native `input`
event after changing an input property if you need to update the styling.

### Retry or refresh explicitly

```js
// Force revalidation and rerun the behavior initializer.
await control.refresh();
```

`refresh()` remains available when you want to retry a failed dependency or
explicitly rerun initialization. It requires a connected component; you don’t
need it after ordinary markup changes. Observer-driven updates happen
asynchronously. Listen for `form-multi-switch-ready` if you need to act after
the updated group finishes initialization.

## Events

Listen for selection changes when you want to update another part of your page:

```js
control.addEventListener('form-multi-switch-change', (event) => {
  const { value, previousValue, index } = event.detail;
  updateDensity(value);
});
```

| Event                        | When it fires                                                                              | Detail                            |
| ---------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------- |
| `form-multi-switch-activate` | A radio receives click activation, including a repeated activation of the selected choice. | `{ value, previousValue, index }` |
| `form-multi-switch-change`   | Native interaction changes the selection, including keyboard navigation.                   | `{ value, previousValue, index }` |
| `form-multi-switch-ready`    | An initialization attempt succeeds.                                                        | `{ value }`                       |
| `form-multi-switch-error`    | Configuration, loading, initialization, enhancement, or cleanup fails.                     | `{ error, phase }`                |

The events bubble, cross shadow boundaries, and aren’t cancelable. Native
`input` and `change` events still fire. The component listens to radio clicks,
not label clicks, so label forwarding doesn’t produce duplicate activations.
Calling a radio’s `.click()` can also produce interaction events.

Activation describes the click attempt, not a guarantee that selection changed:
another listener can cancel the native click. Native change notification follows
successful activation. Programmatic property assignments and form resets don’t
emit custom activation/change events. Changes to ordinary radios while a behavior
module is pending don’t emit the component’s custom interaction events.

## Behavior modules

Set `script` when the segmented presentation should wait for your application
behavior to load. You can use it with any authoring mode:

```html
<form-multi-switch script="./density-behavior.js">
  <!-- Your fieldset and radios -->
</form-multi-switch>
```

The URL resolves against the component’s document base URL. Use an HTTP or HTTPS
URL and a trusted module that your Content Security Policy permits. Cross-origin
modules also need the appropriate CORS headers. Inline `data:`, `javascript:`,
and `blob:` URLs aren’t accepted.

If the module exports `initialize`, the component calls it once per initialization
attempt and awaits its result before applying the segmented presentation:

```js
export function initialize(control, { signal }) {
  control.addEventListener(
    'form-multi-switch-change',
    (event) => {
      document.documentElement.dataset.density = event.detail.value;
    },
    { signal },
  );

  document.documentElement.dataset.density = control.value;
}
```

An initializer can return a synchronous cleanup function, directly or through a
promise. Use the supplied `AbortSignal` to release listeners and cancel your own
asynchronous work when the component disconnects, refreshes, or changes modules.
The browser can’t cancel an import already in progress, but the component ignores
stale results and runs a stale initializer’s returned cleanup.

Module evaluation runs once per resolved URL under the browser’s module cache;
initialization runs separately for each control. A module without an initializer
is ready when evaluation succeeds. A non-function `initialize` export, rejected
import, thrown initializer, or invalid cleanup result is an error.

### Readiness and failure

```js
try {
  await control.ready;
} catch (error) {
  console.error('The density control could not initialize.', error);
}
```

If your application needs to show a failure message, supply your own translated
text.

`state` reports `pending`, `loading`, `ready`, or `error`. The host exposes the
same state through `data-multi-switch-state`. `ready` is the promise for the
current initialization attempt. Read it again after changing configuration,
changing `script`, refreshing, or reconnecting. A superseded attempt rejects
with an `AbortError`.

Failures emit an error event and a console diagnostic. The component leaves
authored controls usable in their ordinary presentation; it doesn’t disable or
hide the group. Fix invalid markup/configuration to trigger an automatic retry.
Call `refresh()` to retry a failed behavior module without changing the markup.
Remove `script` to retry without the behavior dependency. Imports remain subject
to the browser’s module cache; `refresh()` doesn’t force a network refetch.

## Styling

Override the component’s custom properties in your own CSS:

```css
form-multi-switch {
  --multi-switch-radius: 999px;
  --multi-switch-padding: 0.6em 1em;
  --multi-switch-border: #173f63;
  --multi-switch-selected-background: #173f63;
  --multi-switch-selected-color: #fff;
}
```

### CSS custom properties

| Property                             | Default         | What you control                                         |
| ------------------------------------ | --------------- | -------------------------------------------------------- |
| `--multi-switch-radius`              | `0.5rem`        | Rounding at the group’s endpoints.                       |
| `--multi-switch-padding`             | `0.5em 0.85em`  | Padding inside each segment.                             |
| `--multi-switch-border`              | `ButtonBorder`  | Shared borders and the selected segment’s inset outline. |
| `--multi-switch-background`          | `Canvas`        | Unselected background.                                   |
| `--multi-switch-color`               | `CanvasText`    | Unselected text.                                         |
| `--multi-switch-selected-background` | `Highlight`     | Selected background.                                     |
| `--multi-switch-selected-color`      | `HighlightText` | Selected text.                                           |
| `--multi-switch-focus-color`         | `Highlight`     | Focus outline.                                           |

The color defaults use system colors. The border stays independent of the
selected text color, so all choices keep a connected outline. Adjacent segments
share one border rather than doubling it.

### Layout and styling hooks

The host establishes a named `multi-switch` inline-size container. At widths of
at least `20rem`, the default stylesheet keeps choices in one row. Below that
width, it stacks them into one connected column and rounds the top and bottom
endpoints. Choices don’t wrap into partial rows. This follows the component’s
available width, not the viewport width.

See [the restyling demos](./demo/index.html#restyling) for a branded pill and an
underline treatment, with CSS beside each live example. Load your overrides
in your page’s stylesheet. The defaults live in the `form-multi-switch` cascade
layer, so ordinary, unlayered author rules take precedence regardless of load
order. You don’t need `!important` or selectors that match the defaults’ specificity.

See [the size demos](./demo/index.html#shoe-sizes) for a longer list that wraps
into a grid. The native radios keep their keyboard and form behavior; your CSS
controls the grid and each option’s border.

If your Content Security Policy blocks inline styles, you can provide the
defaults yourself. Load the exported `form-multi-switch.css` with a `<link>`
whose `id` is `form-multi-switch-styles`; the component will skip style injection.
Alternatively, put the defaults in a `<style>` with that ID and your approved
nonce. Don’t give an empty or unrelated element that reserved ID.

The component marks these light-DOM elements after initialization:

| Hook                          | Element or state                           |
| ----------------------------- | ------------------------------------------ |
| `[data-multi-switch-state]`   | Host initialization state.                 |
| `[data-multi-switch-group]`   | Fieldset.                                  |
| `[data-multi-switch-input]`   | Retained native radio.                     |
| `[data-multi-switch-choice]`  | Associated visible label.                  |
| `[data-multi-switch-label]`   | Choice text container.                     |
| `[data-value="compact"]`      | A choice label with that radio value.      |
| `[data-first]`, `[data-last]` | First and last choices in radio DOM order. |
| `[data-selected]`             | Checked choice.                            |
| `[data-disabled]`             | Effectively disabled choice.               |
| `[data-focus]`                | Choice whose radio currently has focus.    |

First/last hooks work even when each choice has its own wrapper. The default
stylesheet lays out direct labels or one wrapper per choice. If you put all
choices inside another container, give that container your own flex/grid layout.
Reserve the component’s data attributes for its use.

### Use icons without losing names

With generated controls, keep meaningful labels and add `icon-only`:

```html
<form-multi-switch
  name="appearance"
  label="Appearance"
  choices='[
    {"label":"Light","value":"light"},
    {"label":"Dark","value":"dark"}
  ]'
  value="light"
  icon-only
></form-multi-switch>
```

Supply decorative CSS icons using the stable value hooks:

```css
form-multi-switch[icon-only] [data-multi-switch-choice]::before {
  content: '';
  inline-size: 1.25em;
  block-size: 1.25em;
  background-color: currentColor;
  mask: var(--choice-icon) center / contain no-repeat;
}

form-multi-switch [data-value='light'] {
  --choice-icon: url('/icons/sun.svg');
}

form-multi-switch [data-value='dark'] {
  --choice-icon: url('/icons/moon.svg');
}
```

JavaScript configuration uses `iconOnly: true` with the same CSS. You must supply
an icon for every choice before enabling icon-only presentation. If icons would
be unfamiliar, retain visible text.

In authored labels, you can instead supply inline SVG or other decorative markup
with `aria-hidden="true"`. The component keeps those decorative siblings outside
the text container. You can provide your own `data-multi-switch-label` span to
control exactly which text gets visually hidden:

```html
<label>
  <input type="radio" name="appearance" value="light" />
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="5"></circle>
  </svg>
  <span data-multi-switch-label>Light</span>
</label>
```

Don’t use `display: none`, `hidden`, or `aria-hidden` on the text label. The
stylesheet visually clips the text while preserving the radio’s accessible name.
It hides text only after enhancement succeeds.

## Accessibility and progressive enhancement

- Keep a meaningful legend and a text label for every choice.
- Let native radios provide the semantics. Don’t add `role="switch"` or replace
  them with generic clickable elements.
- Keep the stylesheet’s visible focus treatment when you customize the design.
  Programmatic focus and validation focus also highlight the visible segment.
- Check your colors, zoomed layout, right-to-left layout, forced colors, and icon
  meaning. The stylesheet uses logical corners and no animation.
- Use authored radios when the control must work before JavaScript loads or
  when it fails. Attribute- and JavaScript-configured groups need JavaScript to
  create their controls.

### Translation

Supply labels and legend text in your page’s language, whether you write the
markup, set `label` and `choices`, or call `configure()`. Keep explicit choice
values stable when you translate their labels. The component generates no
hardcoded user-facing messages; your application owns translated error messages
and behavior-module UI.

## Browser support

The component uses Custom Elements, ES modules, AbortController, MutationObserver,
and modern CSS, including cascade layers, size container queries, logical properties, and
`clip-path`. It doesn’t include polyfills or claim support for legacy browsers.

## Development

Clone the repository and run:

```sh
npm install
npm run test:run
npm run test:coverage
npm run test:types
npm run lint
npm run format
```

Serve the repository over HTTP to try the demos and browser tests:

```sh
python3 -m http.server 8765
```

Open [the demos](http://localhost:8765/demo/) or
[the browser tests](http://localhost:8765/test/browser.html). The browser tests
cover native validation, cancellation, focus, and submission.

The unit suite uses Happy DOM. The browser page covers native behavior that a DOM
emulator can’t reliably reproduce. Also test real keyboard navigation and
screen-reader interaction with your target browsers and assistive technologies.

See [Contributing](./CONTRIBUTING.md) for the test-first workflow and pull request
guidelines.

## License

[MIT](./LICENSE) © [Aaron Gustafson](https://www.aaron-gustafson.com/).
