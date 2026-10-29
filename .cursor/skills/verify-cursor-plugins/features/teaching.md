# Teaching

Teaching is a Cursor marketplace plugin. Skill mapping, practice plans, and learning retrospectives.

## Sub-features

- `install` copies the plugin into `plugins/local/<name>` and reads that copy back.
- `manifest-name` reads the installed `plugin.json` name.
- `readme` finds `README.md` on the installed plugin.
- `logo` finds `assets/avatar.png`.
- `load-skills` discovers 2 skills and requires a name and a description on each.
- `agent-session` would open the plugin in a Cursor chat. This drive does not.

## How to get to it (user POV)

- Install Teaching from the Cursor marketplace.
- Or copy `teaching` to `~/.cursor/plugins/local/teaching`.
- In Cursor, the skills `create-learning-path` and `run-learning-retrospective` show up for the agent.

## Driving it with verify-cursor-plugins

Preconditions:

- The current directory is the marketplace root.
- `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs doctor` exits 0.

- **Install and load.** Run `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs drive --plugin teaching --format json`. Exit code is 0. Feature `teaching` has status `pass`. Check `install` is `pass` and the detail contains `plugins/local/teaching`. Check `logo` is `pass`. Check `load-skills` is `pass`. Check `agent-session` is `undrivable`.
- **Proof.** Open `.verify-cursor-plugins/evidence/report.json`. The same feature status and check details are in that file.
- **Cleanup.** Run `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs cleanup`. The evidence file is still present. The temp home from the report is gone.

## Gotchas

- A pass does not mean Cursor chat ran. `agent-session` stays `undrivable` in this environment.
- Do not point the home at the real `~/.cursor` directory.
- `node scripts/validate-plugins.mjs` checks JSON schema. This drive checks install and discovery.
- Run one drive at a time.
