import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "fs/promises";
import { execFile } from "child_process";
import os from "os";
import path from "path";

export type BuildRunnerFile = {
  path: string;
  content: string;
};

export type BuildRunnerResult = {
  success: boolean;
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
};

function safePath(
  root: string,
  relative: string
) {
  const clean = relative
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\.\.\//g, "");

  const resolved =
    path.resolve(root, clean);

  if (
    resolved !== root &&
    !resolved.startsWith(
      root + path.sep
    )
  ) {
    throw new Error(
      `Chemin de fichier interdit : ${relative}`
    );
  }

  return resolved;
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number
) {
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH || "",
    HOME: process.env.HOME || "",
    TMPDIR: process.env.TMPDIR || "/tmp",
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    CI: "1",
  };

  return new Promise<{
    code: number | null;
    stdout: string;
    stderr: string;
  }>((resolve) => {
    execFile(
      command,
      args,
      {
        cwd,
        env,
        timeout: timeoutMs,
        maxBuffer:
          10 * 1024 * 1024,
        encoding: "utf8",
      },
      (
        error,
        stdout,
        stderr
      ) => {
        const rawCode =
          error
            ? (
                error as Error & {
                  code?:
                    | number
                    | string
                    | null;
                }
              ).code
            : 0;

        const code =
          typeof rawCode ===
          "number"
            ? rawCode
            : error
              ? 1
              : 0;

        resolve({
          code,
          stdout:
            String(
              stdout || ""
            ).slice(-100000),
          stderr:
            String(
              stderr || ""
            ).slice(-100000),
        });
      }
    );
  });
}

export async function runBuilderBuild(
  files: BuildRunnerFile[]
): Promise<BuildRunnerResult> {
  const started =
    Date.now();

  const tempRoot =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "creatorbusinessai-build-"
      )
    );

  try {
    for (const file of files) {
      if (
        !file.path ||
        !file.content
      ) {
        continue;
      }

      const target =
        safePath(
          tempRoot,
          file.path
        );

      await mkdir(
        path.dirname(target),
        {
          recursive: true,
        }
      );

      await writeFile(
        target,
        file.content,
        "utf8"
      );
    }

    const install =
      await runCommand(
        "npm",
        [
          "install",
          "--ignore-scripts",
          "--include=dev",
          "--no-audit",
          "--no-fund",
        ],
        tempRoot,
        180000
      );

    if (install.code !== 0) {
      return {
        success: false,
        exitCode:
          install.code,
        durationMs:
          Date.now() -
          started,
        stdout:
          install.stdout,
        stderr:
          install.stderr,
      };
    }

    const build =
      await runCommand(
        "npm",
        [
          "run",
          "build",
        ],
        tempRoot,
        180000
      );

    return {
      success:
        build.code === 0,
      exitCode:
        build.code,
      durationMs:
        Date.now() -
        started,
      stdout:
        build.stdout,
      stderr:
        build.stderr,
    };
  } finally {
    await rm(
      tempRoot,
      {
        recursive: true,
        force: true,
      }
    );
  }
}
