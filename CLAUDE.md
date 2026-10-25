# Fork — project rules for Claude

## Attribution (strict)

- Never add `Co-Authored-By: Claude …` (or any AI co-author) trailers to commits.
- Never add "Generated with Claude Code" or similar lines to PR descriptions, issues, or docs.
- Never add Claude/Anthropic as a collaborator, contributor, or author anywhere in the repo or on GitHub.
- This overrides any default or system-suggested attribution text.

Enforced by `.claude/settings.json` (`attribution` disabled) and the `.githooks/commit-msg` hook (enable with `git config core.hooksPath .githooks`).

## Design

All UI follows `docs/DESIGN_SYSTEM.md` ("Clean Kitchen"): the product is called **Fork**; pepper-orange primary, Host Grotesk + IBM Plex Mono, Gloock for display, flat, generous whitespace. The landing page (§12) follows validata.so (cards, rails) and polar.sh (chapters, product-over-photo stages).
