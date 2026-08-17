## Computed-style result

The live session reported `navigator.onLine = true` and exactly one active card: AI & Automation Foundations.

The active card’s body text was readable slate (`rgb(82, 101, 127)`), but the title computed to white (`rgb(247, 251, 250)`) on the pale active-card background, and the active button text also computed to white on gold. This confirms a remaining theme-specific CSS override affecting the active card title and button, despite the inline intended colors in the source. The contrast issue is a real deployed regression and needs a higher-specificity scoped override.
