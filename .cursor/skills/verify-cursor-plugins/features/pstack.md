# pstack

pstack is a Cursor marketplace plugin. if you want to go fast, go deep first. pstack helps you write less, but higher quality code. rigorous agent workflows you can parallelize with confidence.

## Sub-features

- `install` copies the plugin into `plugins/local/<name>` and reads that copy back.
- `manifest-name` reads the installed `plugin.json` name.
- `readme` finds `README.md` on the installed plugin.
- `load-skills` discovers 44 skills and requires a name and a description on each.
- `load-agents` discovers 2 agents and requires a name and a description on each.
- `agent-session` would open the plugin in a Cursor chat. This drive does not.

## How to get to it (user POV)

- Install pstack from the Cursor marketplace.
- Or copy `pstack` to `~/.cursor/plugins/local/pstack`.
- In Cursor, the skills `Poteto Mode`, `architect`, `arena`, `automate-me`, `blast-radius`, and `bro`, plus 38 more show up for the agent.
- The agents `Comment Sicko` and `poteto-agent` are available as subagents.

## Driving it with verify-cursor-plugins

Preconditions:

- The current directory is the marketplace root.
- `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs doctor` exits 0.

- **Install and load.** Run `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs drive --plugin pstack --format json`. Exit code is 0. Feature `pstack` has status `pass`. Check `install` is `pass` and the detail contains `plugins/local/pstack`. Check `load-skills` is `pass`. Check `load-agents` is `pass`. Check `agent-session` is `undrivable`.
- **Proof.** Open `.verify-cursor-plugins/evidence/report.json`. The same feature status and check details are in that file.
- **Cleanup.** Run `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs cleanup`. The evidence file is still present. The temp home from the report is gone.

## Gotchas

- A pass does not mean Cursor chat ran. `agent-session` stays `undrivable` in this environment.
- Do not point the home at the real `~/.cursor` directory.
- `node scripts/validate-plugins.mjs` checks JSON schema. This drive checks install and discovery.
- Run one drive at a time.
- SKILL.md files under `pstack/automations/` sit outside `skills/`. They do not load as plugin skills. `setup-benny` is one of them.
