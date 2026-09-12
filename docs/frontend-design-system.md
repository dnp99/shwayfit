# Frontend design system direction

ShwayFit will introduce a design system before the authenticated trainer workflows expand beyond the landing page. The landing page remains intentionally lightweight until then.

## Technology choice

- **Tailwind CSS** will provide utility classes.
- **shadcn/ui** will provide accessible, locally owned component primitives.
- **CSS custom properties** will define semantic design tokens and will be surfaced through Tailwind classes.
- **Lucide** will provide interface icons when the component library is introduced.

This follows the durable parts of Sprout's approach without copying its visual identity. ShwayFit's colours, type, spacing, and component details will be chosen for a trainer-focused product.

## Tokens and themes

- Components use semantic tokens such as background, foreground, card, border, muted, primary, destructive, and focus ring. Components must not hard-code colour values.
- Light and dark token values live in `:root` and `.dark` respectively. The same Tailwind classes resolve correctly in either theme.
- Theme selection is class-based. The default is **System**, following the device preference until a trainer selects Light or Dark.
- The selected preference is persisted locally, and the resolved class is applied before React renders to avoid a light-mode flash.

## Component and layout rules

- Use shadcn/ui components as source code in `frontend/src/components/ui/`, allowing ShwayFit to adapt and own them.
- Put reusable product components in `frontend/src/components/`; keep route-level screens in `frontend/src/features/<feature>/` when authenticated work begins.
- Phone layouts use a single-column, touch-friendly workflow. Laptop layouts add navigation and wider content without creating a separate product experience.
- Maintain a minimum 44px touch target for primary controls.

## Repository shape

The repository will preserve the separately deployable structure established for ShwayFit:

```text
frontend/  React, TypeScript, Tailwind, shadcn/ui
backend/   Go REST API
shared/    Language-neutral frontend/backend contracts
docs/      Product, API, cloud, and design documentation
```

`shared/contracts/` holds OpenAPI specifications, contract examples, error codes, and cross-application fixtures. Go and TypeScript do not import each other's source code; each owns its language-specific types while following the shared contract.

Routefy (`navigate-easy`) also has `plans/` and `scripts/`. Add those directories when an implementation plan or repeatable developer automation requires them; do not add empty folders pre-emptively.

## Adoption point

Install Tailwind and shadcn/ui when work begins on trainer sign-in and the authenticated application shell. At that point, create the initial token set, the System/Light/Dark preference control, and the shell before building client or appointment screens.
