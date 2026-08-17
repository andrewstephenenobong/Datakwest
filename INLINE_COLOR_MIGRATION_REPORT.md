# DataKwest Inline-Color Migration Report

## Audit method

The source tree was scanned for JSX inline styles, hexadecimal colors, and RGB values across `src/pages`, `src/components`, `src/context`, and `src/index.css`. The inventory is evidence of implementation patterns, not proof that every color is a defect. Game boards, illustrations, chart series, branded artwork, and state-specific semantic colors may legitimately remain local when they are not theme surfaces or text roles.

## Baseline before this migration

| Area | Baseline evidence | Risk |
|---|---:|---|
| Global stylesheet color literals | 709 color references in `src/index.css` | High maintenance cost; compatibility overrides can become order-dependent |
| Highest page hotspots | `Lesson.jsx` 112, `TrackLesson.jsx` 105, `Settings.jsx` 99, `Onboarding.jsx` 79, `Dashboard.jsx` 79 | High; these routes combine dense learning, forms, state, and theme surfaces |
| Highest shared-component hotspots | `RecoveryState.jsx` 80, `LearnerNavigation.jsx` 55, `OwlLoading.jsx` 30, `AuthShell.jsx` 18, `Navbar.jsx` 9 | Very high; a single defect affects many routes |
| Most repeated colors | `#0A2342` 339, `#6B7A99` 221, `#D4AF37` 112, `#F5F7FA` 86, `#2456A6` 75 | High; these are product tokens represented repeatedly as literals |

## What was migrated in this pass

### Global header — `src/components/Navbar.jsx`

The header no longer owns hard-coded border, text, avatar, or profile-arrow colors. It now uses `app-navbar`, `app-navbar-metrics`, `app-navbar-avatar`, `app-navbar-profile`, `app-navbar-profile-arrow`, and `app-navbar-menu-trigger`, which resolve through `--dk-*` semantic variables. This fixes header theme drift while preserving streak, XP, profile navigation, compact mode, and the existing logo.

### Learner navigation — `src/components/LearnerNavigation.jsx`

The main desktop navigation surface, mobile navigation surface, More drawer surface, and primary active item now use semantic classes and `--dk-*` surfaces/borders/link colors. The route matching, sound effects, search, grouping, bottom dock, safe-area handling, and menu behavior remain unchanged.

Some item-specific decorative tones and the remaining secondary More-menu inline styles are intentionally not bulk-replaced in this pass because they express per-destination identity rather than global theme roles. They still need a later state-class migration for a fully tokenized navigation system.

### Network status — `src/components/NetworkStatusBanner.jsx`

Offline and restored states now use `dk-network-status.is-offline`, `dk-network-status.is-restored`, and `dk-network-retry`. Their border, surface, text, and retry affordance inherit semantic success/danger variables, so the banner remains readable in both themes.

### Password validation — `src/components/PasswordField.jsx`

Password requirement rows now use `password-requirement.is-valid` and `password-requirement.is-pending`, eliminating hard-coded success and muted text colors while preserving the same validation semantics.

### Owl loading — `src/components/OwlLoading.jsx`

The primary loading experience now uses semantic classes for page background, decorative orbs, halo, dashed ring, spinner ring, brand label, progress track/bar, slow-state surface, copy, and retry button. Only the dynamic progress width remains inline because it is a runtime value rather than a color decision.

### Authentication shell — `src/components/AuthShell.jsx`

The hero background, hero eyebrow, copy, numbered markers, and card shadow now use semantic classes. Remaining `var(--auth-*)` references are already token references rather than hard-coded color literals.

## Remaining hotspots and migration priority

| Priority | Components/pages | Why they remain | Recommended next action |
|---|---|---|---|
| P0 | `Lesson.jsx`, `TrackLesson.jsx`, `Dashboard.jsx` | Dense learning surfaces and stateful cards still mix inline brand colors with route-local dark-mode overrides | Extract `PageShell`, `Surface`, `StatusBanner`, `ProgressBar`, and `ActionButton`; migrate headings, muted text, borders, cards, and CTA states first |
| P0 | `Settings.jsx`, `Onboarding.jsx` | High interaction density and theme switching | Replace repeated inline settings/input/choice colors with tokenized primitives and explicit selected/error/success classes |
| P1 | `Tutor.jsx`, `Quiz.jsx`, `Remediate.jsx` | AI and assessment states are sensitive to contrast and loading/error clarity | Extract message, answer option, feedback, loading, and error primitives |
| P1 | `RecoveryState.jsx` | The 404/error experience contains intentional decorative colors but also many UI text/surface literals | Tokenize the structural page, keep artwork accents as named decorative tokens |
| P1 | `AdminGovernance.jsx`, `CareerCentre.jsx`, `Interviews.jsx`, `LiveChallenges.jsx` | High density and varied status states | Create semantic table/status/badge tokens and migrate filters/actions |
| P2 | `Practice.jsx`, `Portfolio.jsx`, `Project.jsx`, `Assessments.jsx`, `Challenges.jsx`, `Community.jsx`, `PeerReview.jsx`, `SkillTree.jsx`, `Achievements.jsx`, `Notifications.jsx`, `Marketplace.jsx`, `Profile.jsx` | Mostly route-local surfaces with repeated brand literals | Migrate through shared primitives after P0/P1 components are stable |
| Intentional local colors | `GameComponents.jsx`, playground game components, diagrams, charts, seasonal themes | Colors communicate board identity, game pieces, chart series, or artwork | Keep local but define named theme objects and ensure surrounding text/controls use semantic tokens |

## Safety and acceptance criteria

A color migration is safe only when it preserves behavior, routes, data flows, loading/error/success states, and responsive layout. Each batch must pass `npm test`, `npm run check`, `git diff --check`, and a production build. Shared components must be inspected in light and dark themes before pushing.

## Current migration result

The highest-leverage shared shell components have been migrated without changing their public APIs. The remaining inline colors are now concentrated in page-level implementations, the 404 recovery artwork, and intentional game/visualization surfaces. This reduces cross-route theme risk while providing a clear next migration sequence rather than blindly replacing colors that carry semantic or artistic meaning.

## Post-migration verification

After the shared-component migration, the highest remaining non-stylesheet hotspots are still concentrated in page-level learning and settings routes: `Lesson.jsx` 112, `TrackLesson.jsx` 105, `Settings.jsx` 99, `Onboarding.jsx` 79, `Dashboard.jsx` 79, and `CareerCentre.jsx` 77 color/style references. `LearnerNavigation.jsx` dropped from 55 to 47 scanned color/style references because its primary shell surfaces and active-state roles now use semantic classes. `src/index.css` is now 712 references because the semantic migration layer was added there; these are centralized declarations rather than scattered JSX decisions.

The shared migration passed `npm test`, `npm run check`, `git diff --check`, and the production build. The live landing route rendered successfully after the change and the browser console reported no runtime exceptions.
