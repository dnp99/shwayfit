# ShwayFit design system

## Purpose

ShwayFit uses a calm performance visual language: deep forest green, warm neutral surfaces, and restrained lime accents. It should feel personal, premium, modern, capable, and professional for independent fitness trainers. Avoid stereotypical gym styling: black-and-neon palettes, excessive gradients, oversized shadows, or highly saturated interfaces.

The system will be implemented with Tailwind CSS, shadcn/ui, semantic CSS theme variables, light and dark modes, and Lucide icons. Application components consume semantic tokens rather than raw palette values.

## Principles

Neutral surfaces lead, forest green establishes the brand, and lime is a small highlight. Aim for roughly 70% neutral surfaces, 20% green or green-tinted surfaces, and less than 10% accent or status colour. Lime should usually occupy less than 5% of a screen.

## Core palette

| Name | Value |
| --- | --- |
| Forest 950 | `#0F2D26` |
| Forest 900 | `#173F37` |
| Forest 800 | `#205548` |
| Forest 700 | `#2F6A59` |
| Forest 600 | `#43806D` |
| Forest 500 | `#66A58F` |
| Forest 200 | `#CFE2DA` |
| Forest 100 | `#E5EFEA` |
| Lime | `#C6D978` |
| Cream | `#F7F7F3` |

These values belong in theme definitions, not scattered through application components.

## Semantic theme tokens

### Light

| Token | Value |
| --- | --- |
| background | `#F7F7F3` |
| foreground | `#17211D` |
| card / popover | `#FFFFFF` |
| card-foreground / popover-foreground | `#17211D` |
| primary / primary-foreground | `#205548` / `#FFFFFF` |
| secondary / secondary-foreground | `#EDF2EF` / `#23483D` |
| muted / muted-foreground | `#F0F2EF` / `#68746E` |
| accent / accent-foreground | `#E3EEE8` / `#17473C` |
| border | `#DDE3DF` |
| input | `#D7DFDA` |
| ring | `#43806D` |
| destructive | `#B42318` |

### Dark

| Token | Value |
| --- | --- |
| background | `#0F1412` |
| foreground | `#F2F5F3` |
| card / popover | `#151B18` |
| card-foreground / popover-foreground | `#F2F5F3` |
| primary / primary-foreground | `#66A58F` / `#0B1713` |
| secondary / secondary-foreground | `#1C2722` / `#DCE7E1` |
| muted / muted-foreground | `#1B211E` / `#9CA8A1` |
| accent / accent-foreground | `#20372F` / `#DDF0E7` |
| border | `#2B342F` |
| input | `#334039` |
| ring | `#77B6A0` |
| destructive | `#E76B62` |

Dark mode is independently designed. It uses layered neutral green-charcoal surfaces, while the primary action becomes lighter. Do not make the entire interface green or use light-mode forest 800 as the main dark-mode action colour.

## Styling and components

Use semantic Tailwind classes such as `bg-background`, `text-foreground`, `bg-card`, `text-card-foreground`, `bg-primary`, `text-primary-foreground`, `bg-secondary`, `text-secondary-foreground`, `bg-muted`, `text-muted-foreground`, `bg-accent`, `text-accent-foreground`, `border-border`, and `ring-ring`.

Do not introduce component-level values such as `bg-[#205548]`, `text-[#68746e]`, or `dark:bg-[#151b18]`. Raw values are acceptable when defining the theme or for a documented special-purpose visualization. Lime (`#C6D978`) is for small active indicators, goals, progress, logo detail, current-time markers, and chart highlights; it is not a normal primary button, body-text, form, navigation, or large-background colour.

Prefer shadcn/ui primitives for generic controls: Button, Card, Badge, Input, Textarea, Select, Dialog, Drawer, Sheet, Tabs, Tooltip, Popover, Calendar, Table, Avatar, Separator, Progress, Skeleton, Sidebar, and Sonner. Keep generic primitives in `frontend/src/components/ui/` and compose them into domain components in `frontend/src/components/`, such as `ClientCard`, `SessionCard`, `WorkoutCard`, `StatusBadge`, `PageHeader`, and `MobileBottomNav`.

## Typography, spacing, and shape

Use Inter for product UI, with Geist as an acceptable alternative. Use regular, medium, and semibold weights; avoid excessive bold text. Marketing pages may use DM Serif Display for large headings only.

Use Tailwind's standard spacing scale: `gap-2` for icon/text, `gap-3` for compact groups, `gap-4` for forms and cards, `p-4` to `p-6` for card padding, and `px-4`, `px-6`, and `px-8` across phone, tablet, and desktop page widths. Base radius is `0.75rem`; controls should be about 8–10px, cards about 12px, and larger dialogs about 16px. Avoid `rounded-3xl` as a default.

Prefer borders over shadows. Normal cards use a subtle border and no shadow; elevated controls may use `shadow-sm`, and dialogs or popovers may use `shadow-lg`.

## Responsive behaviour and accessibility

ShwayFit is phone-first. Do not merely shrink desktop layouts. Tables become cards or list rows on narrow screens, desktop sidebars become mobile-appropriate navigation, and ordinary workflows must not require horizontal scrolling. Important mobile controls need approximately 44px touch targets.

Design dark mode, keyboard focus, contrast, reduced motion, and icon labels intentionally. Status must not rely on colour alone. Prefer restrained `transition-colors duration-150` motion; avoid gratuitous spring animation.

## Navigation, data displays, and status

Use a shadcn Sidebar where appropriate on desktop. On mobile, optimize primary navigation for Today, Clients, Add, Calendar, and More rather than hiding the desktop sidebar behind a hamburger. A small lime active indicator is optional.

Normal data cards use the card surface, a subtle border, roughly 12px radius, and little or no shadow. Interactive cards may use `transition-colors hover:bg-accent/40`. Use tinted status backgrounds and coloured text instead of filling whole cards. Optional session-category colours are strength `#52705F`, mobility `#96775F`, cardio `#B05E55`, recovery `#5F8190`, and assessment `#79718E`; use them only in small visual details.

Charts favour forest green, lime, muted blue, warm amber, and muted violet. Forest green represents primary business or fitness data and lime marks targets or highlighted points. Avoid rainbow dashboards.

## Theme implementation and verification

Theme selection defaults to System and supports Light and Dark. Persist the preference locally and apply the resolved class before React renders to avoid a light-mode flash. Use `next-themes` only if the current stack does not already provide an equivalent mechanism.

After UI work, run formatting, lint, type checking when available, relevant tests and builds. Verify both themes and phone and desktop layouts, then search changed UI code for hard-coded colours that should use semantic tokens.
