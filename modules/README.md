# QUARANTINED — do not import, do not extend

This ESM tree (`modules/`, like `core/ diagram/ solver/`) is detached from the
shipped application and unrunnable (known duplicate-export breakage and drift
vs `js/main.js`). Nothing in the app imports it (verified by repo search).

- Canonical code: `js/main.js` (see `docs/decisions/ADR-004-monolith-canonical.md`).
- This directory is read-only reference for a future, owner-approved migration.
- New calculation code goes in pure functions per ADR-004, not here.
