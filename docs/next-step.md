# Next engineering step

The browser renderer and playable controller now exist. The next stage is not a
renderer import; it is consolidation of the playable draft into a stable public
release.

Priorities:

1. finish the curated engine-verified demo and teaching explanations;
2. connect the tested WebSocket protocol to real lobby UI, then perform a
   security review before any public deployment;
3. migrate critical browser controller/UI modules from JavaScript to strict
   TypeScript without weakening the existing engine rules;
4. add replay navigation, finalize unresolved 3D special-move rules and expand
   interaction E2E coverage;
5. run the desktop release matrix, verify the generated packages and add signing
   only when owner-controlled certificates are available.

The detailed source of truth is
[`docs/tasks/major-playability-product-upgrade.md`](tasks/major-playability-product-upgrade.md).
