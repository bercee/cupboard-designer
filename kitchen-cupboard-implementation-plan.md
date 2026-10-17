# Implementation Plan: Kitchen Cupboard Cut-List Generator

**Document type:** Implementation handout for an AI coding agent\
**Project type:** Static, front-end-only single-page application\
**Status:** Ready for incremental implementation, with explicitly listed
assumptions to preserve

## 1. Goal

Build a small, maintainable web application that lets a carpenter define
kitchen cupboard designs, calculate the required wooden pieces, combine
matching pieces into an order list, and copy that list into Excel.

The app must be deployable as static files under Nginx on an Ubuntu
server. There is no backend, database, authentication, or automated
deployment in scope.

### Required stack

-   TypeScript
-   HTML and CSS, with no React or Vue in the initial version
-   Vite for development and production builds
-   npm and `package-lock.json`
-   Vitest for automated tests
-   ESLint for linting
-   Prettier for formatting
-   GitHub Actions for CI validation only
-   Static production output in `dist/`

Do not introduce a front-end framework, backend, state-management
library, router, CSS framework, or additional dependency unless a
specific requirement justifies it.

## 2. Deliverable plan

Implement the work in the following seven deliverables. Each deliverable
should be committed separately or in a small, reviewable group of
commits. Do not proceed past a deliverable with failing checks.

1.  Project skeleton and developer tooling
2.  Domain types, rules, and input validation
3.  Cut-list calculation engine and acceptance tests
4.  Aggregation of pieces across cupboard designs
5.  User interface and form workflow
6.  Excel-friendly TSV export and usability checks
7.  CI, production build verification, and handover documentation

## 3. Functional scope

A user can add multiple cupboard designs to a working order. Each design
has:

-   Name/label
-   Height in millimeters
-   Width in millimeters
-   Depth in millimeters
-   Type: wall/top cupboard or base/bottom cupboard
-   Door count: one or two symmetrical doors
-   Number of identical cupboards to manufacture

The app generates a cut list with component name, material, dimensions,
and quantity. It supports aggregating identical components across all
designs and copying the resulting table as tab-separated values (TSV).

The app does not optimize board nesting or cutting layouts, calculate
waste, price materials, manage stock, or persist orders between visits.

## 4. Confirmed construction rules

All user-entered dimensions are in millimeters.

### Materials

-   Side panels, top panels, bottom panels, and top support strips: 18
    mm cabinet board.
-   Back panel: thin backing board.
-   Doors: door material.

Material thickness/type should be represented explicitly in the domain
model. Do not infer that the backing board adds to the entered overall
cupboard depth.

### Components per cupboard

**Side panels** - Two per cupboard. - Height equals cupboard height. -
Depth equals cupboard depth.

**Wall/top cupboard** - One full top panel. - One full bottom panel. -
Each panel fits between the side panels. - Panel length/width across the
cupboard = cupboard width − 2 × 18 mm. - Panel depth = cupboard depth.

**Base/bottom cupboard** - One full bottom panel, fitting between the
side panels. - No full top panel. - Two top support strips, each 100 mm
deep, spanning between the side panels. - Support strip length across
the cupboard = cupboard width − 2 × 18 mm.

**Back panel** - One per cupboard. - Covers the full external cupboard
width and full external cupboard height. - Attached to the rear. - Its
thickness does not increase the entered overall cupboard depth.

**One door** - One door per cupboard. - Door height = cupboard height −
5 mm. - Door width = cupboard width − 3 mm.

**Two symmetrical doors** - Two doors per cupboard. - Each door height =
cupboard height − 5 mm. - Each door width = (cupboard width − 6 mm) ÷
2. - The centre gap is 3 mm. - The total outside clearance is 3 mm.

**Multiple identical cupboards** - Multiply every component quantity by
the number of cupboards. - When combining an order, merge matching
components only when component type, material, and dimensions match.

## 5. Important assumptions and decision gates

The implementation agent must not silently invent carpentry rules.
Record these assumptions in the README and keep relevant logic easy to
change.

1.  **Dimension representation:** Use named fields (`lengthMm`,
    `widthMm`, `heightMm`, `depthMm`) internally rather than ambiguous
    dimension pairs. For cut-list display/export, define a consistent
    convention: panels are displayed as length × depth; doors as height
    × width; back panels as height × width. Label columns clearly.
