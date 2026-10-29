import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const BIN =
  "node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs";

export const HEADINGS = [
  "Sub-features",
  "How to get to it (user POV)",
  "Driving it with verify-cursor-plugins",
  "Gotchas",
];

const EXTRA_GOTCHAS = {
  "cursor-team-kit":
    "Skills `control-cli`, `control-ui`, and `verify-this` ship inside this plugin. They do not verify the marketplace repo. Use `verify-cursor-plugins` for that.",
  "agent-compatibility":
    "The scanner is the published `npx -y agent-compatibility@latest` package. This drive does not run it.",
  orchestrate:
    "Using the orchestrate skill starts cloud agents. This drive does not start them.",
  "pr-review-canvas":
    "The canvas is built from a GitHub pull request. This drive does not call `gh`.",
  "docs-canvas":
    "Opening the canvas happens in Cursor. This drive does not open Cursor.",
  "continual-learning":
    "The stop hook's command is `bun run`. bun is not required here. The script file must exist, and the hook is not executed.",
  "ralph-loop":
    "The stop hook can delete `.cursor/ralph/scratchpad.md` when it runs. This drive uses `bash -n` and does not execute the hook.",
  pstack:
    "SKILL.md files under `pstack/automations/` sit outside `skills/`. They do not load as plugin skills. `setup-benny` is one of them.",
};

export function defaultHome(kind = "home") {
  if (kind === "dry-run") {
    return path.join(os.tmpdir(), "verify-cursor-plugins", "home-dry-run");
  }
  return path.join(os.tmpdir(), "verify-cursor-plugins", "home");
}

export function isSafeHome(home) {
  const tmp = fs.realpathSync(os.tmpdir());
  let resolved = path.resolve(home);
  if (fs.existsSync(resolved)) {
    try {
      resolved = fs.realpathSync(resolved);
    } catch {
      return false;
    }
  }
  const rel = path.relative(tmp, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return false;
  if (
    !/^verify-cursor-plugins\/(home|home-dry-run|runs\/[A-Za-z0-9._-]+)$/.test(
      rel,
    )
  ) {
    return false;
  }
  const userCursor = path.join(path.resolve(os.homedir()), ".cursor");
  if (resolved === userCursor || resolved.startsWith(userCursor + path.sep)) {
    return false;
  }
  return true;
}

export function parseFrontmatter(text) {
  const src = String(text).replace(/^\uFEFF/, "");
  if (!src.startsWith("---")) return { error: "missing frontmatter" };
  const end = src.indexOf("\n---", 3);
  if (end < 0) return { error: "unclosed frontmatter" };
  const block = src.slice(src.indexOf("\n") + 1, end);
  const lines = block.split(/\r?\n/);
  const data = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trimStart().startsWith("#")) {
      i += 1;
      continue;
    }
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      if (/^\s/.test(line)) {
        i += 1;
        continue;
      }
      return { error: `bad frontmatter line: ${line}` };
    }
    const key = match[1];
    const raw = match[2];
    if (raw === ">" || raw === ">-" || raw === "|" || raw === "|-") {
      const folded = raw.startsWith(">");
      const parts = [];
      i += 1;
      while (i < lines.length) {
        const next = lines[i];
        if (/^[A-Za-z0-9_-]+:\s*/.test(next)) break;
        if (next.trim() === "") {
          parts.push("");
          i += 1;
          continue;
        }
        if (!/^\s/.test(next)) break;
        parts.push(next.trim());
        i += 1;
      }
      const joined = folded
        ? parts.filter((part) => part !== "").join(" ")
        : parts.join("\n");
      data[key] = joined.trim();
      continue;
    }
    data[key] = unquote(raw.trim());
    i += 1;
  }
  return { data };
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
    (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
  ) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
  return value;
}

export function loadMarketplace(root) {
  const file = path.join(root, ".cursor-plugin", "marketplace.json");
  if (!fs.existsSync(file)) {
    return {
      error: `Missing ${path.relative(root, file) || file}. Run from the marketplace root.`,
    };
  }
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    return { error: `marketplace.json did not parse. ${err.message}` };
  }
  if (!Array.isArray(json.plugins)) {
    return { error: "marketplace.json has no plugins array." };
  }
  const plugins = [];
  const seen = new Set();
  const problems = [];
  for (const entry of json.plugins) {
    if (!entry || typeof entry.name !== "string" || typeof entry.source !== "string") {
      problems.push("A marketplace entry is missing name or source.");
      continue;
    }
    if (seen.has(entry.name)) problems.push(`Duplicate plugin name ${entry.name}.`);
    seen.add(entry.name);
    plugins.push({
      name: entry.name,
      source: entry.source,
      description: typeof entry.description === "string" ? entry.description : "",
    });
  }
  return { plugins, problems };
}

let cursorCached;

export function cursorOnPath() {
  if (cursorCached !== undefined) return cursorCached;
  cursorCached = (process.env.PATH || "")
    .split(path.delimiter)
    .filter(Boolean)
    .some((dir) => fs.existsSync(path.join(dir, "cursor")));
  return cursorCached;
}

