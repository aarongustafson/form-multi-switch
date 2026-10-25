# `<form-multi-switch>`

Turn a native radio group into a segmented control without replacing its inputs.
Your fieldset, legend, labels, and radios stay in light DOM. The browser still
handles keyboard navigation, validation, form submission, and reset.

You can also generate the same controls from attributes or JavaScript
configuration. Those two modes need JavaScript to create the controls; use an
authored fieldset when you need a working no-JavaScript fallback.

**Development status:** this package hasn’t been published. Run the local demos
from this repository; the package import paths below describe the prepared
package exports, not an available npm release.

## Load the component

Serve this directory over HTTP, then include its stylesheet and registration
module:

```html
<link rel="stylesheet" href="./form-multi-switch.css" />
<script type="module" src="./define.js"></script>
```

The stylesheet only applies the segmented presentation after initialization
succeeds. While a behavior module loads, or if initialization fails, your
authored radios keep their ordinary presentation.

With a package-aware bundler, import the registration module and stylesheet:

```js
import '@aarongustafson/form-multi-switch/define.js';
import '@aarongustafson/form-multi-switch/form-multi-switch.css';
```

To register the class yourself, import the package root or the class module:

```js
import { FormMultiSwitchElement } from './form-multi-switch.js';

customElements.define('form-multi-switch', FormMultiSwitchElement);
```

The root and class imports don’t register an element. Importing `define.js` does.
You can also call its exported `defineFormMultiSwitch()` helper again.

## Enhance your existing radios

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

## Generate controls from attributes

```html
<form-multi-switch
  name="density"
  label="Display density"
  choices='[
    {"label":"Comfortable","value":"comfortable"},
    {"label":"Compact","value":"compact"},
    {"label":"Condensed","value":"condensed","disabled":true}
  ]'
  value="comfortable"
></form-multi-switch>
```

Write `choices` as a JSON array. Each choice needs a nonempty text `label`.
Its optional `value` defaults to that label. Values must be unique strings;
`disabled` must be a JSON boolean.

Supply explicit values when you translate labels so a language change doesn’t
change the values your form submits.

The component generates a fieldset, legend, and wrapping labels. It uses text
nodes for labels, not HTML strings. Don’t combine a `choices` attribute with an
authored fieldset.

## Generate controls with JavaScript

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
| `value`     | See below  | Initial selection and reset default.                                                                      |
| `disabled`  | `disabled` | Group-level disabled state.                                                                               |
| `required`  | `required` | Whether the group requires a selection.                                                                   |
| `icon-only` | `iconOnly` | Visually hide the choice text after enhancement.                                                          |
| `script`    | `script`   | Optional behavior-module URL.                                                                             |

The `name` and `label` getters fall back to authored markup. Set those attributes
or properties to configure generated controls; edit the native markup and call
`refresh()` when you want to change an authored group.

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

### Refresh after direct markup changes

```js
// After you add/remove choices or change input properties directly:
await control.refresh();
```

`refresh()` validates the group again, updates hooks, and reruns an optional
behavior initializer. It requires a connected component. The component doesn’t
watch for arbitrary added choices or intercept assignments to `input.checked`.
Call `refresh()` after those changes, or use the component’s `value` property.

Native `disabled`, `checked`, and `required` attribute changes inside the
fieldset update state hooks automatically. Changes to an external form owner
or an ancestor fieldset require `refresh()` to resynchronize component hooks.

## Handle interaction

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

## Wait for application behavior

Use `script` with any authoring mode:

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
  // Show your own translated failure message if the application needs one.
}
```

`state` reports `pending`, `loading`, `ready`, or `error`. The host exposes the
same state through `data-multi-switch-state`. `ready` is the promise for the
current initialization attempt. Read it again after changing configuration,
changing `script`, refreshing, or reconnecting. A superseded attempt rejects
with an `AbortError`.

Failures emit an error event and a console diagnostic. The component leaves
authored controls usable in their ordinary presentation; it doesn’t disable or
hide the group. Fix invalid markup/configuration and call `refresh()` to retry.
Remove `script` to retry without the behavior dependency. Imports remain subject
to the browser’s module cache; `refresh()` doesn’t force a network refetch.

## Style the segments

Load the supplied stylesheet, then override its custom properties:

```css
form-multi-switch {
  --multi-switch-radius: 999px;
  --multi-switch-padding: 0.6em 1em;
  --multi-switch-border: currentColor;
  --multi-switch-selected-background: #173f63;
  --multi-switch-selected-color: #fff;
}
```

Other properties are `--multi-switch-background`, `--multi-switch-color`, and
`--multi-switch-focus-color`. Defaults use system colors.

The component marks these light-DOM elements after initialization:

| Hook                          | Element or state                           |
| ----------------------------- | ------------------------------------------ |
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

## Accessibility and translation

- Keep a meaningful legend and a text label for every choice.
- Let native radios provide the semantics. Don’t add `role="switch"` or replace
  them with generic clickable elements.
- Keep the stylesheet’s visible focus treatment when you customize the design.
  Programmatic focus and validation focus also highlight the visible segment.
- Check your colors, zoomed layout, right-to-left layout, forced colors, and icon
  meaning. The stylesheet uses logical corners and no animation.
- Supply labels and legend text in your page’s language. The component generates
  no hardcoded user-facing messages; your application owns translated error
  messages and behavior-module UI.

## Try the demos and tests

From this repository:

```sh
npm install
npm run test:run
npm run test:types
npm run lint
python3 -m http.server 8765
```

Open [the demos](demo/index.html) for authored/configured controls, submission,
reset, required/disabled choices, pill styling, icons, translated labels, and
module loading/failure. Open [the browser tests](test/browser.html) for native
validation, cancellation, focus, and submission checks.

The unit suite uses Happy DOM. The browser page covers native behavior that a DOM
emulator can’t reliably reproduce. Also test real keyboard navigation and
screen-reader interaction with your target browsers and assistive technologies.

The component uses Custom Elements, ES modules, AbortController, MutationObserver,
and modern CSS, including logical properties and `clip-path`. It doesn’t include
polyfills or claim support for legacy browsers.

## License

[MIT](LICENSE).