2.  **Two-door half-millimeter dimensions:** The formula can produce
    fractional dimensions for odd cupboard widths. Until the owner
    specifies otherwise, do not silently round. Validate that the
    resulting door width is a whole millimeter; reject a two-door width
    that produces a fractional result with a clear message. Make this
    rule easy to revise.
3.  **Back-board thickness:** It does not affect overall cupboard depth.
    Do not invent a thickness. Represent its material as "Thin backing
    board" unless a thickness is explicitly supplied later.
4.  **Back panel size:** Confirmed as full external width × full
    external height, so no subtraction is applied.
5.  **Panel construction:** Do not subtract the backing board or its
    thickness from other panel dimensions.
6.  **Dimension feasibility:** Reject non-finite, zero, or negative
    dimensions; reject widths that make the internal panel width
    non-positive; reject heights that make door height non-positive. Do
    not add unconfirmed minimum cupboard sizes.
7.  **Labels:** Trim whitespace and reject an empty name. Decide and
    document whether duplicate design names are allowed; recommended:
    allow them, because names are labels rather than identifiers.
8.  **Naming:** Use `wall` and `base` as the internal cupboard type
    values, and `1 | 2` for door count. UI labels may say "Wall
    cupboard" and "Base cupboard".

If any assumption blocks a correct implementation, ask the project owner
before coding the affected behavior. Otherwise, implement the stated
default and document it.

## 6. Deliverable 1 --- Project skeleton and tooling

### Tasks

1.  Create a Git repository with a clear project name, for example
    `kitchen-cupboard-cutlist`.
2.  Initialize npm.
3.  Add Vite, TypeScript, Vitest, ESLint, Prettier, and any minimal
    DOM-testing dependency needed later. Avoid adding dependencies
    preemptively.
4.  Create the initial Vite TypeScript app.
5.  Configure TypeScript with strict checking enabled.
6.  Configure Vite and Vitest.
7.  Configure ESLint for TypeScript and Prettier for consistent
    formatting.
8.  Add `.gitignore` entries for `node_modules/`, `dist/`, and local
    environment/editor artifacts.
9.  Commit `package-lock.json`.
10. Add npm scripts.

Suggested scripts (adjust only as required by the chosen compatible tool
versions):

-   `npm run dev` --- local Vite development server
-   `npm run build` --- type-check and create production output
-   `npm run preview` --- preview the production build
-   `npm run test` --- run Vitest once
-   `npm run test:watch` --- interactive test mode
-   `npm run lint` --- ESLint
-   `npm run format:check` --- Prettier check
-   `npm run typecheck` --- TypeScript check without emitting output
-   `npm run check` --- run typecheck, lint, format check, and tests

Ensure `npm ci`, `npm run check`, and `npm run build` work on a clean
checkout.

### Acceptance criteria

-   A fresh clone can install from the lockfile.
-   The dev server opens a basic page.
-   Type checking, linting, formatting checks, tests, and production
    build run locally.
-   No deployment or server-side runtime is configured.

## 7. Deliverable 2 --- Domain types and validation

Create pure TypeScript domain types and validation functions. Keep them
independent of the DOM.

Suggested files:

``` text
src/domain/types.ts
src/domain/validation.ts
```

Suggested types:

``` ts
export type CupboardType = "wall" | "base";
export type DoorCount = 1 | 2;

export interface CupboardDesign {
  id: string;
  name: string;
  heightMm: number;
  widthMm: number;
  depthMm: number;
  type: CupboardType;
  doorCount: DoorCount;
  quantity: number;
}

export type MaterialId =
  | "cabinet-board-18mm"
  | "thin-backing-board"
  | "door-material";

export type ComponentType =
  | "side-panel"
  | "top-panel"
  | "bottom-panel"
  | "top-support-strip"
  | "back-panel"
  | "door";

export interface CutListItem {
  componentType: ComponentType;
  componentLabel: string;
  materialId: MaterialId;
  materialLabel: string;
  lengthMm: number;
  widthMm: number;
  quantity: number;
  sourceDesignName?: string;
}
```

Refine the dimension fields if necessary to avoid implying that
`lengthMm` always means the same physical axis. A reasonable alternative
is a dimension object with named `heightMm`, `widthMm`, and `depthMm`
fields, with display formatting handled separately.

### Validation requirements

-   Trim the name; reject if empty.
-   Height, width, and depth must be finite positive numbers.
-   Quantity must be a positive integer.
-   Door count must be exactly 1 or 2.
-   Cupboard type must be `wall` or `base`.
-   `widthMm - 36` must be positive.
-   `heightMm - 5` must be positive.
-   For two doors, reject a calculated fractional door width rather than
    silently rounding, per the provisional rule above.
