# form-multi-switch Web Component

[![npm version](https://img.shields.io/npm/v/@aarongustafson/form-multi-switch.svg)](https://www.npmjs.com/package/@aarongustafson/form-multi-switch) [![Build Status](https://img.shields.io/github/actions/workflow/status/aarongustafson/form-multi-switch/ci.yml?branch=main)](https://github.com/aarongustafson/form-multi-switch/actions)

Progressively enhance native radio groups into accessible light-DOM segmented controls.

## Demo

[Live Demo](https://aarongustafson.github.io/form-multi-switch/demo/) ([Source](./demo/index.html))

Additional demos:
- [ESM CDN Demo](https://aarongustafson.github.io/form-multi-switch/demo/esm.html) ([Source](./demo/esm.html))
- [Unpkg CDN Demo](https://aarongustafson.github.io/form-multi-switch/demo/unpkg.html) ([Source](./demo/unpkg.html))

## Installation

```bash
npm install @aarongustafson/form-multi-switch
```

## Usage

### Option 1: Auto-define the custom element (easiest)

Import the package to automatically define the `<form-multi-switch>` custom element:

```javascript
import '@aarongustafson/form-multi-switch';
```

Or use the define-only script in HTML:

```html
<script src="./node_modules/@aarongustafson/form-multi-switch/define.js" type="module"></script>
```

### Option 2: Import the class and define manually

Import the class and define the custom element with your preferred tag name:

```javascript
import { FormMultiSwitchElement } from '@aarongustafson/form-multi-switch/form-multi-switch.js';

customElements.define('my-custom-name', FormMultiSwitchElement);
```

### Basic Example

```html
<form-multi-switch>
  <!-- Your content here -->
</form-multi-switch>
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `example-attribute` | `string` | `""` | Description of the attribute |

## Events

The component fires custom events that you can listen to:

| Event | Description | Detail |
|-------|-------------|--------|
| `form-multi-switch:event` | Fired when something happens | `{ data }` |

### Example Event Handling

```javascript
const element = document.querySelector('form-multi-switch');

element.addEventListener('form-multi-switch:event', (event) => {
  console.log('Event fired:', event.detail);
});
```

## CSS Custom Properties

| Property | Default | Description |
|----------|---------|-------------|
| `--example-color` | `#000` | Example color property |

### Example Styling

```css
form-multi-switch {
  --example-color: #ff0000;
}
```

## Browser Support

This component uses modern web standards:
- Custom Elements v1
- Shadow DOM v1
- ES Modules

For older browsers, you may need polyfills.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# View demo
open demo/index.html
```

## License

MIT © [Aaron Gustafson](https://www.aaron-gustafson.com/)
