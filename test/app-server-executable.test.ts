import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveCodexExecutable } from "../src/app-server/executable.js";

describe("bundled Codex executable", () => {
  let app: string;
  beforeEach(async () => {
    app = await mkdtemp(join(tmpdir(), "codexion-app-"));
  });
  afterEach(async () => {
    await rm(app, { recursive: true, force: true });
  });

  async function executable(relative: string) {
    const path = join(app, "Contents", "Resources", relative);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    return path;
  }

  it("prefers the current bundled launcher over the legacy executable", async () => {
    await executable("codex");
    const current = await executable("codex-cli/bin/codex");
    expect(await resolveCodexExecutable(app)).toBe(current);
  });

  it("supports the nested signed CLI bundle", async () => {
    const nested = await executable("codex-cli/CodexCLI.app/Contents/MacOS/codex");
    expect(await resolveCodexExecutable(app)).toBe(nested);
  });

  it("supports older desktop releases", async () => {
    const legacy = await executable("codex");
    expect(await resolveCodexExecutable(app)).toBe(legacy);
  });

  it("skips non-executable files and directories", async () => {
    const launcher = await executable("codex-cli/bin/codex");
    await chmod(launcher, 0o644);
    await mkdir(join(app, "Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex"), {
      recursive: true,
    });
    const legacy = await executable("codex");
    expect(await resolveCodexExecutable(app)).toBe(legacy);
  });

  it("reports checked bundle paths when no executable is available", async () => {
    await expect(resolveCodexExecutable(app)).rejects.toThrow(
      `No executable Codex app-server found in ${app}`,
    );
  });
});