-   Return actionable validation messages.
-   Avoid coupling validation to browser form controls.

### Tests

Write unit tests for valid input and each invalid condition. Test
boundaries (e.g., width 36 mm is invalid; a width greater than 36 mm
passes that specific check).

### Acceptance criteria

-   Domain types compile under strict TypeScript.
-   Validation returns deterministic results.
-   Validation tests pass without requiring a browser.

## 8. Deliverable 3 --- Cut-list calculation engine and acceptance tests

Create a pure function, for example:

``` ts
generateCutList(design: CupboardDesign): CutListItem[]
```

The function should: 1. Accept a validated design. 2. Generate the
correct component types for its cupboard type. 3. Calculate dimensions
using the confirmed rules. 4. Multiply each per-cupboard component
quantity by the design quantity. 5. Return structured data, not HTML or
formatted TSV. 6. Never read from or manipulate the DOM.

Keep constants such as 18 mm board thickness, 100 mm support-strip
depth, 5 mm door-height clearance, and 3 mm door clearances in one
clearly named place.

### Acceptance test A --- Wall cupboard, single door

Input:

``` json
{
  "name": "Wall-500-Single",
  "heightMm": 600,
  "widthMm": 500,
  "depthMm": 300,
  "type": "wall",
  "doorCount": 1,
  "quantity": 1
}
```

Expected components (dimensions shown in the display convention
described above):

  Component      Material                Dimensions (mm)   Quantity
  -------------- --------------------- ----------------- ----------
  Side panel     18 mm cabinet board           600 × 300          2
  Top panel      18 mm cabinet board           464 × 300          1
  Bottom panel   18 mm cabinet board           464 × 300          1
  Back panel     Thin backing board            600 × 500          1
  Door           Door material                 595 × 497          1

### Acceptance test B --- Wall cupboard, two symmetrical doors

Input:

``` json
{
  "name": "Wall-800-Double",
  "heightMm": 720,
  "widthMm": 800,
  "depthMm": 350,
  "type": "wall",
  "doorCount": 2,
  "quantity": 1
}
```

Expected components:

  Component      Material                Dimensions (mm)   Quantity
  -------------- --------------------- ----------------- ----------
  Side panel     18 mm cabinet board           720 × 350          2
  Top panel      18 mm cabinet board           764 × 350          1
  Bottom panel   18 mm cabinet board           764 × 350          1
  Back panel     Thin backing board            720 × 800          1
  Door           Door material                 715 × 397          2

Check the two doors have equal dimensions and that
`397 + 397 + 3 mm centre gap + 3 mm total outside clearance = 800 mm`.

### Acceptance test C --- Base cupboard, single door

Input:

``` json
{
  "name": "Base-600-Single",
  "heightMm": 720,
  "widthMm": 600,
  "depthMm": 560,
  "type": "base",
  "doorCount": 1,
  "quantity": 1
}
```

Expected components:

  Component           Material                Dimensions (mm)   Quantity
  ------------------- --------------------- ----------------- ----------
  Side panel          18 mm cabinet board           720 × 560          2
  Bottom panel        18 mm cabinet board           564 × 560          1
  Top support strip   18 mm cabinet board           564 × 100          2
  Back panel          Thin backing board            720 × 600          1
  Door                Door material                 715 × 597          1

Verify that there is no full top panel and exactly two support strips.

### Acceptance test D --- Three base cupboards, two doors each

Input:

``` json
{
  "name": "Base-900-Double",
  "heightMm": 720,
  "widthMm": 900,
  "depthMm": 560,
  "type": "base",
  "doorCount": 2,
  "quantity": 3
}
```

Expected components:

  Component           Material                Dimensions (mm)   Quantity
  ------------------- --------------------- ----------------- ----------
  Side panel          18 mm cabinet board           720 × 560          6
  Bottom panel        18 mm cabinet board           864 × 560          3
  Top support strip   18 mm cabinet board           864 × 100          6
  Back panel          Thin backing board            720 × 900          3
  Door                Door material                 715 × 447          6

Verify that every component count scales by three and no full top panel
is generated.

### Test implementation notes

-   Compare structured fields, not display strings.
-   Do not depend on array order unless ordering is a documented
    requirement. Prefer sorting by component type/material/dimensions in
    test helpers or comparing normalized arrays.
-   Test dimensions and quantity independently so a failure is easy to
    diagnose.
