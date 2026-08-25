import {
  mkdtemp,
  rm,
  writeFile,
  mkdir,
} from "fs/promises";
import os from "os";
import path from "path";
import { spawn } from "child_process";

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

  if (!resolved.startsWith(root)) {
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
  return new Promise<{
    code: number | null;
    stdout: string;
    stderr: string;
  }>((resolve, reject) => {
    const child = spawn(
      command,
      args,
      {
        cwd,
        env: {
          PATH:
            process.env.PATH || "",
          HOME:
            process.env.HOME || "",
          NEXT_TELEMETRY_DISABLED:
            "1",
          CI:
            "1",
        },
        shell: false,
      }
    );

    let stdout = "";
    let stderr = "";

    const timer =
      setTimeout(() => {
        child.kill("SIGKILL");
      }, timeoutMs);

    child.stdout.on(
      "data",
      (data) => {
        stdout +=
          data.toString();

        if (
          stdout.length >
          100000
        ) {
          stdout =
            stdout.slice(-100000);
        }
      }
    );

    child.stderr.on(
      "data",
      (data) => {
        stderr +=
          data.toString();

        if (
          stderr.length >
          100000
        ) {
          stderr =
            stderr.slice(-100000);
        }
      }
    );

    child.on(
      "error",
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );

    child.on(
      "close",
      (code) => {
        clearTimeout(timer);

        resolve({
          code,
          stdout,
          stderr,
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

    const packageJsonPath =
      path.join(
        tempRoot,
        "package.json"
      );

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
