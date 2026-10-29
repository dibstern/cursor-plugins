# Cursor Team Kit

Cursor Team Kit is a Cursor marketplace plugin. Internal team workflows for CI, code review, shipping, local automation, and verification.

## Sub-features

- `install` copies the plugin into `plugins/local/<name>` and reads that copy back.
- `manifest-name` reads the installed `plugin.json` name.
- `readme` finds `README.md` on the installed plugin.
- `logo` finds `assets/avatar.png`.
- `load-skills` discovers 18 skills and requires a name and a description on each.
- `load-agents` discovers 2 agents and requires a name and a description on each.
- `load-rules` discovers 2 rules and requires a description on each.
- `agent-session` would open the plugin in a Cursor chat. This drive does not.

## How to get to it (user POV)

- Install Cursor Team Kit from the Cursor marketplace.
- Or copy `cursor-team-kit` to `~/.cursor/plugins/local/cursor-team-kit`.
- In Cursor, the skills `check-compiler-errors`, `control-cli`, `control-ui`, `deslop`, `fix-ci`, and `fix-merge-conflicts`, plus 12 more show up for the agent.
- The agents `ci-watcher` and `thermo-nuclear-code-quality-review` are available as subagents.
- The rules apply in chats that have the plugin enabled.

## Driving it with verify-cursor-plugins

Preconditions:

- The current directory is the marketplace root.
- `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs doctor` exits 0.

- **Install and load.** Run `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs drive --plugin cursor-team-kit --format json`. Exit code is 0. Feature `cursor-team-kit` has status `pass`. Check `install` is `pass` and the detail contains `plugins/local/cursor-team-kit`. Check `logo` is `pass`. Check `load-skills` is `pass`. Check `load-agents` is `pass`. Check `load-rules` is `pass`. Check `agent-session` is `undrivable`.
- **Proof.** Open `.verify-cursor-plugins/evidence/report.json`. The same feature status and check details are in that file.
- **Cleanup.** Run `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs cleanup`. The evidence file is still present. The temp home from the report is gone.

## Gotchas

- A pass does not mean Cursor chat ran. `agent-session` stays `undrivable` in this environment.
- Do not point the home at the real `~/.cursor` directory.
- `node scripts/validate-plugins.mjs` checks JSON schema. This drive checks install and discovery.
- Run one drive at a time.
- Skills `control-cli`, `control-ui`, and `verify-this` ship inside this plugin. They do not verify the marketplace repo. Use `verify-cursor-plugins` for that.
