# Agent Compatibility

Agent Compatibility is a Cursor marketplace plugin. CLI-backed repo compatibility scans plus agents that audit startup, validation, and docs against reality.

## Sub-features

- `install` copies the plugin into `plugins/local/<name>` and reads that copy back.
- `manifest-name` reads the installed `plugin.json` name.
- `readme` finds `README.md` on the installed plugin.
- `logo` finds `assets/avatar.png`.
- `load-skills` discovers 1 skill and requires a name and a description on each.
- `load-agents` discovers 4 agents and requires a name and a description on each.
- `agent-session` would open the plugin in a Cursor chat. This drive does not.

## How to get to it (user POV)

- Install Agent Compatibility from the Cursor marketplace.
- Or copy `agent-compatibility` to `~/.cursor/plugins/local/agent-compatibility`.
- In Cursor, the skill `check-agent-compatibility` shows up for the agent.
- The agents `compatibility-scan-review`, `docs-reliability-review`, `startup-review`, and `validation-review` are available as subagents.

## Driving it with verify-cursor-plugins

Preconditions:

- The current directory is the marketplace root.
- `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs doctor` exits 0.

- **Install and load.** Run `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs drive --plugin agent-compatibility --format json`. Exit code is 0. Feature `agent-compatibility` has status `pass`. Check `install` is `pass` and the detail contains `plugins/local/agent-compatibility`. Check `logo` is `pass`. Check `load-skills` is `pass`. Check `load-agents` is `pass`. Check `agent-session` is `undrivable`.
- **Proof.** Open `.verify-cursor-plugins/evidence/report.json`. The same feature status and check details are in that file.
- **Cleanup.** Run `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs cleanup`. The evidence file is still present. The temp home from the report is gone.

## Gotchas

- A pass does not mean Cursor chat ran. `agent-session` stays `undrivable` in this environment.
- Do not point the home at the real `~/.cursor` directory.
- `node scripts/validate-plugins.mjs` checks JSON schema. This drive checks install and discovery.
- Run one drive at a time.
- The scanner is the published `npx -y agent-compatibility@latest` package. This drive does not run it.
