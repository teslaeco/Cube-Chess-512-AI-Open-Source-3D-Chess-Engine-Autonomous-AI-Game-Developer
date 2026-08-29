# CODEX TASK — Cube Chess native ForgeMCP integration

Repository: teslaeco/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer
Branch: forgemcp-native-integration

Goal: complete the ForgeMCP WebMCP Challenge integration in the existing Cube Chess 512 public application without breaking the deterministic game engine or existing UI.

## Required implementation

1. Audit current branch/main including merged PR #110.
2. Add a real native **ForgeMCP** item to the existing start menu in `web/ui/GameHud.js` (or a clean integrated component). It must look and behave like a first-class menu section, not only a floating link.
3. The ForgeMCP panel must explain:
   - ForgeMCP — Multi-Agent Research & Game Studio;
   - Cube Chess 512 is a pre-existing deterministic 8×8×8 / 512-field laboratory; ForgeMCP is new WebMCP Challenge work;
   - architecture: HUMAN → GAME COORDINATOR → AI TRAINER / RULES ENGINEER / VISUAL AGENT / QA → WEBMCP TOOLS → CUBE RULE ENGINE → EXECUTED EXPERIMENT → VERIFICATION → HUMAN DECISION;
   - target self-play flow: BASELINE AI vs CANDIDATE AI → legal games → stored moves/results → analyze errors → compare policies → retest → benchmark → legality/regression checks → human review → PROMOTE or REJECT;
   - self-play alone is not proof of improvement;
   - do not fabricate game counts, wins/losses, Elo, benchmarks or training results;
   - deterministic rules engine remains the source of truth;
   - current truthful state: ForgeMCP WebMCP foundation exists; initial/read-only Cube inspection boundary exists at framework level; full self-play WebMCP tournament workflow is not yet fully connected; promotion gate and human approval model exist in ForgeMCP.
4. Add links to:
   - https://github.com/Terraforming-Planet/ForgeMCP-Multi-Agent-Research---Game-Studio
   - the existing Cube `/forgemcp/` page;
   - Terra Observation System: https://terraforming-planet.github.io/Polar-Sun-Moon-Analysis/
5. Preserve current translations. At minimum English must display correctly; if new translation keys are added, provide safe fallback so other languages do not break.
6. Keep the existing `/forgemcp/` public page working and cross-link Cube, ForgeMCP and Terra if missing.
7. Update the existing `README.md` near the top. DO NOT replace, shorten or delete existing content. Add section:

   `## ForgeMCP — Multi-Agent Research & Game Studio`

   Explain that Cube predates the Challenge. Its ForgeMCP role is **LEARN & COMPETE + CREATE**. Explain controlled baseline-vs-candidate evaluation, legal games, measurable metrics, regression/legality gates and human-controlled promotion. Do not describe historical policy tuning as neural-network training. Include ForgeMCP repo, Cube `/forgemcp/`, and Terra links.
8. Preserve all existing game functionality: new game, saves, online, settings, accessibility, multiplayer, AI, renderer, PWA, undo/redo.
9. ZERO secrets. Do not modify credentials, `.env`, API keys or tokens.

## Verification

Use existing project commands. At minimum run `npm ci`, type-check, tests and production build if scripts are available. Run smoke/E2E if practical in the existing CI environment; do not fake skipped results.

Do not modify this brief or `.github/workflows/forgemcp-native-one-shot.yml`.

Finish with a clean implementation on this branch. Do not merge main yourself; the caller will open/merge the PR after required CI passes.