-   Add tests for formula boundaries and for the fractional-width
    validation policy.

### Acceptance criteria

All four test cases match the expected components, materials,
dimensions, and quantities exactly. The calculation engine remains pure
and independently testable.

## 9. Deliverable 4 --- Aggregate pieces across cupboard designs

Create a pure function, for example:

``` ts
aggregateCutList(items: CutListItem[]): CutListItem[]
```

### Aggregation rules

Merge items only when all of the following match: - Component type -
Material identifier - All physical dimensions

Sum quantities for matching items. Do not merge items made of different
materials even when dimensions match.

The order of the final lines should be deterministic, for example by
material, component type, and dimensions. The UI may also retain each
cupboard design separately for review, but the order list should be
aggregated.

### Tests

1.  Two identical cupboard designs merge their matching parts and sum
    quantities.
2.  Different dimensions remain separate lines.
3.  Different materials remain separate lines.
4.  Multiple designs with overlapping component dimensions aggregate
    correctly.
5.  Aggregating an empty list returns an empty list.
6.  Aggregation does not mutate its input.
7.  The total quantity before and after aggregation is conserved, where
    each input item represents a piece line with its already-expanded
    quantity.

### Acceptance criteria

The combined cut list accurately represents all designs in the working
order. Test the combined order using acceptance tests A and C as well as
a pair of designs deliberately sharing identical part dimensions.

## 10. Deliverable 5 --- User interface

Build a single-page UI using semantic HTML, CSS, and TypeScript. Keep
the interface functional and plain rather than introducing a component
framework.

Suggested structure:

``` text
src/
  main.ts
  ui/
    cupboard-form.ts
    design-list.ts
    cut-list-table.ts
  styles/
    main.css
```

Adjust the structure if simpler, but keep UI code separate from domain
calculations.

### Form fields

-   Cupboard name
-   Height (mm)
-   Width (mm)
-   Depth (mm)
-   Cupboard type: Wall cupboard / Base cupboard
-   Number of doors: 1 / 2 symmetrical
-   Number of identical cupboards

### User workflow

1.  The user fills in a cupboard design.
2.  The user selects **Add cupboard**.
3.  The design is validated. Invalid input shows a clear error and is
    not added.
4.  Valid designs appear in a list of cupboard designs in the current
    order.
5.  The user can remove a design before generating/copying the order.
6.  The app generates or refreshes the aggregated cut list.
7.  The user can copy the final list for Excel.

Keep the design list and the aggregated order list visually distinct.
Show design names so the user can verify what has been added. Provide
empty states before any designs have been added.

### Accessibility and usability

-   Every input has a visible label.
-   Use appropriate number input constraints, but do not rely on HTML
    validation alone.
-   Ensure keyboard operation and visible focus states.
-   Associate validation messages with the relevant inputs.
-   Use readable contrast and a responsive layout for desktop and tablet
    use.
-   Render user-supplied names as text, not HTML, to avoid HTML
    injection.
-   Do not report that copying succeeded until the clipboard operation
    succeeds.

### UI tests

Use a DOM testing library only if needed. Test at minimum: - A user can
add a valid design. - Invalid input is visibly rejected. - A design can
be removed. - The cut list updates when designs change. - Empty state is
shown with no designs. - UI rendering escapes names and does not
interpret user text as HTML.

### Acceptance criteria

A carpenter can complete the main workflow without developer tools or
editing raw data. The UI delegates all calculations to the domain
functions.

## 11. Deliverable 6 --- TSV export for Excel

Implement a pure formatter:

``` ts
formatCutListAsTsv(items: CutListItem[]): string
```

Use tab separators and newline-separated rows. Include a header row.
Suggested columns:

-   Component
-   Material
-   Length (mm)
-   Width (mm)
-   Quantity

Use the agreed display convention consistently. If necessary, map the
domain's named dimensions to these export columns in one place.

### Requirements

-   Format aggregated cut-list rows.
-   Preserve millimeter values without unintended locale formatting.
-   Do not include a thousands separator in numeric values.
-   Include a header even when the list is empty, unless a deliberate
    and documented alternative is selected.
-   Ensure values containing tabs or line breaks cannot corrupt the TSV
    structure. Implement a documented sanitization or escaping policy
    suitable for clipboard paste.
-   Keep the formatter independent of the browser clipboard API.

Add a UI **Copy for Excel** button. Use
`navigator.clipboard.writeText()` when available in a secure context.
Catch errors and display a useful failure message. Do not silently claim
success if clipboard access is denied or unavailable.

