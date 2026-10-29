import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { main } from "../bin/verify-cursor-plugins.mjs";
import {
  buildChecks,
  cleanup,
  drive,
  featureMapDrift,
  inspectPlugin,
  isSafeHome,
  parseFrontmatter,
  HEADINGS,
  planChecks,
} from "./verify.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

test("frontmatter reads plain, quoted, and folded values", () => {
  const plain = parseFrontmatter("---\nname: Poteto Mode\ndescription: plain value\n---\n");
  assert.equal(plain.data.name, "Poteto Mode");
  assert.equal(plain.data.description, "plain value");

  const quoted = parseFrontmatter(
    '---\nname: how\ndescription: "Use for \\"how does X work\\""\n---\n',
  );
  assert.equal(quoted.data.description, 'Use for "how does X work"');

  const folded = parseFrontmatter(
    "---\nname: X MCP guide\ndescription: >-\n  ALWAYS read this\n  before any call.\n---\n",
  );
  assert.equal(folded.data.name, "X MCP guide");
  assert.equal(folded.data.description, "ALWAYS read this before any call.");
  assert.equal(parseFrontmatter("nope").error, "missing frontmatter");
});

test("home guard rejects the real Cursor directory", () => {
  const bad = path.join(os.homedir(), ".cursor", "plugins", "local", "demo");
  assert.equal(isSafeHome(bad), false);
  const good = path.join(os.tmpdir(), "verify-cursor-plugins", "runs", "unit");
  assert.equal(isSafeHome(good), true);
  assert.equal(isSafeHome(path.join(os.tmpdir(), "verify-cursor-plugins", "home")), true);
  assert.equal(isSafeHome("/tmp/elsewhere"), false);
});

test("drive installs a fixture and fails a skill with no description", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "verify-market-"));
  const home = path.join(os.tmpdir(), "verify-cursor-plugins", "runs", `unit-${process.pid}`);
  writeFixture(root);
  const evidenceDir = path.join(root, "evidence");
  const pass = drive({
    root,
    plugins: ["alpha"],
    evidenceDir,
    home,
  });
  assert.equal(pass.exitCode, 0, JSON.stringify(pass, null, 2));
  const alpha = pass.features[0];
  assert.equal(alpha.status, "pass");
  const ids = alpha.checks.map((check) => check.id);
  assert.deepEqual(ids, ["install", "manifest-name", "readme", "load-skills", "load-hooks", "hook-syntax", "hook-fire", "agent-session"]);
  assert.equal(alpha.checks.find((check) => check.id === "hook-fire").status, "undrivable");
  assert.equal(alpha.checks.find((check) => check.id === "agent-session").status, "undrivable");
  assert.match(alpha.checks.find((check) => check.id === "install").detail, /plugins\/local\/alpha/);
  assert.match(alpha.checks.find((check) => check.id === "load-skills").detail, /Demo skill/);
  assert.equal(fs.existsSync(path.join(evidenceDir, "report.json")), true);

  const removed = cleanup({ evidenceDir });
  assert.equal(removed.exitCode, 0);
  assert.equal(fs.existsSync(path.join(evidenceDir, "report.json")), true);
  assert.equal(fs.existsSync(home), false);

  const fail = drive({
    root,
    plugins: ["broken"],
    evidenceDir,
    home,
  });
  assert.equal(fail.exitCode, 1);
  const skill = fail.features[0].checks.find((check) => check.id === "load-skills");
  assert.equal(skill.status, "fail");
  assert.match(skill.detail, /missing description/);

  const escape = drive({
    root,
    plugins: ["escape"],
    evidenceDir,
    home,
  });
  assert.equal(escape.features[0].checks.find((check) => check.id === "load-skills").status, "fail");
});

