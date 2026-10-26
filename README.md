# `form-multi-switch` Web Component

[![npm version](https://img.shields.io/npm/v/@aarongustafson/form-multi-switch.svg)](https://www.npmjs.com/package/@aarongustafson/form-multi-switch) [![Build Status](https://img.shields.io/github/actions/workflow/status/aarongustafson/form-multi-switch/ci.yml?branch=main)](https://github.com/aarongustafson/form-multi-switch/actions)

Use `<form-multi-switch>` to give a group of radio buttons a segmented appearance.
Your `<fieldset>`, `<legend>`, `<label>` elements, and radio controls stay in light
DOM, so the browser still handles keyboard navigation, validation, form submission,
and reset.

You can wrap radios you’ve already written or let the component create them from
attributes or JavaScript. If you need the control to work without JavaScript,
start with the radio markup.

## Demos

- [All examples](./demo/index.html): shipping choices, clothing and shoe sizes, custom styles, icons, languages, and scripts.
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

If you’d rather have the component register itself, import `define.js` instead:

```js
import '@aarongustafson/form-multi-switch/define.js';
```

The package root and `form-multi-switch.js` leave registration to you.
`define.js` also exports a `defineFormMultiSwitch()` helper you can call yourself.
Calling it again is fine, as long as another `class` hasn’t claimed the element
name.

If you serve the installed files directly, load the registration module from
HTML instead:

```html
<script
  type="module"
  src="./node_modules/@aarongustafson/form-multi-switch/define.js"
></script>
```

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

Give your group a legend and each choice a text label. All the radios need to
sit inside the same fieldset, share a `name`, and belong to the same form (if
you’re using one). Give each choice its own value.

You can wrap each input in its label, as above, or connect them with `for` and
`id`. Keep links and other interactive controls out of the labels.

You don’t need to repeat the name or legend on the component. If you omit a
radio’s `value`, the browser uses `"on"`; because values must be unique, only one
choice can rely on that default.

To submit the selected value, put the fieldset inside a form or use the inputs’
`form` attributes to connect them to one. Use a different radio name for each
group in the same form.

### Generate controls from attributes

If your control only needs to work with JavaScript, you can describe it with
attributes instead:

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

Give `choices` a JSON array with a text `label` for each choice. You can leave out
`value` to use the label as its value, but each value needs to be unique.

Add `"disabled": true` to make a choice unavailable. Use JSON booleans (`true`
or `false`), not strings.

If you translate the labels, give each choice an explicit value so changing
the language doesn’t change what your form submits.

The component creates the fieldset, legend, radios, and labels for you. Labels
are plain text, not HTML. Use either `choices` or your own fieldset, not both.

### Generate controls with JavaScript

If your choices come from JavaScript, pass them to `configure()`:

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

`configure()` checks your configuration before making changes. You can call it
again to replace a group it created, including that group’s reset defaults. It
won’t replace a fieldset you wrote yourself.

Leave out `value`, or use `null`, to start without a selection. `disabled`,
`required`, and `iconOnly` default to `false`. If the control needs its own
script, set the `script` attribute or property separately.

## Attributes and properties

| Attribute   | Property   | What you control                                                                            |
| ----------- | ---------- | ------------------------------------------------------------------------------------------- |
| `name`      | `name`     | Generated radios’ submission name.                                                          |
| `label`     | `label`    | Generated legend text.                                                                      |
| `choices`   | —          | Choices as a JSON array. Use `configure()` to change the group’s configuration in one call. |
| `value`     | `value`    | Attribute: current selection and reset default. Property: current selection only.           |
| `disabled`  | `disabled` | Disable the whole group.                                                                    |
| `required`  | `required` | Whether the group requires a selection.                                                     |
| `icon-only` | `iconOnly` | Visually hide the choice text after enhancement.                                            |
| `script`    | `script`   | URL of a JavaScript module to load before showing the segmented control.                    |
| —           | `state`    | Read-only status: `pending`, `loading`, `ready`, or `error`.                                |
| —           | `ready`    | Promise that resolves when the current setup attempt finishes.                              |

Use `name` and `label` to configure a group the component creates. For radios
you’ve written yourself, change the input names and legend in your markup.
Reading these properties returns the attribute value if you’ve set one, or the
name and legend from the markup otherwise.

As with other HTML boolean attributes, presence is what counts:
`disabled="false"` still disables the group. Remove the attribute to turn it off.

### Update the current selection

```js
control.value = 'compact';
control.value = null; // Clear the selection.
```

Read `value` to get the selected value, or `null` if nothing’s selected. Set it
to change the selection without changing what a form reset will restore. This
doesn’t fire interaction events.

Use a string that matches one of your choices, or `null` to clear the selection.
An unknown value throws a `RangeError`; other types throw a `TypeError`.

Setting the `value` **attribute**, on the other hand, changes both the selection
and its reset default. The attribute doesn’t change as someone uses the control;
read the property when you need the current value.

### Update your markup

You can add, remove, or reorder choices and change their labels, values, names,
or form associations. The component watches your markup and checks the group
again when it changes. If you’ve supplied a script, it runs that script’s
initializer again, too.

Changes to `disabled`, `checked`, and `required` attributes update the styling
without rerunning your script. That includes disabling an ancestor fieldset.

Setting `input.checked` is different: it changes a property, not an attribute,
so a MutationObserver won’t see it. Use `control.value` to change the selection,
or dispatch an `input` event after changing the input property to update the
styling.

### Retry or refresh explicitly

```js
// Force revalidation and rerun the behavior initializer.
await control.refresh();
```

Call `refresh()` if you need to retry a script or rerun setup yourself. The
component needs to be in the document first.

Markup updates happen asynchronously. Listen for `form-multi-switch:ready` when
you need to do something after the updated group is ready.

## Events

Listen for selection changes when you want to update another part of your page:

```js
control.addEventListener('form-multi-switch:change', (event) => {
  const { value, previousValue, index } = event.detail;
  updateDensity(value);
});
```

| Event                        | When it fires                                                        | Detail                            |
| ---------------------------- | -------------------------------------------------------------------- | --------------------------------- |
| `form-multi-switch:activate` | Someone activates a choice, even if it’s already selected.           | `{ value, previousValue, index }` |
| `form-multi-switch:change`   | Someone changes the selection, including with the keyboard.          | `{ value, previousValue, index }` |
| `form-multi-switch:ready`    | The control finishes setting up.                                     | `{ value }`                       |
| `form-multi-switch:error`    | Something goes wrong with configuration, loading, setup, or cleanup. | `{ error, phase }`                |

These events bubble, cross shadow boundaries, and aren’t cancelable. The radios
still fire their native `input` and `change` events.

An `activate` event doesn’t promise that the selection changed: another listener
can cancel the native click. Calling a radio’s `.click()` can also fire
interaction events, but setting properties or resetting the form won’t.
The custom interaction events start firing once the component is ready.

## Behavior modules

If your switch needs a script to do its job, point `script` at that JavaScript
module. Your radios keep their usual appearance until the module has loaded
and finished setting up:

```html
<form-multi-switch script="./density-behavior.js">
  <!-- Your fieldset and radios -->
</form-multi-switch>
```

You can use `script` with your own radio markup, attribute configuration, or
`configure()`. You don’t need a separate `<script>` element to load the module.

Export an `initialize()` function to connect your switch to the rest of the
page. It receives the switch and an `AbortSignal` you can use with event listeners:

```js
export function initialize(control, { signal }) {
  control.addEventListener(
    'form-multi-switch:change',
    (event) => {
      document.documentElement.dataset.density = event.detail.value;
    },
    { signal },
  );

  document.documentElement.dataset.density = control.value;
}
```

If setup takes time, return a promise or make `initialize()` async. The component
will wait for it before changing the control’s appearance. Without an initializer,
it waits for the module itself to finish running.

Use the signal to cancel your work when the switch leaves the document or needs
to set up again. You can also return a cleanup function (directly or through the
promise) for anything the signal doesn’t handle. The cleanup function itself
must be synchronous. The browser caches the module, but each switch gets its
own call to `initialize()`.

Relative URLs resolve against your document’s base URL. Only load scripts you
trust, using HTTP or HTTPS and a URL your Content Security Policy permits.
Cross-origin modules need CORS permission, too. `data:`, `javascript:`, and `blob:`
URLs aren’t accepted.

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

Read `state` for the current status: `pending`, `loading`, `ready`, or `error`.
You’ll find the same value in the element’s `data-multi-switch-state` attribute.
`ready` is a promise for the current setup attempt, so read it again after
reconfiguring the group, changing `script`, refreshing, or reconnecting the
element. If a new attempt replaces one in progress, the old promise rejects
with an `AbortError`.

If something goes wrong, you’ll get an error event and a message in the console.
Radios you’ve written stay usable without the segmented styling. Fixing invalid
markup or configuration triggers another attempt. For a failed script, call
`refresh()` to retry, or remove `script` to use the control without it.
Refreshing doesn’t bypass the browser’s module cache.

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

The default colors come from the browser’s system colors.

### Layout and styling hooks

The choices sit in a row when the component has at least `20rem` of space.
Below that, they stack into a column. This follows the space available to the
component, not the width of your viewport. The component uses a size container
named `multi-switch` for this layout.

See [the restyling demos](./demo/index.html#restyling) for a branded pill and an
underline treatment, with CSS beside each live example. Put your own styles in
your page’s stylesheet. The defaults use a cascade layer named
`form-multi-switch`, so your unlayered rules take precedence without
`!important`, regardless of load order.

For a longer list, you might prefer a grid. The [shoe-size example](./demo/index.html#shoe-sizes)
shows how to lay one out and give each choice its own border.

If your Content Security Policy blocks inline styles, load the exported
`form-multi-switch.css` with a `<link id="form-multi-switch-styles">` before
registering the component. Or put the defaults in a `<style>` with that ID and
your approved nonce. The component will use that stylesheet instead of adding
its own; reserve that ID for the component’s styles.

For more control, use these attributes in your selectors once the component is
ready:

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

`data-first` and `data-last` identify the ends of the group even when you’ve
wrapped each choice in another element. The default styles handle labels on
their own or one wrapper per choice. If you put the whole list inside another
container, give that container your own flex or grid layout.

You can use these attributes to style the control, but leave setting them to
the component.

### Use icons without losing names

To show icons instead of text, keep your labels and add `icon-only`:

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

Use each choice’s `data-value` to give it an icon:

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

If you’re calling `configure()`, use `iconOnly: true` with the same CSS. Give
every choice an icon before turning on icon-only presentation. If the icons
aren’t likely to be familiar, keep the text visible.

When you’re writing the labels yourself, you can use inline SVG or other
decorative markup with `aria-hidden="true"` instead. Put the text in a
`data-multi-switch-label` span if you want to choose exactly what gets hidden:

```html
<label>
  <input type="radio" name="appearance" value="light" />
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="5"></circle>
  </svg>
  <span data-multi-switch-label>Light</span>
</label>
```

Leave the text label available to assistive technology: don’t use `display: none`,
`hidden`, or `aria-hidden` on it. The component’s styles hide it visually once
the switch is ready, while keeping it as the radio’s accessible name.

## Accessibility and progressive enhancement

- Keep a meaningful legend and a text label for every choice.
- Let the radios do their job. You don’t need `role="switch"` or replacement
  buttons.
- Keep a visible focus indicator when you customize the design.
- Check your colors, zoomed layout, right-to-left layout, forced colors, and
  whether people will understand your icons.
- Write your own radios when the control needs to work without JavaScript.
  Groups created from attributes or `configure()` need JavaScript to exist.

### Translation

Write the labels and legend in your page’s language, whether you’re using
markup, attributes, or `configure()`. Give each choice a value that won’t change
when you translate its label. You supply all the visible text, including any
messages or interface your script adds.

## Browser support

The component uses Custom Elements, ES modules, AbortController, MutationObserver,
and modern CSS, including cascade layers, size container queries, logical
properties, and `clip-path`. It doesn’t include polyfills for older browsers.

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