### Tests

-   Expected header and row order.
-   Correct separators and line breaks.
-   Correct values for all four acceptance examples.
-   Empty-list behavior.
-   Text values containing tabs/newlines.
-   Clipboard success and failure behavior at the UI boundary.

### Acceptance criteria

Pasting the copied content into Excel places each field into its own
cell. The export tests pass independently of the UI.

## 12. Deliverable 7 --- GitHub Actions CI, production build, and handover

The requested pipeline is **GitHub Actions**, not GitLab CI, because the
project is intended for a GitHub repository. Do not configure
deployment.

Create `.github/workflows/ci.yml` to run on: - Pushes to repository
branches - Pull requests targeting the main branch

Use a supported Node.js LTS version, install dependencies with `npm ci`,
and run: 1. Type checking 2. ESLint 3. Prettier check 4. Vitest 5.
Production build

The workflow must fail if any required check fails. Use a sensible
timeout and avoid unnecessary workflow complexity. Do not store
deployment credentials because CI does not deploy.

### Production build verification

-   `npm run build` produces static files in `dist/`.
-   The production build has no dependency on a running Node.js server.
-   Test the production output locally using Vite preview.
-   Document that Nginx serves the contents of `dist/`.
-   If the app is hosted under a URL subpath rather than a domain root,
    document how to configure Vite's `base` option. Default to root
    hosting unless the owner specifies otherwise.
-   Do not add an automated deploy job, SSH access, or server secrets.

### README requirements

Include: - Project purpose and scope - Requirements (Node.js/npm) -
Local setup (`npm ci`) - Development (`npm run dev`) - Test and quality
commands - Production build (`npm run build`) - Where the static output
is generated - Manual deployment overview for Nginx - Current
construction assumptions, especially the fractional double-door-width
policy - Known exclusions, including cut optimization and persistence

### Acceptance criteria

-   GitHub Actions runs on pushes and pull requests.
-   All checks pass on a clean checkout.
-   CI never deploys.
-   A developer can follow the README to run, test, and build the
    application.
-   The static output can be copied to the Nginx document root and
    served.

## 13. Suggested final repository layout

``` text
kitchen-cupboard-cutlist/
├── .github/
│   └── workflows/
│       └── ci.yml
├── public/
├── src/
│   ├── domain/
│   │   ├── types.ts
│   │   ├── validation.ts
│   │   ├── generate-cut-list.ts
│   │   ├── aggregate-cut-list.ts
│   │   └── export-tsv.ts
│   ├── ui/
│   │   ├── cupboard-form.ts
│   │   ├── design-list.ts
│   │   └── cut-list-table.ts
│   ├── styles/
│   │   └── main.css
│   └── main.ts
├── tests/
│   ├── domain/
│   ├── acceptance/
│   └── ui/
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
├── .prettierrc.json
├── .gitignore
└── README.md
```

Keep the layout proportional to the code. Do not create empty modules
just to match this tree; add each file when its deliverable begins.

## 14. Definition of done

The project is complete when:

-   [ ] A user can add and remove cupboard designs.
-   [ ] Wall and base cupboards generate the correct components.
-   [ ] Single-door and double-door calculations match the specified
    formulas.
-   [ ] Multiple identical cupboards multiply all component quantities
    correctly.
-   [ ] Back panels use full external width and height.
-   [ ] Matching pieces are aggregated correctly by component, material,
    and dimensions.
-   [ ] Invalid input is rejected with actionable feedback.
-   [ ] The generated order list can be copied into Excel.
-   [ ] All unit, acceptance, aggregation, export, and essential UI
    tests pass.
-   [ ] Type checking, linting, formatting, tests, and build pass in
    GitHub Actions.
-   [ ] CI performs validation only and never deploys.
-   [ ] The production output is static and can be served by Nginx.
-   [ ] README instructions are sufficient for another developer to set
    up, validate, build, and manually deploy the app.

## 15. Instructions to the implementing agent

Work deliverable by deliverable. At the end of each deliverable:

1.  Run all relevant checks.
2.  Report the files created or changed.
3.  Report the exact commands run and whether they passed.
4.  Identify any assumptions or deviations.
5.  Stop if a carpentry rule is ambiguous enough to change the cut list;
    ask the owner instead of inventing a rule.

Prioritize correctness, explicit domain rules, testability, and
maintainability over visual complexity. Do not add features outside the
scope without approval.
