# Ralph Loop

Ralph Loop is a Cursor marketplace plugin. Iterative self-referential AI loops using the Ralph Wiggum technique.

## Sub-features

- `install` copies the plugin into `plugins/local/<name>` and reads that copy back.
- `manifest-name` reads the installed `plugin.json` name.
- `readme` finds `README.md` on the installed plugin.
- `logo` finds `assets/avatar.png`.
- `load-skills` discovers 3 skills and requires a name and a description on each.
- `load-hooks` parses the installed hooks file and checks that each command's script exists.
- `hook-syntax` runs `bash -n` on installed shell hooks. It does not execute them.
- `hook-fire` would let Cursor run the hook. This drive does not.
- `agent-session` would open the plugin in a Cursor chat. This drive does not.

## How to get to it (user POV)

- Install Ralph Loop from the Cursor marketplace.
- Or copy `ralph-loop` to `~/.cursor/plugins/local/ralph-loop`.
- In Cursor, the skills `cancel-ralph`, `ralph-loop`, and `ralph-loop-help` show up for the agent.
- Cursor runs the hook on `afterAgentResponse` and `stop`.

## Driving it with verify-cursor-plugins

Preconditions:

- The current directory is the marketplace root.
- `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs doctor` exits 0.

- **Install and load.** Run `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs drive --plugin ralph-loop --format json`. Exit code is 0. Feature `ralph-loop` has status `pass`. Check `install` is `pass` and the detail contains `plugins/local/ralph-loop`. Check `logo` is `pass`. Check `load-skills` is `pass`. Check `load-hooks` is `pass`. Check `hook-syntax` is `pass`. Check `hook-fire` is `undrivable`. Check `agent-session` is `undrivable`.
- **Proof.** Open `.verify-cursor-plugins/evidence/report.json`. The same feature status and check details are in that file.
- **Cleanup.** Run `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs cleanup`. The evidence file is still present. The temp home from the report is gone.

## Gotchas

- A pass does not mean Cursor chat ran. `agent-session` stays `undrivable` in this environment.
- Do not point the home at the real `~/.cursor` directory.
- `node scripts/validate-plugins.mjs` checks JSON schema. This drive checks install and discovery.
- Run one drive at a time.
- Hook commands are not executed. `hook-fire` stays `undrivable`.
- The stop hook can delete `.cursor/ralph/scratchpad.md` when it runs. This drive uses `bash -n` and does not execute the hook.