export function doctor({ root, evidenceDir }) {
  const loaded = loadMarketplace(root);
  const problems = [];
  if (loaded.error) problems.push(loaded.error);
  else problems.push(...loaded.problems);
  const plugins = loaded.plugins ?? [];
  for (const plugin of plugins) {
    const dir = path.join(root, plugin.source);
    if (!fs.existsSync(dir)) {
      problems.push(`Plugin ${plugin.name} source ${plugin.source} does not exist.`);
      continue;
    }
    const manifest = path.join(dir, ".cursor-plugin", "plugin.json");
    if (!fs.existsSync(manifest)) {
      problems.push(`Plugin ${plugin.name} is missing .cursor-plugin/plugin.json.`);
    }
  }
  return {
    ok: problems.length === 0,
    exitCode: problems.length === 0 ? 0 : 1,
    root,
    plugins: plugins.length,
    cursorBinary: cursorOnPath(),
    evidenceDir,
    problems,
  };
}

export function listPlugins({ root }) {
  const loaded = loadMarketplace(root);
  if (loaded.error) {
    return { ok: false, exitCode: 1, message: loaded.error, plugins: [] };
  }
  const plugins = loaded.plugins.map((entry) => {
    const dir = path.join(root, entry.source);
    const inspection = fs.existsSync(dir)
      ? inspectPlugin(dir, entry.name)
      : null;
    return {
      name: entry.name,
      description: entry.description,
      skills: namesOf(inspection?.skills),
      agents: namesOf(inspection?.agents),
      rules: namesOf(inspection?.rules),
      commands: namesOf(inspection?.commands),
      hooks: inspection?.hooks ? inspection.hooks.events.map((event) => event.event) : [],
      mcp: inspection?.mcp ? inspection.mcp.servers.map((server) => server.name) : [],
    };
  });
  return { ok: loaded.problems.length === 0, exitCode: loaded.problems.length ? 1 : 0, plugins };
}

function namesOf(component) {
  if (!component || component.error) return [];
  return component.items.map((item) => item.name);
}

export function drive({ root, plugins, evidenceDir, dryRun = false, home }) {
  const loaded = loadMarketplace(root);
  if (loaded.error) {
    return {
      ok: false,
      exitCode: 1,
      dryRun,
      root,
      home: null,
      evidencePath: null,
      cursorBinary: cursorOnPath(),
      message: loaded.error,
      features: [],
    };
  }
  const selected = selectPlugins(loaded.plugins, plugins);
  if (selected.error) {
    return {
      ok: false,
      exitCode: 2,
      dryRun,
      root,
      home: null,
      evidencePath: null,
      cursorBinary: cursorOnPath(),
      message: selected.error,
      features: [],
    };
  }
  const runHome = home ?? defaultHome(dryRun ? "dry-run" : "home");
  if (!isSafeHome(runHome)) {
    return {
      ok: false,
      exitCode: 1,
      dryRun,
      root,
      home: runHome,
      evidencePath: null,
      cursorBinary: cursorOnPath(),
      message: `Refusing to install into ${runHome}.`,
      features: [],
    };
  }
  fs.rmSync(runHome, { recursive: true, force: true });
  fs.mkdirSync(runHome, { recursive: true });
  const features = [];
  for (const entry of selected.plugins) {
    features.push(driveOne(root, entry, runHome));
  }
  const ok = features.every((feature) => feature.status === "pass");
  const evidencePath = dryRun ? null : path.join(evidenceDir, "report.json");
  const report = {
    ok,
    exitCode: ok ? 0 : 1,
    dryRun,
    root,
    home: dryRun ? null : runHome,
    evidencePath,
    cursorBinary: cursorOnPath(),
    message: "",
    features,
  };
  if (!dryRun) writeEvidence(evidencePath, report);
  if (dryRun) fs.rmSync(runHome, { recursive: true, force: true });
  return report;
}

function selectPlugins(all, requested) {
  if (!requested || requested.length === 0) return { plugins: all };
  const plugins = [];
  for (const name of requested) {
    const found = all.find((entry) => entry.name === name);
    if (!found) {
      return {
        error: `Unknown plugin ${name}.\n${BIN} list --format json`,
      };
    }
    plugins.push(found);
  }
  return { plugins };
}

function driveOne(root, entry, home) {
  const source = path.join(root, entry.source);
  const dest = path.join(home, ".cursor", "plugins", "local", entry.name);
  if (!fs.existsSync(source)) {
    return featureResult(entry.name, [
      {
        id: "install",
        status: "fail",
        detail: `source ${entry.source} does not exist`,
      },
    ]);
  }
  try {
    installPlugin(source, dest, home);
  } catch (err) {
    return featureResult(entry.name, [
      { id: "install", status: "fail", detail: err.message },
    ]);
  }
  const inspection = inspectPlugin(dest, entry.name);
  const checks = buildChecks(entry, inspection, {
    id: "install",
    status: "pass",
    detail: `plugins/local/${entry.name}`,
  });
  return featureResult(entry.name, checks);
}

function featureResult(id, checks) {
  const status = checks.some((check) => check.status === "fail") ? "fail" : "pass";
  return { id, status, checks };
}

