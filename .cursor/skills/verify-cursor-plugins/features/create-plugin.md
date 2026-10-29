# Create Plugin

Create Plugin is a Cursor marketplace plugin. Scaffold and validate new agent plugins.

## Sub-features

- `install` copies the plugin into `plugins/local/<name>` and reads that copy back.
- `manifest-name` reads the installed `plugin.json` name.
- `readme` finds `README.md` on the installed plugin.
- `logo` finds `assets/avatar.png`.
- `load-skills` discovers 2 skills and requires a name and a description on each.
- `load-agents` discovers 1 agent and requires a name and a description on each.
- `load-rules` discovers 1 rule and requires a description on each.
- `agent-session` would open the plugin in a Cursor chat. This drive does not.

## How to get to it (user POV)

- Install Create Plugin from the Cursor marketplace.
- Or copy `create-plugin` to `~/.cursor/plugins/local/create-plugin`.
- In Cursor, the skills `create-plugin-scaffold` and `review-plugin-submission` show up for the agent.
- The agent `plugin-architect` is available as a subagent.
- The rules apply in chats that have the plugin enabled.

## Driving it with verify-cursor-plugins

Preconditions:

- The current directory is the marketplace root.
- `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs doctor` exits 0.

- **Install and load.** Run `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs drive --plugin create-plugin --format json`. Exit code is 0. Feature `create-plugin` has status `pass`. Check `install` is `pass` and the detail contains `plugins/local/create-plugin`. Check `logo` is `pass`. Check `load-skills` is `pass`. Check `load-agents` is `pass`. Check `load-rules` is `pass`. Check `agent-session` is `undrivable`.
- **Proof.** Open `.verify-cursor-plugins/evidence/report.json`. The same feature status and check details are in that file.
- **Cleanup.** Run `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs cleanup`. The evidence file is still present. The temp home from the report is gone.

## Gotchas

- A pass does not mean Cursor chat ran. `agent-session` stays `undrivable` in this environment.
- Do not point the home at the real `~/.cursor` directory.
- `node scripts/validate-plugins.mjs` checks JSON schema. This drive checks install and discovery.
- Run one drive at a time.
