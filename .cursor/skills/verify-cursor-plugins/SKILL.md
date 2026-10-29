---
name: verify-cursor-plugins
description: "Install and load marketplace plugins the way a Cursor user does, then report pass, fail, or undrivable per plugin. Use when a change in this repo needs proof that a plugin installs, and that its skills, agents, rules, hooks, or MCP config are discovered. Use after editing marketplace.json, plugin.json, or a plugin's skills, agents, rules, hooks, or mcp.json."
---

# Verify cursor plugins

A user installs a plugin from this marketplace and Cursor loads its skills, agents, rules, hooks, and MCP servers. This skill drives that install and load. It does not open a Cursor chat, fire a hook, or call an MCP server. Those checks stay `undrivable`.

Read [features/README.md](features/README.md), then the feature file for the plugin you changed. Drive every plugin when the change touches `marketplace.json` or shared loader behavior.

## Launch

There is no server to start and nothing to install. From the marketplace root, confirm the checkout can be driven.

```bash
node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs doctor
```

Ready means that command prints `ok` and exits 0. `plugins` is the number of marketplace entries. `cursorBinary` is `false` when `cursor` is not on `PATH`.

Run one drive at a time. The evidence file and the temp home are single-writer.

The temp home is `verify-cursor-plugins/home` under the OS temp directory. Inside it, each plugin is copied to `.cursor/plugins/local/<name>`, which is the local install path from `create-plugin`. The real `~/.cursor` directory is never written.

## Doctor

Run doctor before the first drive, and again after a drive fails.

```bash
node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs doctor --format json
```

Doctor is read-only. It checks that `.cursor-plugin/marketplace.json` parses, each source directory exists, and each source has `.cursor-plugin/plugin.json`. It does not install a plugin. Exit 0 means the checkout is worth driving. Exit 1 means it is not. The JSON `problems` array says why.

## Drive

`drive` deletes the temp home, copies each selected plugin into `.cursor/plugins/local/<name>`, and reads that copy back.

```bash
node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs drive --plugin teaching --format json
node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs drive --format json
```

Repeat `--plugin` to drive a few plugins. Omit it to drive every marketplace entry, in marketplace order.

Exit 0 means every driven check passed. `undrivable` checks do not fail the run. Exit 1 means a driven check failed. Exit 2 means the command was wrong. A usage error names a command you can copy.

`--dry-run` installs, loads, and prints the same report. It does not write the evidence file, and it removes its own temp home before it returns.

```bash
node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs drive --plugin gmail --dry-run --format json
```

Discovery uses the installed tree.

- Skills are `skills/<name>/SKILL.md`, one directory deep, and need frontmatter `name` and `description`. Names may contain spaces. `Poteto Mode` and `X MCP guide` are valid.
- Agents are `agents/*.md` and need `name` and `description`.
- Rules are `rules/*.md` or `rules/*.mdc` and need `description`.
- Commands are `commands/*.md` or `commands/*.txt` and need `name` and `description`.
- Hooks are `hooks/hooks.json`. Each command's script must exist inside the plugin. Shell scripts also get `bash -n`. The hook is not executed.
- MCP config is `mcp.json`. Each server needs a `url` or a `command`. The server is not called.

A manifest path must stay inside the plugin. `..` and absolute paths fail the load. A declared path with no files fails the load. A skill, agent, or command with no description fails the load.

`list` prints the same component counts without installing. It is not proof.

```bash
node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs list --format json
```

## Evidence

`drive` writes `.verify-cursor-plugins/evidence/report.json` after the installs succeed or fail. `--dry-run` skips that write.

The report's `features` array has one object per plugin. `status` is `pass` or `fail`. Each `checks` entry is `pass`, `fail`, or `undrivable`. Assert the check id and its `detail`. The install detail contains `plugins/local/<name>`.

Capture the command, the exit code, and the report. A screenshot of the final screen is not the proof. The report is.

These checks are `undrivable` on every successful drive that reaches them.

- `agent-session` on every plugin. This environment has no `cursor` binary, so no chat is started.
- `hook-fire` when the plugin has hooks. The command is not executed.
- `call-mcp` when the plugin has MCP config. The URL or command is not called, because that needs user auth and hits a live service.

Do not report those as verified. `node scripts/validate-plugins.mjs` still owns JSON Schema. This drive does not replace it.

## Cleanup

Cleanup reads `home` from the evidence file and removes that directory when it is the temp home. It leaves the evidence file in place.

```bash
node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs cleanup
```

Run cleanup after every drive, including a failed one. Then check that `.verify-cursor-plugins/evidence/report.json` still exists. A cleanup that deletes the report has failed.

The evidence directory is gitignored.

## Helpers

The executable is `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs`.

- `doctor` checks that the checkout can be driven. It does not install.
- `list` prints component counts from the checkout. It does not install.
- `drive` installs into the temp home and loads the copy.
- `cleanup` removes the temp home and keeps the evidence file.
- `features --check` exits 1 when a feature file does not match the generator.
- `features --write` regenerates `features/` from the marketplace.

Each command has `--help` with examples. `--format json` is the form to assert. `--format text` is the form to read in a terminal.

```bash
node --test .cursor/skills/verify-cursor-plugins/lib/verify.test.mjs
```

When a plugin is added or a component set changes, run `features --write` and commit the feature files with the plugin change. `features --check` fails while they differ.

## Maintenance

When the marketplace changes, run [maintain-verification-skill](../../../pstack/skills/maintain-verification-skill/SKILL.md). Keep this skill's directory as the only edit. A behavior the map describes that `drive` no longer reports is either a map fix or a real regression. Do not weaken a feature file to make a drive pass.
