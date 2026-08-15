# DataKwest Workspace Navigation Redesign Plan

## Goal

Redesign the authenticated learner experience so the main workspace is focused and breathable instead of stacking every product area as full-width cards. The new experience will use a persistent, thumb-friendly bottom navigation system inspired by the information hierarchy of Duolingo while preserving DataKwest’s professional GitHub-inspired visual identity, career-operating-system positioning, existing React/Vite architecture, Supabase authorization model, and current route destinations.

## Product interpretation

The dashboard should become the learner’s home base rather than a directory of every feature. It should prioritize the learner’s selected career path, current lesson or mission, progress, streak, XP, and one or two next-best actions. Secondary destinations such as Assessment Center, Practice Engine, Projects, Community, Skill Battles, Marketplace, Career Centre, Interviews, Achievements, and Notifications should be reachable from navigation rather than consuming the primary scroll.

The mobile navigation will use a compact fixed bottom bar with five high-value destinations: **Home**, **Learn**, **Practice**, **Community**, and **Career**. A central or visually emphasized action can represent the learner’s next recommended activity. A **More** destination will open a polished bottom sheet or expandable navigation tray for Assessment Center, Projects, Skill Battles, Marketplace, Interviews, Achievements, Notifications, and account settings. On larger screens, the same information architecture will become a slim top/side navigation treatment rather than a permanently oversized mobile bar.

## Design direction

The visual language will be a distinctive **Career Quest navigation system**: DataKwest navy as the structural color, gold for achievement and active progress, teal/mint for practice and mastery, lavender for assessment, and controlled accent colors for community and career features. Navigation icons will be clear line icons with compact labels, active-state pills or elevated icon wells, and restrained micro-interactions. The owl mascot will appear selectively as a small guide or progress accent, not as a persistent obstruction.

The redesign will use generous content padding above the navigation safe area, a translucent or solid elevated bottom bar, rounded active states, and a clear visual separation between navigation and page content. It will support `env(safe-area-inset-bottom)` for modern phones, maintain a minimum touch target of approximately 44px, preserve visible keyboard focus, and respect `prefers-reduced-motion`.

## Implementation phases

### Phase 1: Audit the current navigation and dashboard composition

Read the existing `Navbar`, dashboard/workspace page, route definitions, and all feature cards visible in the supplied screenshot. Build a route-to-destination map so every existing destination has one intentional navigation home. Identify duplicated links, feature cards that should become dashboard summaries, and any route that must remain protected by the current authentication wrapper.

Confirm whether the existing `Navbar` is used globally or only on authenticated pages. Preserve its sign-out, user identity, streak, and XP behavior while separating global account actions from learner navigation. Do not change Supabase RPCs, scoring, XP, readiness calculations, or backend authorization.

### Phase 2: Create reusable navigation primitives

Create a reusable authenticated navigation shell, likely consisting of:

- A `LearnerBottomNav` component for mobile widths.
- A `LearnerDesktopNav` or responsive variant for tablet and desktop widths.
- A `MoreNavigationSheet` or equivalent accessible bottom sheet for secondary destinations.
- A shared route metadata map containing destination label, icon, route, accent color, and optional badge count.
- A `PageSafeArea` or layout wrapper that prevents content from being hidden behind the fixed bottom navigation.

The active destination will derive from the current React Router location, not from client-side feature state. Navigation clicks will use existing routes and will not bypass `Protected` boundaries. Placeholder destinations will not be invented; every item will point to an existing route or be explicitly marked for later approval.

### Phase 3: Recompose the learner workspace

Refactor the workspace/dashboard page so the long vertical sequence of full-width feature cards is replaced by a focused hierarchy:

1. A compact greeting and learner identity header.
2. The active career path and current phase.
3. A prominent **Continue learning** or **Next best action** card.
4. A concise progress snapshot covering phases, readiness, streak, and XP.
5. A small horizontal or grid-based quick-access area only for the most relevant actions.
6. Optional recent activity or recommended mission content.

Assessment Center, Practice Engine, Projects, Community, and other areas will no longer appear as large consecutive cards by default. Their content will remain accessible through the bottom navigation and More tray. If product value requires a dashboard preview, it will be reduced to a compact summary tile with a clear route action.

### Phase 4: Add interaction and responsive polish

Implement active-state animation, press feedback, icon-label transitions, and an accessible More sheet. Motion will be short and interruptible, with reduced-motion fallbacks. The bottom bar will remain usable at 320px and 360px widths by using five compact destinations, shortened labels where needed, and a More tray for overflow.

Validate that long page content can scroll behind the navigation without being obscured, that inputs and buttons remain reachable above the keyboard, and that the fixed navigation does not create horizontal overflow. Verify light backgrounds, contrast, focus rings, screen-reader labels, and the current brand logo treatment.

### Phase 5: QA, regression, and delivery

Add contract tests covering route metadata, protected destination links, active-route behavior, the More tray entries, and the safe-area layout classes. Run the existing full test suite, production build, whitespace validation, and mobile viewport checks at 320px, 360px, 390px, 414px, 768px, and desktop widths.

Manually verify the following journeys: opening Home, Learn, Practice, Community, Career, and More; opening and closing the More tray; navigating from each existing dashboard feature; refreshing on a nested route; signing out; and using keyboard navigation. Confirm that backend RPC behavior and server-authoritative progress logic are unchanged.

Commit only the navigation and workspace UI changes, leave confidential PRD files and unrelated inherited artifacts unstaged, push to `main`, and provide the Vercel redeploy instruction.

## Important decisions

| Decision | Plan |
|---|---|
| Primary mobile navigation | Five destinations: Home, Learn, Practice, Community, Career |
| Overflow navigation | Accessible More bottom sheet/tray for secondary product areas |
| Desktop behavior | Responsive top/side treatment using the same destination map rather than a large mobile bar |
| Dashboard content | Focused current-path and next-action experience; secondary feature cards become navigation destinations or compact summaries |
| Backend | No schema, RPC, scoring, XP, readiness, or RLS changes required |
| Authentication | Preserve existing protected routes and Supabase session behavior |
| Responsiveness | Mobile-first from 320px, safe-area aware, no horizontal overflow |
| Visual identity | DataKwest navy, gold, teal/mint, lavender, illustrated but professional, Duolingo-inspired hierarchy without copying its artwork |

## Assumptions and open risks

The plan assumes the existing React Router route structure is stable and that the screenshot represents the authenticated workspace/dashboard rather than a separate page. The exact five primary destinations may be adjusted after inspecting route usage and analytics if one destination is demonstrably lower priority. The More sheet will be preferred over adding a sixth or seventh item to the mobile bar because overcrowding would recreate the current problem.

The main implementation risk is that some existing feature cards may contain important status data rather than only navigation. Those data points will be preserved as compact summaries or moved into the relevant destination page rather than deleted. A second risk is viewport-specific overlap with the Android browser navigation area; this will be addressed through safe-area padding and physical-device testing.

## Definition of done

The learner can reach every existing authenticated product area from a clear navigation system, the workspace no longer presents a long stack of full-screen feature cards, the active destination is always obvious, the bottom navigation is usable at 320px and larger, the More tray is keyboard and screen-reader accessible, all existing route protection remains intact, the full regression suite and production build pass, and the changes are committed and pushed without exposing confidential project documents.
