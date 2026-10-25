# Work with the native radio group

Use the [README](README.md) for configuration, styling, and event examples.
These constraints explain what you should preserve when extending the component.

## Keep the native semantics

Keep the fieldset, legend, inputs, and associated labels in light DOM. They give
your group its name, keyboard behavior, constraint validation, submission value,
and reset defaults. Don’t replace them with buttons or add ARIA switch roles.

Use visually hidden inputs, not `display: none`, and keep a visible focus
indicator on each input’s associated segment. Retain a text name when you use
decorative icons.

## Enhance only when ready

Leave authored controls in their ordinary presentation until configuration and
optional module initialization succeed. Use the host’s readiness state to gate
styling. Configuration-generated controls can’t offer a no-JavaScript fallback;
choose authored markup when you need one.

Keep component-generated text translatable by taking labels from your markup
or configuration. Treat configured labels as text, never HTML.

## Keep current values separate from defaults

Use the component’s `value` property to change the current selection without
changing reset defaults or dispatching user-interaction events. Use the initial
`value` attribute or `configure()` when you intend to establish a reset default.

Let native input/change events propagate. Don’t synthesize keyboard behavior
that the radio inputs already supply.

## Release resources

Use the initializer’s AbortSignal for event listeners and cancelable work.
Return a synchronous cleanup function when you create resources that the signal
doesn’t release. Expect initialization to run again after refresh or reconnection.

Ignore obsolete asynchronous results. Don’t reveal enhanced UI after a failed,
aborted, or superseded attempt.

## Test in a browser

Write a failing regression test before changing behavior. Use the unit suite for
configuration, lifecycle, and event contracts, and [the browser tests](test/browser.html)
for native cancellation, validation, focus, and submission.

Check keyboard navigation, forced colors, zoom, right-to-left layout, and
assistive-technology behavior in the browsers your project supports. A passing
DOM-emulator test isn’t evidence for all of those behaviors.
