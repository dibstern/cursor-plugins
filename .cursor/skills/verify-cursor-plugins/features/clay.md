# Clay

Clay is a Cursor marketplace plugin. Enrich people and companies, run AI research agents.

## Sub-features

- `install` copies the plugin into `plugins/local/<name>` and reads that copy back.
- `manifest-name` reads the installed `plugin.json` name.
- `readme` finds `README.md` on the installed plugin.
- `logo` finds `assets/logo.png`.
- `load-mcp` parses the installed MCP config and lists each server.
- `call-mcp` would call the MCP server. This drive does not.
- `agent-session` would open the plugin in a Cursor chat. This drive does not.

## How to get to it (user POV)

- Install Clay from the Cursor marketplace.
- Or copy `third_party/clay` to `~/.cursor/plugins/local/clay`.
- Connect `clay` when Cursor asks you to sign in. Then ask the agent to use that service.

## Driving it with verify-cursor-plugins

Preconditions:

- The current directory is the marketplace root.
- `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs doctor` exits 0.

- **Install and load.** Run `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs drive --plugin clay --format json`. Exit code is 0. Feature `clay` has status `pass`. Check `install` is `pass` and the detail contains `plugins/local/clay`. Check `logo` is `pass`. Check `load-mcp` is `pass`. Check `call-mcp` is `undrivable`. Check `agent-session` is `undrivable`.
- **Proof.** Open `.verify-cursor-plugins/evidence/report.json`. The same feature status and check details are in that file.
- **Cleanup.** Run `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs cleanup`. The evidence file is still present. The temp home from the report is gone.

## Gotchas

- A pass does not mean Cursor chat ran. `agent-session` stays `undrivable` in this environment.
- Do not point the home at the real `~/.cursor` directory.
- `node scripts/validate-plugins.mjs` checks JSON schema. This drive checks install and discovery.
- Run one drive at a time.
- MCP URLs and commands are not called. `call-mcp` stays `undrivable`.
