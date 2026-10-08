# Customization and extension guide

## Where to change things

| Change | File |
| --- | --- |
| Site name, homepage title/description, featured model | `data/config.json` |
| Default theme and accent | `data/config.json` |
| Peripheral names, colors, explanatory tooltips | `data/config.json` → `protocols` |
| Colors, spacing, fonts, responsive layout | `styles.css` → root variables and media queries |
| A device's specifications, pins, notes and references | `data/devices/<id>.json` |
| Pin geometry for a new package shape | `lib.js` → `pinGeometry()` |
| Diagram rendering and interactions | `app.js` → `renderDiagram()` / `updateHighlights()` |
| Static deployment | `.github/workflows/pages.yml` |

The index `data/catalog.json` is generated. Never maintain its entries manually. The build discovers all JSON files in `data/devices/`.

## Add a device

Use `node scripts/new-device.mjs exact-model-package`, then replace every placeholder. Alternatively copy the closest existing record. Keep distinct records for distinct physical packages or board revisions. The `id` must match the filename without `.json`.

```json
{
  "schemaVersion": 1,
  "id": "example-pdip8",
  "name": "Example model",
  "manufacturer": "Manufacturer",
  "kind": "chip",
  "family": "Family",
  "processor": "Exact part number",
  "description": "A short original description.",
  "layout": {
    "style": "dip",
    "variant": "PDIP-8",
    "accent": "#485369",
    "orientation": "Top view. Notch at top. Pin 1 upper-left."
  },
  "specs": {
    "core": "From manufacturer documentation",
    "clock": "Include supply-dependent limits",
    "flash": "Use explicit units",
    "sram": "Use explicit units",
    "logic": "Distinguish GPIO logic from power input voltage"
  },
  "pins": [],
  "notes": [],
  "sources": [{"title": "Official reference", "url": "https://manufacturer.example/datasheet"}],
  "reviewed": "YYYY-MM-DD",
  "coverage": "Describe which physical pins and functions have been reviewed."
}
```

This example is a format illustration, not a usable device record. Populate the physical pins and verified sources. `npm run validate` rejects an empty pin list.

## Pin record

```json
{
  "id": "J1.1",
  "label": "PA9",
  "type": "gpio",
  "gpio": "PA9",
  "side": "left",
  "position": 0,
  "functions": [
    {"protocol": "UART", "signal": "TX", "instance": "USART1", "mapping": "default"}
  ],
  "notes": "Explain conflicts or configuration requirements here."
}
```

- `id`: unique physical pin or header identifier **within this device**. Do not replace physical numbering with GPIO numbers. Duplicate signal names on separate physical pins are allowed.
- `label`: displayed signal name. `gpio` is optional (`null` for supply pins).
- `type`: `gpio`, `input`, `analog`, `ground`, `power`, `control`, `reserved`, or `nc`.
- `side`: `left`, `right`, `top`, or `bottom`. Board and DIP layouts support left/right; QFP supports all four.
- `position`: zero-based coordinate order. Left/right positions increase from top to bottom. Top/bottom positions increase left to right. Store actual package numbering in `id`; the renderer never renumbers pins.
- `functions`: zero or more objects. `protocol` must exist in the site's protocol registry. `signal` and `instance` are nonempty strings.
- `mapping`: `fixed`, `alternate`, `default`, `routable`, or `usi`. The defaults-only checkbox removes `routable` candidates; ordinary alternate/fixed mappings remain.

For a top-view DIP: left IDs increase downward from 1; right IDs decrease downward from the total pin count. For a top-view QFP: pin numbers normally increase down the left, rightward along the bottom, upward along the right, and leftward across the top. Always check the actual manufacturer's orientation diagram.

## Data quality rules

Use exact orderable parts or explicitly named revisions. Record the source for the physical pin map and alternate-function table. Separate recommended operating conditions from absolute maximum ratings; distinguish board input voltage from GPIO voltage. Include boot straps, flash reservations, reset/oscillator dependencies, shared signals, and native-versus-bridged USB where relevant. Don't label software emulation as a dedicated hardware UART/SPI/I2C block.

The schema supports an open `specs` object: additional fields render automatically in the specification table. Add a friendly display name to `specLabels` in `app.js` if desired. New protocols also need an entry in `protocolOrder` in `app.js` so they appear in the selection UI.

The JSON Schema in `data/device.schema.json` documents the format for editor support. The dependency-free runtime/build validator checks the actual record, protocol registry, duplicate pin IDs, unique side/position pairs and basic references. It does not scientifically verify specifications; human source review is still required.

## Larger catalogs

The starter loads all device JSON files at startup, appropriate for this small dataset. For hundreds or thousands of records, generate summary fields into `catalog.json`, load summaries for search, and fetch the full pin record only when opening its page. This can be added while preserving per-device files and hash URLs.

Recommended next extensions: additional package variants, a vendor import pipeline with review, versioned source provenance, a comparison view, image-backed diagrams with normalized pin coordinates, and a browser editor that exports JSON. GitHub Pages remains static hosting; authenticated multi-user editing needs a separate service.
