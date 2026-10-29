#!/usr/bin/env node

import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  BIN,
  cleanup,
  doctor,
  drive,
  featureMapDrift,
  listPlugins,
  renderCleanup,
  renderDoctor,
  renderDrive,
  renderList,
  writeFeatureMap,
} from "../lib/verify.mjs";

const COMMANDS = ["doctor", "list", "drive", "cleanup", "features"];

export async function main(argv, io) {
  const parsed = parseArgs(argv);
  if (parsed.error) {
    io.stderr(`${parsed.error}\n${BIN} drive --plugin teaching --format json\n`);
    return 2;
  }
  if (parsed.help && !parsed.command) {
    io.stdout(topHelp());
    return 0;
  }
  if (!COMMANDS.includes(parsed.command)) {
    io.stderr(`Unknown command ${parsed.command}.\n${BIN} --help\n`);
    return 2;
  }
  if (parsed.help) {
    io.stdout(commandHelp(parsed.command));
    return 0;
  }
  if (parsed.format !== "json" && parsed.format !== "text") {
    io.stderr(`Unknown format ${parsed.format}.\n${BIN} drive --plugin teaching --format json\n`);
    return 2;
  }
  const root = path.resolve(parsed.root ?? io.cwd);
  const evidenceDir = path.resolve(parsed.evidence ?? path.join(root, ".verify-cursor-plugins", "evidence"));
  if (parsed.command === "doctor") {
    const report = doctor({ root, evidenceDir });
    io.stdout(renderDoctor(report, parsed.format));
    return report.exitCode;
  }
  if (parsed.command === "list") {
    const report = listPlugins({ root });
    io.stdout(renderList(report, parsed.format));
    return report.exitCode;
  }
  if (parsed.command === "drive") {
    const report = drive({
      root,
      plugins: parsed.plugins,
      evidenceDir,
      dryRun: parsed.dryRun,
    });
    if (report.exitCode === 2) {
      io.stderr(`${report.message}\n`);
      return 2;
    }
    io.stdout(renderDrive(report, parsed.format));
    return report.exitCode;
  }
  if (parsed.command === "cleanup") {
    const report = cleanup({ evidenceDir });
    io.stdout(renderCleanup(report, parsed.format));
    return report.exitCode;
  }
  if (parsed.write === parsed.check) {
    io.stderr(`Pass one of --write or --check.\n${BIN} features --check\n`);
    return 2;
  }
  const report = parsed.write ? writeFeatureMap(root) : featureMapDrift(root);
  if (parsed.format === "json") io.stdout(`${JSON.stringify(report, null, 2)}\n`);
  else if (report.diffs) {
    io.stdout(report.diffs.length ? `drift\n${report.diffs.join("\n")}\n` : "ok\n");
  } else io.stdout(report.ok ? `wrote ${report.files} files\n` : `${report.message}\n`);
  return report.exitCode;
}

function parseArgs(argv) {
  const out = {
    command: null,
    help: false,
    format: "text",
    root: null,
    plugins: [],
    dryRun: false,
    evidence: null,
    write: false,
    check: false,
  };
  const rest = [...argv];
  if (rest.length === 0 || rest[0] === "--help" || rest[0] === "-h") {
    out.help = true;
    return out;
  }
  out.command = rest.shift();
  while (rest.length > 0) {
    const flag = rest.shift();
    if (flag === "--help" || flag === "-h") {
      out.help = true;
      continue;
    }
    if (flag === "--dry-run") {
      out.dryRun = true;
      continue;
    }
    if (flag === "--write") {
      out.write = true;
      continue;
    }
    if (flag === "--check") {
      out.check = true;
      continue;
    }
    if (flag === "--format" || flag === "--root" || flag === "--plugin" || flag === "--evidence") {
      const value = rest.shift();
      if (!value || value.startsWith("--")) {
        return { error: `Missing value for ${flag}.` };
      }
      if (flag === "--format") out.format = value;
      else if (flag === "--root") out.root = value;
      else if (flag === "--plugin") out.plugins.push(value);
      else out.evidence = value;
      continue;
    }
    return { error: `Unknown argument ${flag}.` };
  }
  return out;
}

function topHelp() {
  return `${BIN}

Commands:
  doctor     Check that this checkout can be driven
  list       List plugins and the components a load finds
  drive      Install plugins into an isolated home and load them
  cleanup    Remove the temp home and keep the evidence file
  features   Write or check the feature map

${BIN} drive --help
`;
}

function commandHelp(command) {
  const examples = {
    doctor: `${BIN} doctor
${BIN} doctor --format json`,
    list: `${BIN} list
${BIN} list --format json`,
    drive: `${BIN} drive --plugin teaching --format json
${BIN} drive --format text
${BIN} drive --plugin gmail --dry-run --format json`,
    cleanup: `${BIN} cleanup
${BIN} cleanup --format json`,
    features: `${BIN} features --check
${BIN} features --write`,
  };
  const options = {
    doctor: `--format json|text    Output format. Default text.
--root <dir>         Marketplace root. Default is the current directory.
--evidence <dir>     Evidence directory shown in the report.`,
    list: `--format json|text    Output format. Default text.
--root <dir>         Marketplace root. Default is the current directory.`,
    drive: `--plugin <name>      Plugin to drive. Repeat for more than one. Default is every plugin.
--format json|text    Output format. Default text.
--root <dir>         Marketplace root. Default is the current directory.
--evidence <dir>     Where report.json is written. Default .verify-cursor-plugins/evidence.
--dry-run            Install, load, and print the report. Do not write evidence.`,
    cleanup: `--format json|text    Output format. Default text.
--root <dir>         Marketplace root. Default is the current directory.
--evidence <dir>     Evidence directory that holds report.json.`,
    features: `--write              Regenerate features/*.md from the marketplace.
--check              Exit 1 when a feature file differs from the generator.
--format json|text    Output format. Default text.
--root <dir>         Marketplace root. Default is the current directory.`,
  };
  return `${BIN} ${command}

Options:
  ${options[command].split("\n").join("\n  ")}

Examples:
  ${examples[command].split("\n").join("\n  ")}
`;
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main(process.argv.slice(2), {
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
    cwd: process.cwd(),
  }).then((code) => {
    process.exit(code);
  });
}
