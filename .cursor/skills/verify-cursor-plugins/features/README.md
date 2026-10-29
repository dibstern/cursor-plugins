# Cursor plugins verification map

This directory is the maintained source for verifying marketplace plugins the way a user installs and loads them. Read this index, then follow one feature file.

## Baseline preconditions

- The working directory is the marketplace root.
- Node is on PATH. The CLI has no install step.
- `node .cursor/skills/verify-cursor-plugins/bin/verify-cursor-plugins.mjs doctor` exits 0.
- Run one drive at a time. The evidence file and the temp home are single-writer.
- The temp home is `verify-cursor-plugins/home/.cursor/plugins/local/<name>` under the OS temp directory.
- Do not drive the real `~/.cursor` directory.

## Driving conventions

- Start from a doctor result of ok.
- Treat every command as literal.
- Use `drive --format json` when you assert a check.
- `list` reads the checkout and does not install. Proof comes from `drive`.
- Leave `.verify-cursor-plugins/evidence/report.json` in place when you clean up.

## Proof and skip reporting

- A pass means the plugin was copied into `plugins/local/<name>` and those installed files were read back.
- `undrivable` means the check was named and not run. Do not treat it as proof of that behavior.
- Do not report a Cursor chat, a fired hook, or a live MCP call as verified.
- Record the feature id with the evidence file.
- Report a failed check with its detail. Do not claim a different plugin covers it.

## Feature entry contract

Each feature file has an H1, one paragraph, and these H2 sections in order.

1. `Sub-features`
2. `How to get to it (user POV)`
3. `Driving it with verify-cursor-plugins`
4. `Gotchas`

## Features

- [Teaching](./teaching.md) Skill mapping, practice plans, and learning retrospectives. Drive sees 2 skills.
- [Continual Learning](./continual-learning.md) Incremental transcript-driven memory updates for AGENTS.md using high-signal bullet points only. Drive sees 1 skill, 1 agent, hooks.
- [Cursor Team Kit](./cursor-team-kit.md) Internal team workflows for CI, code review, shipping, local automation, and verification. Drive sees 18 skills, 2 agents, 2 rules.
- [Thermos](./thermos.md) Thermo-nuclear branch review: deep security/correctness audits, harsh code-quality rubrics, parallel subagents, thermos orchestration, and optional merge-ready PR flows. Drive sees 3 skills, 2 agents.
- [Create Plugin](./create-plugin.md) Scaffold and validate new agent plugins. Drive sees 2 skills, 1 agent, 1 rule.
- [Ralph Loop](./ralph-loop.md) Iterative self-referential AI loops using the Ralph Wiggum technique. Drive sees 3 skills, hooks.
- [Agent Compatibility](./agent-compatibility.md) CLI-backed repo compatibility scans plus agents that audit startup, validation, and docs against reality. Drive sees 1 skill, 4 agents.
- [CLI for Agents](./cli-for-agent.md) Patterns for designing CLIs that coding agents can run reliably: flags, help with examples, pipelines, errors, idempotency, dry-run. Drive sees 1 skill.
- [PR Review Canvas](./pr-review-canvas.md) Render PR diffs as review canvases grouped by importance. Drive sees 1 skill.
- [Docs Canvas](./docs-canvas.md) Render documentation as a navigable canvas. Drive sees 1 skill.
- [Cursor SDK](./cursor-sdk.md) Build apps, scripts, and automations with the TypeScript SDK. Drive sees 1 skill.
- [Orchestrate](./orchestrate.md) Fan large tasks out across parallel cloud agents with planners, workers, verifiers, and structured handoffs. Drive sees 1 skill.
- [pstack](./pstack.md) if you want to go fast, go deep first. pstack helps you write less, but higher quality code. rigorous agent workflows you can parallelize with confidence. Drive sees 44 skills, 2 agents.
- [Gmail](./gmail.md) Search, read, draft, and manage email. Drive sees MCP.
- [Google Drive](./google-drive.md) Search, read, create, and share files. Drive sees MCP.
- [Google Calendar](./google-calendar.md) Search events and schedule meetings. Drive sees MCP.
- [Gong](./gong.md) Pull account summaries, deal insights, and call briefs. Drive sees MCP.
- [Salesforce](./salesforce.md) Query, create, and update records in your org. Drive sees MCP.
- [Playwright](./playwright.md) Navigate, click, screenshot, and test in a real browser. Drive sees MCP.
- [GitHub](./github.md) Manage repos, issues, pull requests, and Actions. Drive sees MCP.
- [Ashby](./ashby.md) Search candidates, prep interviews, and manage pipeline tasks. Drive sees MCP.
- [HubSpot](./hubspot.md) Search and update contacts, companies, deals, and tickets. Drive sees MCP.
- [Intercom](./intercom.md) Search conversations, contacts, and Help Center articles. Drive sees MCP.
- [Zoom](./zoom.md) Search meetings, pull transcripts, and work with Zoom Docs. Drive sees MCP.
- [X](./x.md) Search posts, read timelines, pull trends, and manage bookmarks. Drive sees 1 skill, MCP.
- [Clay](./clay.md) Enrich people and companies, run AI research agents. Drive sees MCP.
- [Circleback](./circleback.md) Search meetings, transcripts, action items, and emails. Drive sees MCP.
- [Docusign](./docusign.md) Manage envelopes, templates, workflows, and agreements. Drive sees MCP.
- [Navan](./navan.md) Query expenses, travel bookings, policies, and cards. Drive sees MCP.
- [Profound](./profound.md) Track AI visibility, sentiment, and citations. Drive sees MCP.
- [Juicebox](./juicebox.md) Query recruiting analytics, shortlists, and sourcing agents. Drive sees MCP.
- [Outreach](./outreach.md) Search sequences, prospects, and Kaia meetings. Drive sees MCP.
- [Amplemarket](./amplemarket.md) Search people and companies, enrich leads, run sequences. Drive sees MCP.