test("marketplace skills parse and pstack does not load the automation skill", () => {
  const files = walk(repo).filter((file) => file.endsWith(`${path.sep}SKILL.md`));
  assert.ok(files.length > 40);
  for (const file of files) {
    const parsed = parseFrontmatter(fs.readFileSync(file, "utf8"));
    assert.ok(parsed.data?.name, file);
    assert.ok(parsed.data?.description, file);
  }
  const pstack = inspectPlugin(path.join(repo, "pstack"), "pstack");
  const names = pstack.skills.items.map((item) => item.name);
  assert.equal(names.includes("setup-benny"), false);
  assert.ok(names.includes("Poteto Mode"));
  const ids = planChecks(pstack);
  const checks = buildChecks(
    { name: "pstack", source: "pstack", description: "" },
    pstack,
    { id: "install", status: "pass", detail: "plugins/local/pstack" },
  );
  assert.deepEqual(checks.map((check) => check.id), ids);
});

test("feature map matches the generator", () => {
  const drift = featureMapDrift(repo);
  assert.deepEqual(drift.diffs, []);
  const dir = path.join(repo, ".cursor", "skills", "verify-cursor-plugins", "features");
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".md") || file === "README.md") continue;
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    const found = [...text.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    assert.deepEqual(found, [...HEADINGS], file);
  }
});

test("cli help and unknown plugin", async () => {
  const stdout = [];
  const stderr = [];
  const io = {
    cwd: repo,
    stdout: (text) => stdout.push(text),
    stderr: (text) => stderr.push(text),
  };
  assert.equal(await main(["--help"], io), 0);
  assert.match(stdout.join(""), /drive/);
  stdout.length = 0;
  assert.equal(await main(["drive", "--plugin", "not-a-plugin"], io), 2);
  assert.match(stderr.join(""), /Unknown plugin not-a-plugin/);
  assert.match(stderr.join(""), /list --format json/);
});

function writeFixture(root) {
  fs.mkdirSync(path.join(root, ".cursor-plugin"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".cursor-plugin", "marketplace.json"),
    JSON.stringify({
      plugins: [
        { name: "alpha", source: "alpha", description: "Alpha demo." },
        { name: "broken", source: "broken", description: "Broken demo." },
        { name: "escape", source: "escape", description: "Escape demo." },
      ],
    }),
  );
  writePlugin(root, "alpha", {
    skills: true,
    hooks: true,
    description: "A demo skill.",
  });
  writePlugin(root, "broken", { skills: true, description: "" });
  const escapeDir = path.join(root, "escape");
  fs.mkdirSync(path.join(escapeDir, ".cursor-plugin"), { recursive: true });
  fs.mkdirSync(path.join(escapeDir, "skills", "ok"), { recursive: true });
  fs.writeFileSync(path.join(escapeDir, "README.md"), "escape\n");
  fs.writeFileSync(
    path.join(escapeDir, ".cursor-plugin", "plugin.json"),
    JSON.stringify({
      name: "escape",
      skills: "../outside",
    }),
  );
  fs.writeFileSync(
    path.join(escapeDir, "skills", "ok", "SKILL.md"),
    "---\nname: Ok\ndescription: present\n---\n",
  );
}

function writePlugin(root, name, options) {
  const dir = path.join(root, name);
  fs.mkdirSync(path.join(dir, ".cursor-plugin"), { recursive: true });
  fs.mkdirSync(path.join(dir, "skills", "demo"), { recursive: true });
  fs.writeFileSync(path.join(dir, "README.md"), `${name}\n`);
  const manifest = { name, skills: "./skills/" };
  if (options.hooks) manifest.hooks = "./hooks/hooks.json";
  fs.writeFileSync(path.join(dir, ".cursor-plugin", "plugin.json"), JSON.stringify(manifest));
  const description = options.description ? `description: ${options.description}\n` : "";
  fs.writeFileSync(
    path.join(dir, "skills", "demo", "SKILL.md"),
    `---\nname: Demo skill\n${description}---\n`,
  );
  if (options.hooks) {
    fs.mkdirSync(path.join(dir, "hooks"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "hooks", "hooks.json"),
      JSON.stringify({
        version: 1,
        hooks: { stop: [{ command: "./hooks/stop.sh" }] },
      }),
    );
    fs.writeFileSync(path.join(dir, "hooks", "stop.sh"), "#!/bin/bash\necho stop\n");
  }
}

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const next = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(next, acc);
    else acc.push(next);
  }
  return acc;
}
