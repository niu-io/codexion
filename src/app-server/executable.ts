import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { join } from "node:path";

/** Resolve only known executables bundled with the selected desktop app. */
export async function resolveCodexExecutable(appPath: string): Promise<string> {
  const resources = join(appPath, "Contents", "Resources");
  const candidates = [
    join(resources, "codex-cli", "bin", "codex"),
    join(resources, "codex-cli", "CodexCLI.app", "Contents", "MacOS", "codex"),
    join(resources, "codex"),
  ];
  for (const candidate of candidates) {
    try {
      if (!(await stat(candidate)).isFile()) continue;
      await access(candidate, constants.X_OK);
      return candidate;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTDIR" && code !== "EACCES") throw error;
    }
  }
  throw new Error(
    `No executable Codex app-server found in ${appPath}. Checked: ${candidates.join(", ")}`,
  );
}