export function installPlugin(source, dest, home) {
  if (!isSafeHome(home)) throw new Error(`Refusing to install into ${home}.`);
  const rel = path.relative(path.resolve(home), path.resolve(dest));
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Install destination escapes the home: ${dest}`);
  }
  const partial = `${dest}.partial`;
  fs.rmSync(partial, { recursive: true, force: true });
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(partial), { recursive: true });
  copyTree(source, partial, source);
  fs.renameSync(partial, dest);
}

function copyTree(source, dest, root) {
  fs.mkdirSync(dest, { recursive: true });
  const rootReal = fs.realpathSync(root);
  for (const ent of fs.readdirSync(source, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const from = path.join(source, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.isSymbolicLink()) {
      const real = fs.realpathSync(from);
      if (real !== rootReal && !real.startsWith(rootReal + path.sep)) {
        throw new Error(`symlink escapes plugin: ${path.relative(root, from)}`);
      }
      const stat = fs.statSync(from);
      if (stat.isDirectory()) copyTree(from, to, root);
      else fs.copyFileSync(from, to);
      continue;
    }
    if (ent.isDirectory()) copyTree(from, to, root);
    else if (ent.isFile()) fs.copyFileSync(from, to);
  }
}

export function inspectPlugin(dir, expectedName) {
  const manifestPath = path.join(dir, ".cursor-plugin", "plugin.json");
  let manifest = null;
  let manifestError = null;
  if (!fs.existsSync(manifestPath)) manifestError = "missing .cursor-plugin/plugin.json";
  else {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch (err) {
      manifestError = err.message;
    }
  }
  const declared = manifest ?? {};
  return {
    expectedName,
    manifest,
    manifestError,
    displayName:
      manifest && typeof manifest.displayName === "string"
        ? manifest.displayName
        : expectedName,
    readme: fs.existsSync(path.join(dir, "README.md")),
    logo: inspectLogo(dir, declared.logo),
    skills: inspectDocs(dir, declared.skills, "skills", "skill"),
    agents: inspectDocs(dir, declared.agents, "agents", "agent"),
    rules: inspectDocs(dir, declared.rules, "rules", "rule"),
    commands: inspectDocs(dir, declared.commands, "commands", "command"),
    hooks: inspectHooks(dir, declared.hooks),
    mcp: inspectMcp(dir, declared.mcpServers),
  };
}

function inspectLogo(dir, logo) {
  if (typeof logo !== "string" || logo.length === 0) return null;
  if (/^https?:\/\//.test(logo)) return { declared: logo, ok: true, detail: logo };
  if (logo.startsWith("/") || logo.split(path.sep).includes("..")) {
    return { declared: logo, ok: false, detail: "logo path escapes the plugin" };
  }
  const abs = path.resolve(dir, logo);
  return {
    declared: logo,
    ok: fs.existsSync(abs),
    detail: logo,
  };
}

function inspectDocs(dir, declared, fallbackDir, kind) {
  const located = locate(dir, declared, fallbackDir);
  if (located.skip) return null;
  if (located.error) return { error: located.error, items: [] };
  const items = [];
  const problems = [];
  if (kind === "skill") {
    for (const child of readDir(located.abs)) {
      if (!child.isDirectory()) continue;
      const file = path.join(located.abs, child.name, "SKILL.md");
      if (!fs.existsSync(file)) continue;
      items.push(readNamedDoc(file, child.name, true));
    }
  } else if (kind === "agent" || kind === "command") {
    const ext = kind === "command" ? [".md", ".txt"] : [".md"];
    for (const child of readDir(located.abs)) {
      if (!child.isFile() || !ext.some((suffix) => child.name.endsWith(suffix))) continue;
      items.push(readNamedDoc(path.join(located.abs, child.name), child.name, true));
    }
  } else {
    for (const child of readDir(located.abs)) {
      if (!child.isFile() || !/\.(md|mdc)$/.test(child.name)) continue;
      items.push(readNamedDoc(path.join(located.abs, child.name), child.name, false));
    }
  }
  if (declared !== undefined && items.length === 0 && !located.error) {
    problems.push(`${kind} path ${located.rel} has no ${kind} files`);
  }
  const seen = new Set();
  for (const item of items) {
    if (item.error) problems.push(`${item.file}: ${item.error}`);
    else if (seen.has(item.name)) problems.push(`duplicate ${kind} name ${item.name}`);
    else seen.add(item.name);
  }
  items.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { items, problems, rel: located.rel };
}

function readNamedDoc(file, fallback, requireName) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (err) {
    return { file, name: fallback, error: err.message };
  }
  const parsed = parseFrontmatter(text);
  if (parsed.error) return { file, name: fallback, error: parsed.error };
  const name = parsed.data.name?.trim() || "";
  const description = parsed.data.description?.trim() || "";
  if (requireName && !name) return { file, name: fallback, error: "missing name" };
  if (!description) {
    return { file, name: name || fallback, error: "missing description" };
  }
  return { file, name: name || fallback, description, dirName: path.basename(path.dirname(file)) };
}

function inspectHooks(dir, declared) {
  if (declared && typeof declared === "object") {
    return hooksFromObject(dir, declared, "plugin.json hooks");
  }
  const located = locate(dir, declared, path.join("hooks", "hooks.json"), { file: true });
  if (located.skip) return null;
  if (located.error) return { error: located.error, events: [], rel: located.rel };
  let json;
  try {
    json = JSON.parse(fs.readFileSync(located.abs, "utf8"));
  } catch (err) {
    return { error: err.message, events: [], rel: located.rel };
  }
  return hooksFromObject(dir, json.hooks, located.rel, json);
}

function hooksFromObject(dir, hooks, rel, raw) {
  if (!hooks || typeof hooks !== "object" || Array.isArray(hooks)) {
    return { error: `${rel} has no hooks object`, events: [], rel };
  }
  const events = [];
  const problems = [];
  for (const [event, entries] of Object.entries(hooks)) {
    if (!Array.isArray(entries)) {
      problems.push(`${event} is not a list`);
      continue;
    }
    for (const entry of entries) {
      const command = entry && typeof entry.command === "string" ? entry.command : "";
      if (!command.trim()) {
        problems.push(`${event} is missing command`);
        continue;
      }
      const script = resolveHookScript(dir, command);
      events.push({ event, command, script });
    }
  }
  if (raw && raw.version === undefined) problems.push(`${rel} is missing version`);
  return { events, problems, rel };
}

function resolveHookScript(dir, command) {
  const expanded = command
    .replaceAll("${CURSOR_PLUGIN_ROOT}", dir)
    .replaceAll("$CURSOR_PLUGIN_ROOT", dir);
  const tokens = expanded.split(/\s+/).filter(Boolean);
  const token = tokens.find((part) =>
    /(?:^|\/)hooks\/.+\.(?:sh|bash|js|mjs|cjs|ts)$/.test(part) ||
    /^\.\/.+\.(?:sh|bash|js|mjs|cjs|ts)$/.test(part),
  );
  if (!token) return { ok: false, detail: "no script path in command" };
  const abs = path.resolve(dir, token);
  const root = path.resolve(dir);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    return { ok: false, detail: "script path escapes the plugin" };
  }
  return {
    ok: fs.existsSync(abs),
    abs,
    rel: path.relative(dir, abs),
    detail: path.relative(dir, abs),
  };
}

function inspectMcp(dir, declared) {
  if (declared && typeof declared === "object" && !Array.isArray(declared)) {
    return mcpFromObject(declared, "plugin.json mcpServers");
  }
  const located = locate(dir, declared, "mcp.json", { file: true });
  if (located.skip) return null;
  if (located.error) return { error: located.error, servers: [], rel: located.rel };
  let json;
  try {
    json = JSON.parse(fs.readFileSync(located.abs, "utf8"));
  } catch (err) {
    return { error: err.message, servers: [], rel: located.rel };
  }
  const body = json.mcpServers ?? json;
  return mcpFromObject(body, located.rel);
}

function mcpFromObject(body, rel) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: `${rel} has no mcpServers object`, servers: [], rel };
  }
  const servers = [];
  const problems = [];
  for (const [name, config] of Object.entries(body)) {
    if (!config || typeof config !== "object") {
      problems.push(`${name} is not an object`);
      continue;
    }
    if (typeof config.url === "string" && config.url.trim()) {
      servers.push({ name, mode: "url", target: config.url });
    } else if (typeof config.command === "string" && config.command.trim()) {
      const args = Array.isArray(config.args) ? config.args.join(" ") : "";
      servers.push({
        name,
        mode: "command",
        target: args ? `${config.command} ${args}` : config.command,
      });
    } else {
      problems.push(`${name} has no url or command`);
    }
  }
  if (servers.length === 0) problems.push(`${rel} has no servers`);
  return { servers, problems, rel };
}

function locate(dir, declared, fallback, options = {}) {
  if (declared === undefined || declared === null || declared === "") {
    const abs = path.join(dir, fallback);
    if (!fs.existsSync(abs)) return { skip: true };
    return { abs, rel: fallback };
  }
  if (typeof declared !== "string") {
    return { error: "component path must be a string when it is set" };
  }
  if (path.isAbsolute(declared) || declared.split(/[\\/]/).includes("..")) {
    return { error: `path escapes plugin root: ${declared}` };
  }
  const abs = path.resolve(dir, declared);
  const root = path.resolve(dir);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    return { error: `path escapes plugin root: ${declared}` };
  }
  if (!fs.existsSync(abs)) return { error: `missing ${declared}`, rel: declared };
  const stat = fs.statSync(abs);
  if (options.file && !stat.isFile()) return { error: `${declared} is not a file`, rel: declared };
  if (!options.file && !stat.isDirectory()) {
    return { error: `${declared} is not a directory`, rel: declared };
  }
  return { abs, rel: declared };
}

function readDir(abs) {
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return [];
  return fs.readdirSync(abs, { withFileTypes: true });
}

const UNDRIVABLE = new Set(["hook-fire", "call-mcp", "agent-session"]);

export function planChecks(inspection) {
  const ids = ["install", "manifest-name", "readme"];
  if (inspection.logo) ids.push("logo");
  if (inspection.skills) ids.push("load-skills");
  if (inspection.agents) ids.push("load-agents");
  if (inspection.rules) ids.push("load-rules");
  if (inspection.commands) ids.push("load-commands");
  if (inspection.hooks) {
    ids.push("load-hooks");
    const shell = (inspection.hooks.events ?? []).some((event) =>
      event.script?.rel?.endsWith(".sh"),
    );
    if (shell) ids.push("hook-syntax");
    ids.push("hook-fire");
  }
  if (inspection.mcp) ids.push("load-mcp", "call-mcp");
  ids.push("agent-session");
  return ids;
}

export function buildChecks(entry, inspection, install) {
  const checks = [install];
  if (install.status === "fail") return checks;
  checks.push(manifestCheck(entry, inspection));
  checks.push({
    id: "readme",
    status: inspection.readme ? "pass" : "fail",
    detail: inspection.readme ? "README.md" : "README.md is missing",
  });
  if (inspection.logo) {
    checks.push({
      id: "logo",
      status: inspection.logo.ok ? "pass" : "fail",
      detail: inspection.logo.detail,
    });
  }
  pushDocs(checks, "load-skills", "skills", inspection.skills);
  pushDocs(checks, "load-agents", "agents", inspection.agents);
  pushDocs(checks, "load-rules", "rules", inspection.rules);
  pushDocs(checks, "load-commands", "commands", inspection.commands);
  if (inspection.hooks) pushHooks(checks, inspection.hooks);
  if (inspection.mcp) pushMcp(checks, inspection.mcp);
  checks.push({
    id: "agent-session",
    status: "undrivable",
    detail: cursorOnPath()
      ? "cursor is on PATH. This CLI does not start a chat."
      : "No cursor binary on PATH. Skill files were read from plugins/local. Chat was not started.",
  });
  return checks;
}

function manifestCheck(entry, inspection) {
  if (inspection.manifestError) {
    return { id: "manifest-name", status: "fail", detail: inspection.manifestError };
  }
  const name = inspection.manifest?.name;
  if (name !== entry.name) {
    return {
      id: "manifest-name",
      status: "fail",
      detail: `plugin.json name ${JSON.stringify(name)} != ${entry.name}`,
    };
  }
  return { id: "manifest-name", status: "pass", detail: entry.name };
}

function pushDocs(checks, id, label, component) {
  if (!component) return;
  if (component.error) {
    checks.push({ id, status: "fail", detail: component.error });
    return;
  }
  if (component.problems.length > 0) {
    checks.push({ id, status: "fail", detail: component.problems.join("; ") });
    return;
  }
  const names = component.items.map((item) => item.name);
  checks.push({
    id,
    status: "pass",
    detail: `${names.length} ${label}: ${names.join(", ")}`,
  });
}

function pushHooks(checks, hooks) {
  if (hooks.error || (hooks.problems && hooks.problems.length > 0)) {
    checks.push({
      id: "load-hooks",
      status: "fail",
      detail: [hooks.error, ...(hooks.problems ?? [])].filter(Boolean).join("; "),
    });
  } else {
    const missing = hooks.events.filter((event) => event.script && !event.script.ok);
    if (missing.length > 0) {
      checks.push({
        id: "load-hooks",
        status: "fail",
        detail: missing
          .map((event) => `${event.event} script missing (${event.script.detail})`)
          .join("; "),
      });
    } else {
      const summary = hooks.events
        .map((event) => `${event.event} ${event.script?.rel || event.command}`)
        .join("; ");
      checks.push({ id: "load-hooks", status: "pass", detail: summary });
    }
  }
  const scripts = (hooks.events ?? []).filter((event) => event.script?.ok && event.script.abs?.endsWith(".sh"));
  if (scripts.length > 0) {
    const results = scripts.map((event) => syntaxCheck(event.script.abs, event.script.rel));
    const bad = results.filter((result) => !result.ok);
    checks.push({
      id: "hook-syntax",
      status: bad.length ? "fail" : "pass",
      detail: results.map((result) => result.detail).join("; "),
    });
  }
  checks.push({
    id: "hook-fire",
    status: "undrivable",
    detail: `Hook commands were not executed (${(hooks.events ?? []).map((event) => event.event).join(", ") || "none"}).`,
  });
}

function syntaxCheck(abs, rel) {
  const run = spawnSync("bash", ["-n", abs], { encoding: "utf8" });
  if (run.status === 0) return { ok: true, detail: `bash -n ${rel}` };
  const err = (run.stderr || run.stdout || "bash -n failed").trim().split("\n")[0];
  return { ok: false, detail: `bash -n ${rel} failed: ${err}` };
}

function pushMcp(checks, mcp) {
  if (mcp.error || (mcp.problems && mcp.problems.length > 0)) {
    checks.push({
      id: "load-mcp",
      status: "fail",
      detail: [mcp.error, ...(mcp.problems ?? [])].filter(Boolean).join("; "),
    });
  } else {
    const detail = mcp.servers
      .map((server) => `${server.name} ${server.mode} ${server.target}`)
      .join("; ");
    checks.push({ id: "load-mcp", status: "pass", detail });
  }
  checks.push({
    id: "call-mcp",
    status: "undrivable",
    detail: "MCP servers were not called. A call needs user auth and reaches a live service.",
  });
}

export function cleanup({ evidenceDir }) {
  const evidencePath = path.join(evidenceDir, "report.json");
  if (!fs.existsSync(evidencePath)) {
    return { ok: true, exitCode: 0, removed: null, evidencePath, kept: false };
  }
  let report;
  try {
    report = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  } catch (err) {
    return {
      ok: false,
      exitCode: 1,
      removed: null,
      evidencePath,
      message: err.message,
    };
  }
  if (!report.home) {
    return { ok: true, exitCode: 0, removed: null, evidencePath, kept: true };
  }
  if (!isSafeHome(report.home)) {
    return {
      ok: false,
      exitCode: 1,
      removed: null,
      evidencePath,
      message: `Refusing to remove ${report.home}.`,
    };
  }
  fs.rmSync(report.home, { recursive: true, force: true });
  return {
    ok: fs.existsSync(evidencePath),
    exitCode: fs.existsSync(evidencePath) ? 0 : 1,
    removed: report.home,
    evidencePath,
    kept: fs.existsSync(evidencePath),
  };
}

function writeEvidence(file, report) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const partial = `${file}.partial`;
  fs.writeFileSync(partial, `${JSON.stringify(report, null, 2)}\n`);
  fs.renameSync(partial, file);
}

export function renderDoctor(report, format) {
  if (format === "json") return `${JSON.stringify(report, null, 2)}\n`;
  const lines = [
    report.ok ? "ok" : "fail",
    `root: ${report.root}`,
    `plugins: ${report.plugins}`,
    `cursorBinary: ${report.cursorBinary}`,
    `evidence: ${report.evidenceDir}`,
  ];
  for (const problem of report.problems) lines.push(`- ${problem}`);
  return `${lines.join("\n")}\n`;
}

export function renderList(report, format) {
  if (format === "json") return `${JSON.stringify(report, null, 2)}\n`;
  const lines = report.plugins.map((plugin) => {
    const bits = [];
    if (plugin.skills.length) bits.push(`skills ${plugin.skills.length}`);
    if (plugin.agents.length) bits.push(`agents ${plugin.agents.length}`);
    if (plugin.rules.length) bits.push(`rules ${plugin.rules.length}`);
    if (plugin.commands.length) bits.push(`commands ${plugin.commands.length}`);
    if (plugin.hooks.length) bits.push(`hooks ${plugin.hooks.length}`);
    if (plugin.mcp.length) bits.push(`mcp ${plugin.mcp.join(",")}`);
    return `${plugin.name.padEnd(22)} ${bits.join(", ") || "no components"}`;
  });
  if (report.message) lines.unshift(report.message);
  return `${lines.join("\n")}\n`;
}

export function renderDrive(report, format) {
  if (format === "json") return `${JSON.stringify(report, null, 2)}\n`;
  const lines = report.features.map((feature) => {
    const bits = feature.checks.map((check) => {
      if (check.status === "undrivable") return `${check.id} undrivable`;
      if (check.status === "fail") return `${check.id} FAIL ${check.detail}`;
      if (check.id.startsWith("load-")) return check.id.replace("load-", "");
      return check.id;
    });
    return `${feature.status.padEnd(4)}  ${feature.id.padEnd(22)} ${bits.join(", ")}`;
  });
  if (report.message) lines.unshift(report.message);
  const pass = report.features.filter((feature) => feature.status === "pass").length;
  const fail = report.features.length - pass;
  const undrivable = report.features.reduce(
    (sum, feature) => sum + feature.checks.filter((check) => check.status === "undrivable").length,
    0,
  );
  lines.push("");
  lines.push(`features: ${report.features.length}`);
  lines.push(`pass: ${pass}`);
  lines.push(`fail: ${fail}`);
  lines.push(`undrivable checks: ${undrivable}`);
  if (report.evidencePath) lines.push(`evidence: ${report.evidencePath}`);
  if (report.home) lines.push(`home: ${report.home}`);
  return `${lines.join("\n")}\n`;
}

export function renderCleanup(report, format) {
  if (format === "json") return `${JSON.stringify(report, null, 2)}\n`;
  const lines = [
    report.ok ? "ok" : "fail",
    `removed: ${report.removed ?? "none"}`,
    `evidence: ${report.evidencePath}`,
    `kept: ${Boolean(report.kept)}`,
  ];
  if (report.message) lines.push(report.message);
  return `${lines.join("\n")}\n`;
}

export function featureDir(root) {
  return path.join(root, ".cursor", "skills", "verify-cursor-plugins", "features");
}

export function writeFeatureMap(root) {
  const loaded = loadMarketplace(root);
  if (loaded.error) return { ok: false, exitCode: 1, message: loaded.error };
  const dir = featureDir(root);
  fs.mkdirSync(dir, { recursive: true });
  const pages = [];
  for (const entry of loaded.plugins) {
    const inspection = inspectPlugin(path.join(root, entry.source), entry.name);
    const body = renderFeature(entry, inspection);
    const file = path.join(dir, `${entry.name}.md`);
    fs.writeFileSync(file, body);
    pages.push({ entry, inspection, file });
  }
  fs.writeFileSync(path.join(dir, "README.md"), renderIndex(pages));
  const expected = new Set([...pages.map((page) => `${page.entry.name}.md`), "README.md"]);
  for (const file of fs.readdirSync(dir)) {
    if (!expected.has(file)) fs.rmSync(path.join(dir, file));
  }
  return { ok: true, exitCode: 0, files: pages.length + 1 };
}

export function featureMapDrift(root) {
  const loaded = loadMarketplace(root);
  if (loaded.error) return { ok: false, exitCode: 1, message: loaded.error, diffs: [loaded.error] };
  const dir = featureDir(root);
  const diffs = [];
  const pages = [];
  for (const entry of loaded.plugins) {
    const inspection = inspectPlugin(path.join(root, entry.source), entry.name);
    const body = renderFeature(entry, inspection);
    const file = path.join(dir, `${entry.name}.md`);
    pages.push({ entry, inspection });
    const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    if (current !== body) diffs.push(path.relative(root, file));
  }
  const readme = path.join(dir, "README.md");
  const readmeBody = renderIndex(pages);
  const currentReadme = fs.existsSync(readme) ? fs.readFileSync(readme, "utf8") : "";
  if (currentReadme !== readmeBody) diffs.push(path.relative(root, readme));
  if (fs.existsSync(dir)) {
    const expected = new Set([...loaded.plugins.map((entry) => `${entry.name}.md`), "README.md"]);
    for (const file of fs.readdirSync(dir)) {
      if (!expected.has(file)) diffs.push(path.relative(root, path.join(dir, file)));
    }
  }
  return { ok: diffs.length === 0, exitCode: diffs.length ? 1 : 0, diffs };
}

function renderIndex(pages) {
  const lines = [
    "# Cursor plugins verification map",
    "",
    "This directory is the maintained source for verifying marketplace plugins the way a user installs and loads them. Read this index, then follow one feature file.",
    "",
    "## Baseline preconditions",
    "",
    "- The working directory is the marketplace root.",
    "- Node is on PATH. The CLI has no install step.",
    `- \`${BIN} doctor\` exits 0.`,
    "- Run one drive at a time. The evidence file and the temp home are single-writer.",
    "- The temp home is `verify-cursor-plugins/home/.cursor/plugins/local/<name>` under the OS temp directory.",
    "- Do not drive the real `~/.cursor` directory.",
    "",
    "## Driving conventions",
    "",
    "- Start from a doctor result of ok.",
    "- Treat every command as literal.",
    "- Use `drive --format json` when you assert a check.",
    "- `list` reads the checkout and does not install. Proof comes from `drive`.",
    "- Leave `.verify-cursor-plugins/evidence/report.json` in place when you clean up.",
    "",
    "## Proof and skip reporting",
    "",
    "- A pass means the plugin was copied into `plugins/local/<name>` and those installed files were read back.",
    "- `undrivable` means the check was named and not run. Do not treat it as proof of that behavior.",
    "- Do not report a Cursor chat, a fired hook, or a live MCP call as verified.",
    "- Record the feature id with the evidence file.",
    "- Report a failed check with its detail. Do not claim a different plugin covers it.",
    "",
    "## Feature entry contract",
    "",
    "Each feature file has an H1, one paragraph, and these H2 sections in order.",
    "",
    ...HEADINGS.map((heading, index) => `${index + 1}. \`${heading}\``),
    "",
    "## Features",
    "",
  ];
  for (const page of pages) {
    const kinds = kindSummary(page.inspection);
    lines.push(
      `- [${page.inspection.displayName}](./${page.entry.name}.md) ${page.entry.description} Drive sees ${kinds}.`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function kindSummary(inspection) {
  const bits = [];
  if (inspection.skills) bits.push(countNoun(inspection.skills.items.length, "skill"));
  if (inspection.agents) bits.push(countNoun(inspection.agents.items.length, "agent"));
  if (inspection.rules) bits.push(countNoun(inspection.rules.items.length, "rule"));
  if (inspection.commands) bits.push(countNoun(inspection.commands.items.length, "command"));
  if (inspection.hooks) bits.push("hooks");
  if (inspection.mcp) bits.push("MCP");
  return bits.join(", ") || "the manifest";
}

function renderFeature(entry, inspection) {
  const checks = planChecks(inspection).map((id) => ({ id, status: UNDRIVABLE.has(id) ? "undrivable" : "pass" }));
  const title = inspection.displayName;
  const lines = [
    `# ${title}`,
    "",
    `${title} is a Cursor marketplace plugin. ${entry.description}`,
    "",
    "## Sub-features",
    "",
  ];
  for (const check of checks) lines.push(`- \`${check.id}\` ${subFeatureLine(check, inspection)}`);
  lines.push("", "## How to get to it (user POV)", "");
  lines.push(`- Install ${title} from the Cursor marketplace.`);
  lines.push(`- Or copy \`${entry.source}\` to \`~/.cursor/plugins/local/${entry.name}\`.`);
  lines.push(...userActions(inspection));
  lines.push("", "## Driving it with verify-cursor-plugins", "", "Preconditions:", "");
  lines.push("- The current directory is the marketplace root.");
  lines.push(`- \`${BIN} doctor\` exits 0.`);
  lines.push("");
  lines.push(
    `- **Install and load.** Run \`${BIN} drive --plugin ${entry.name} --format json\`. Exit code is 0. Feature \`${entry.name}\` has status \`pass\`. Check \`install\` is \`pass\` and the detail contains \`plugins/local/${entry.name}\`. ${observeChecks(checks)}`,
  );
  lines.push(
    "- **Proof.** Open `.verify-cursor-plugins/evidence/report.json`. The same feature status and check details are in that file.",
  );
  lines.push(
    `- **Cleanup.** Run \`${BIN} cleanup\`. The evidence file is still present. The temp home from the report is gone.`,
  );
  lines.push("", "## Gotchas", "");
  for (const gotcha of gotchas(entry, inspection)) lines.push(`- ${gotcha}`);
  lines.push("");
  return lines.join("\n");
}

function subFeatureLine(check, inspection) {
  if (check.id === "install") return "copies the plugin into `plugins/local/<name>` and reads that copy back.";
  if (check.id === "manifest-name") return "reads the installed `plugin.json` name.";
  if (check.id === "readme") return "finds `README.md` on the installed plugin.";
  if (check.id === "logo") return `finds \`${inspection.logo.declared}\`.`;
  if (check.id === "load-skills") return `discovers ${countNoun(inspection.skills.items.length, "skill")} and requires a name and a description on each.`;
  if (check.id === "load-agents") return `discovers ${countNoun(inspection.agents.items.length, "agent")} and requires a name and a description on each.`;
  if (check.id === "load-rules") return `discovers ${countNoun(inspection.rules.items.length, "rule")} and requires a description on each.`;
  if (check.id === "load-commands") return `discovers ${countNoun(inspection.commands.items.length, "command")} and requires a name and a description on each.`;
  if (check.id === "load-hooks") return "parses the installed hooks file and checks that each command's script exists.";
  if (check.id === "hook-syntax") return "runs `bash -n` on installed shell hooks. It does not execute them.";
  if (check.id === "hook-fire") return "would let Cursor run the hook. This drive does not.";
  if (check.id === "load-mcp") return "parses the installed MCP config and lists each server.";
  if (check.id === "call-mcp") return "would call the MCP server. This drive does not.";
  if (check.id === "agent-session") return "would open the plugin in a Cursor chat. This drive does not.";
  return check.detail;
}

function userActions(inspection) {
  const lines = [];
  if (inspection.skills?.items.length) {
    const shown = inspection.skills.items.slice(0, 6);
    const extra =
      inspection.skills.items.length > 6
        ? `, plus ${inspection.skills.items.length - 6} more`
        : "";
    const noun = inspection.skills.items.length === 1 ? "skill" : "skills";
    const verb = inspection.skills.items.length === 1 ? "shows" : "show";
    lines.push(`- In Cursor, the ${noun} ${joinQuoted(shown.map((item) => item.name))}${extra} ${verb} up for the agent.`);
  }
  if (inspection.agents?.items.length) {
    const noun = inspection.agents.items.length === 1 ? "agent" : "agents";
    const verb = inspection.agents.items.length === 1 ? "is" : "are";
    const role = inspection.agents.items.length === 1 ? "a subagent" : "subagents";
    lines.push(
      `- The ${noun} ${joinQuoted(inspection.agents.items.map((item) => item.name))} ${verb} available as ${role}.`,
    );
  }
  if (inspection.rules?.items.length) {
    lines.push("- The rules apply in chats that have the plugin enabled.");
  }
  if (inspection.hooks?.events.length) {
    const events = [...new Set(inspection.hooks.events.map((event) => event.event))];
    lines.push(`- Cursor runs the hook on ${joinQuoted(events)}.`);
  }
  if (inspection.mcp?.servers.length) {
    const names = inspection.mcp.servers.map((server) => `\`${server.name}\``).join(", ");
    lines.push(`- Connect ${names} when Cursor asks you to sign in. Then ask the agent to use that service.`);
  }
  if (lines.length === 0) lines.push("- Enable the plugin in Cursor and confirm it appears in the plugin list.");
  return lines;
}

function observeChecks(checks) {
  const parts = [];
  for (const check of checks) {
    if (check.id === "install" || check.id === "manifest-name" || check.id === "readme") continue;
    if (UNDRIVABLE.has(check.id)) {
      parts.push(`Check \`${check.id}\` is \`undrivable\`.`);
      continue;
    }
    parts.push(`Check \`${check.id}\` is \`pass\`.`);
  }
  return parts.join(" ");
}

function gotchas(entry, inspection) {
  const lines = [
    "A pass does not mean Cursor chat ran. `agent-session` stays `undrivable` in this environment.",
    "Do not point the home at the real `~/.cursor` directory.",
    "`node scripts/validate-plugins.mjs` checks JSON schema. This drive checks install and discovery.",
    "Run one drive at a time.",
  ];
  if (inspection.hooks) {
    lines.push("Hook commands are not executed. `hook-fire` stays `undrivable`.");
  }
  if (inspection.mcp) {
    lines.push("MCP URLs and commands are not called. `call-mcp` stays `undrivable`.");
  }
  const mismatches = (inspection.skills?.items ?? []).filter((item) => {
    if (!item.dirName || item.error) return false;
    return normalizeName(item.name) !== item.dirName;
  });
  for (const item of mismatches) {
    lines.push(
      `The skill directory \`${item.dirName}\` loads under the frontmatter name \`${item.name}\`. Assert the frontmatter name.`,
    );
  }
  if (EXTRA_GOTCHAS[entry.name]) lines.push(EXTRA_GOTCHAS[entry.name]);
  return lines;
}

function countNoun(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function joinQuoted(names) {
  const quoted = names.map((name) => `\`${name}\``);
  if (quoted.length <= 1) return quoted.join("");
  if (quoted.length === 2) return `${quoted[0]} and ${quoted[1]}`;
  return `${quoted.slice(0, -1).join(", ")}, and ${quoted[quoted.length - 1]}`;
}

function normalizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
