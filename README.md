# Kitchen Cupboard Cut-List Generator

A small, static, front-end-only web application for a carpenter. You define
kitchen cupboard designs (name, height, width, depth, wall or base type, one or
two doors, number of identical cupboards). The app calculates the wooden pieces
for each design, combines matching pieces across all designs into one order
list, and copies that list as tab-separated text (TSV) that pastes into Excel.

Everything runs in the browser. There is no backend, database, login or
automated deployment. All sizes are in millimetres.

## Requirements

- Node.js `^22.13.0 || ^24.0.0 || >=26.0.0` (see `engines` in `package.json`;
  CI uses Node 24)
- npm (installed with Node.js)

Node.js is only needed to develop and build. The built application is plain
static files and needs no Node.js server.

## Local setup

```sh
npm ci
```

`npm ci` installs exactly the versions in `package-lock.json`.

## Development

```sh
npm run dev
```

Starts the Vite development server (by default at http://localhost:5173/).

## Test and quality commands

Never commit changes before checking every QA gate: Prettier (`npm run format:check`), linter (`npm run lint`), typecheck (`npm run typecheck`), tests (`npm test`), and production build (`npm run build`).

| Command                | What it does                                                             |
| ---------------------- | ------------------------------------------------------------------------ |
| `npm run dev`          | Vite development server                                                  |
| `npm run build`        | Type-check (`tsc --noEmit`), then create the production build in `dist/` |
| `npm run preview`      | Serve the production build locally (default http://localhost:4173/)      |
| `npm test`             | Run all Vitest tests once                                                |
| `npm run test:watch`   | Vitest in interactive watch mode                                         |
| `npm run lint`         | ESLint                                                                   |
| `npm run format`       | Format supported files with Prettier                                     |
| `npm run format:check` | Prettier check (does not modify files)                                   |
| `npm run typecheck`    | TypeScript check without emitting output                                 |
| `npm run check`        | `typecheck`, `lint`, `format:check` and `test`, in that order            |

Run `npm run check` and `npm run build` before committing. GitHub Actions
(`.github/workflows/ci.yml`) runs the same checks on every push and on pull
requests targeting `main`: install with `npm ci`, then type check, lint,
format check, tests and build as separate steps. CI only validates; it never
deploys and uses no secrets.

## Production build

```sh
npm run build
```

The static output is written to `dist/` (an `index.html` plus hashed JS and CSS
under `dist/assets/`). To test it locally, run `npm run preview` and open
http://localhost:4173/.

## Manual deployment with Nginx

Deployment is manual; nothing deploys automatically. No Node.js process is
needed on the server; Nginx serves static files.

1. Build: `npm ci && npm run build`.
2. Copy the contents of `dist/` (not the `dist` folder itself) to the Nginx
   document root, for example `/var/www/kitchen-cutlist/`.
3. Add a server block and reload Nginx
   (`sudo nginx -t && sudo systemctl reload nginx`).

Example server block (adjust `server_name` and `root`):

```nginx
server {
    listen 80;
    server_name cutlist.example.com;

    root /var/www/kitchen-cutlist;
    index index.html;

    # Single-page app: fall back to index.html for unknown paths.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Vite emits content-hashed file names under /assets, so they can be
    # cached for a long time.
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # Do not cache index.html so a new deployment is picked up promptly.
    location = /index.html {
        add_header Cache-Control "no-cache";
    }
}
```

### HTTPS and the Copy for Excel button

The browser Clipboard API only works in a secure context: HTTPS, or
`localhost`. If the app is served over plain HTTP from another host, the
**Copy for Excel** button cannot write to the clipboard. It then shows a
message and a read-only text box containing the tab-separated text so it can be
selected and copied manually. Serve the app over HTTPS (for example with a
Let's Encrypt certificate) for one-click copying.

### Hosting under a URL subpath

The default build assumes the app is served from the domain root (`/`), which
is the Vite default (`base` is not set in `vite.config.ts`). To host it under a
subpath such as `https://example.com/cutlist/`, build with a base:

```sh
npm run build -- --base=/cutlist/
```

or set `base: "/cutlist/"` in `defineConfig` in `vite.config.ts`. Then serve the
contents of `dist/` at that path in Nginx. Prefer a `root`-based layout over
`alias` (combining `alias` with `try_files` is a known Nginx pitfall): copy the
build into a `cutlist` folder under the document root, for example
`/var/www/sites/cutlist/`, and use:

```nginx
root /var/www/sites;
location /cutlist/ {
    try_files $uri $uri/ /cutlist/index.html;
}
```

`npm run build` runs
`tsc --noEmit && vite build`, so arguments after `--` are passed to
`vite build`.

## Current construction assumptions

These are the rules implemented today. Construction numbers live in
`src/domain/constants.ts` (board thickness 18 mm, support strip depth 100 mm,
door height clearance 5 mm, outside door clearance 3 mm, centre gap 3 mm, the
material and component labels, and the output ordering), so they are easy to
revise in one place.

Per cupboard:

- Side panels: 2, height x depth, 18 mm cabinet board.
- Wall cupboard: one top panel and one bottom panel, each
  `width - 2 x 18` long and `depth` deep, 18 mm cabinet board.
- Base cupboard: one bottom panel (`width - 2 x 18` x `depth`), no full top
  panel, and two top support strips (`width - 2 x 18` x 100 mm deep), all 18 mm
  cabinet board.
- Back panel: one, full external height x full external width.
- One door: height `height - 5`, width `width - 3`.
- Two symmetrical doors: each height `height - 5`, width `(width - 6) / 2`
  (3 mm centre gap plus 3 mm total outside clearance).
- Every component quantity is multiplied by the number of identical cupboards.

Decisions and policies:

- **Two-door fractional widths are rejected.** With two doors,
  `(width - 6) / 2` must be a whole number of millimetres. The app never rounds
  silently; an odd overall width is rejected with the message "With two doors,
  (width - 6) / 2 must be a whole number of millimetres. Use an even width, or
  choose one door." This is a provisional policy and is easy to revise in
  `src/domain/validation.ts`.
- **Fractional one-door dimensions are allowed.** Overall dimensions need not be
  whole numbers (for example 500.5 mm wide), except where the two-door rule
  above applies. Such values flow through the calculation unrounded and appear
  in the table and export as plain decimals with a `.` separator (for example
  `497.5`).
- **Back panel:** full external width x full external height. Its thickness is
  not modelled and does not add to the entered depth. The material is shown as
  "Thin backing board" (no thickness is invented).
- **No subtraction of the backing board** (or its thickness) from any other
  panel.
- **Duplicate design names are allowed.** Names are labels, not identifiers.
  Names are trimmed; an empty name is rejected.
- **No minimum sizes beyond positivity.** Height, width and depth must be
  finite numbers greater than 0, with `width > 36` (so the inner panel width is
  positive) and `height > 5` (so the door height is positive). The number of
  cupboards must be a whole number of 1 or more. No maximum sizes are applied.
- **Dimension display and export convention.** Internally dimensions use named
  fields (`lengthMm`, `depthMm`, `heightMm`, `widthMm`). Panels (sides, top,
  bottom, support strips) are shown as length x depth; doors and back panels as
  height x width. The on-screen table shows a "Size (mm)" column plus a
  "Size order" column ("length × depth" or "height × width"); the TSV export
  uses "Length (mm)" and "Width (mm)" columns with the same mapping.
- **Aggregation.** Pieces merge only when component type, material and
  dimensions (including panel versus door/back kind) are identical; quantities
  are summed. Different materials never merge. The order list is sorted
  deterministically by material (cabinet board, thin backing board, door
  material), then component (side, top, bottom, support strip, back, door), then
  piece kind (panels before doors/back panels), then first and second
  dimension ascending.
- **TSV export** (`src/domain/export-tsv.ts`): columns are Component, Material,
  Length (mm), Width (mm), Quantity. A header row is always present, even for an
  empty list. Fields are separated by tabs and rows by `\n`, with no trailing
  newline. Numbers have no thousands separator and always use `.` as the decimal
  separator. Text values have tabs and line breaks (any whitespace run)
  collapsed to a single space, and text starting with `=`, `+`, `-` or `@` is
  prefixed with an apostrophe to prevent spreadsheet formula injection. The
  formatter does not use the clipboard; the UI does, and reports success only
  after the clipboard write succeeds.

## Project structure

```text
.github/workflows/ci.yml   CI validation only (no deployment)
index.html                 Vite entry page
src/
  main.ts                  Mounts the app
  domain/                  Pure TypeScript, no DOM
    types.ts               Domain types
    constants.ts           Construction constants, labels, ordering
    validation.ts          Input validation and messages
    generate-cut-list.ts   Cut list for one design
    aggregate-cut-list.ts  Merge and order pieces across designs
    dimensions.ts          Piece dimension key helper
    export-tsv.ts          TSV formatter
  ui/                      DOM code (form, design list, cut-list table, copy)
  styles/main.css          Styles
tests/
  domain/                  Unit tests
  acceptance/              Acceptance tests (worked examples)
  ui/                      DOM tests (jsdom)
```

The UI delegates all calculation, validation and formatting to `src/domain/`.

## Known exclusions

Not in scope: cutting-layout or board-nesting optimisation, waste calculation,
pricing, stock management, saving orders between visits (the order is lost when
the page is reloaded), any backend, database or authentication, and automated
deployment.
