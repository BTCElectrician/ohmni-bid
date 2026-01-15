# AGENTS - Ohmni Bid (Next Stack)

Agent instructions for this repo.

## Global rules

1. No menus or option lists. Pick the best default and proceed.
2. Do not ask the user to choose between options. Only ask if blocked by missing info or permissions.
3. Default to coverage. Scan all relevant files, not just the first match.
4. Keep changes minimal, testable, and reversible.
5. Never write or expose secrets.
6. Avoid creating or expanding any single file beyond ~500 lines; split into modules when needed.
7. Actively reduce redundancy and duplication; favor shared helpers over copy/paste.

## Agent-first documentation rules

- Design for agent-orchestrated workflows: keep configs, run state, and decisions discoverable and modular.
- Maintain the model registry in `docs/models/README.md` and per-model profiles in `docs/models/profiles/`.
- Keep benchmark run catalogs in `docs/projects/*/MODEL_CONFIGS.md` and update them when new runs are added.
- Retire models by moving them to Deprecated or Retired in the registry; keep profiles for history.
- Treat run packets as immutable artifacts; link to them instead of editing their contents.
- Use each project `STATUS.md` as the agent handoff/progress file and keep it current.

## Repo layout

- New stack lives at the repo root.
- Legacy codebase is preserved under `legacy/` and should not be modified unless explicitly requested.
