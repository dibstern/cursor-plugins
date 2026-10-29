# Cursor SDK

Cursor SDK is a Cursor marketplace plugin. Build apps, scripts, and automations with the TypeScript SDK.

## Sub-features

- `install` copies the plugin into `plugins/local/<name>` and reads that copy back.
- `manifest-name` reads the installed `plugin.json` name.
- `readme` finds `README.md` on the installed plugin.
- `load-skills` discovers 1 skill and requires a name and a description on each.
- `agent-session` would open the plugin in a Cursor chat. This drive does not.

## How to get to it (user POV)

- Install Cursor SDK from the Cursor marketplace.
- Or copy `cursor-sdk` to `~/.cursor/plugins/local/cursor-sdk`.
- In Cursor, the skill `cursor-sdk` shows up for the agent.

## Driving it with verify-cursor-plugins

Preconditions:

- The current directory is the marketplace root.
- `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs doctor` exits 0.

- **Install and load.** Run `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs drive --plugin cursor-sdk --format json`. Exit code is 0. Feature `cursor-sdk` has status `pass`. Check `install` is `pass` and the detail contains `plugins/local/cursor-sdk`. Check `load-skills` is `pass`. Check `agent-session` is `undrivable`.
- **Proof.** Open `.verify-cursor-plugins/evidence/report.json`. The same feature status and check details are in that file.
- **Cleanup.** Run `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs cleanup`. The evidence file is still present. The temp home from the report is gone.

## Gotchas

- A pass does not mean Cursor chat ran. `agent-session` stays `undrivable` in this environment.
- Do not point the home at the real `~/.cursor` directory.
- `node scripts/validate-plugins.mjs` checks JSON schema. This drive checks install and discovery.
- Run one drive at a time.
