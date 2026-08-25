import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "fs/promises";
import {
  execFile,
  spawn,
  type ChildProcess,
} from "child_process";
import net from "net";
import os from "os";
import path from "path";

export type RuntimeFile = {
  path: string;
  content: string;
};

type RuntimeInstance = {
  projectId: string;
  port: number;
  root: string;
  process: ChildProcess;
  startedAt: string;
};

type RuntimeStatus = {
  running: boolean;
  projectId: string;
  port?: number;
  url?: string;
  startedAt?: string;
};

const globalRuntime =
  globalThis as typeof globalThis & {
    creatorBusinessAIRuntimes?: Map<
      string,
      RuntimeInstance
    >;
  };

const runtimes =
  globalRuntime.creatorBusinessAIRuntimes ??
  new Map<
    string,
    RuntimeInstance
  >();

globalRuntime.creatorBusinessAIRuntimes =
  runtimes;

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
      `Chemin interdit : ${relative}`
    );
  }

  return resolved;
}

async function getFreePort() {
  return new Promise<number>(
    (resolve, reject) => {
      const server =
        net.createServer();

      server.unref();

      server.once(
        "error",
        reject
      );

      server.listen(
        0,
        "127.0.0.1",
        () => {
          const address =
            server.address();

          if (
            !address ||
            typeof address ===
              "string"
          ) {
            server.close();

            reject(
              new Error(
                "Impossible de déterminer un port libre."
              )
            );

            return;
          }

          const port =
            address.port;

          server.close(
            () => resolve(port)
          );
        }
      );
    }
  );
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

async function waitForRuntime(
  port: number,
  timeoutMs = 30000
) {
  const started =
    Date.now();

  while (
    Date.now() - started <
    timeoutMs
  ) {
    try {
      const response =
        await fetch(
          `http://127.0.0.1:${port}`,
          {
            cache:
              "no-store",
          }
        );

      if (
        response.status >= 200 &&
        response.status < 500
      ) {
        return;
      }
    } catch {}

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          500
        )
    );
  }

  throw new Error(
    "Le runtime n'a pas démarré dans le délai prévu."
  );
}

export function getRuntimeStatus(
  projectId: string
): RuntimeStatus {
  const runtime =
    runtimes.get(
      projectId
    );

  if (
    !runtime ||
    runtime.process.killed ||
    runtime.process.exitCode !==
      null
  ) {
    return {
      running: false,
      projectId,
    };
  }

  return {
    running: true,
    projectId,
    port:
      runtime.port,
    url:
      `http://127.0.0.1:${runtime.port}`,
    startedAt:
      runtime.startedAt,
  };
}

export async function stopRuntime(
  projectId: string
) {
  const runtime =
    runtimes.get(
      projectId
    );

  if (!runtime) {
    return {
      running: false,
      projectId,
    };
  }

  runtimes.delete(
    projectId
  );

  if (
    runtime.process.exitCode ===
      null &&
    !runtime.process.killed
  ) {
    runtime.process.kill(
      "SIGTERM"
    );

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          800
        )
    );

    if (
      runtime.process.exitCode ===
      null
    ) {
      runtime.process.kill(
        "SIGKILL"
      );
    }
  }

  await rm(
    runtime.root,
    {
      recursive: true,
      force: true,
    }
  );

  return {
    running: false,
    projectId,
  };
}

export async function startRuntime(
  projectId: string,
  files: RuntimeFile[]
) {
  await stopRuntime(
    projectId
  );

  const root =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "creatorbusinessai-runtime-"
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
          root,
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
        root,
        180000
      );

    if (install.code !== 0) {
      throw new Error(
        `npm install a échoué.\n${
          install.stderr ||
          install.stdout
        }`
      );
    }

    const build =
      await runCommand(
        "npm",
        [
          "run",
          "build",
        ],
        root,
        180000
      );

    if (build.code !== 0) {
      throw new Error(
        `Le build a échoué.\n${
          build.stderr ||
          build.stdout
        }`
      );
    }

    const port =
      await getFreePort();

    const runtimeEnv:
      NodeJS.ProcessEnv = {
        PATH: process.env.PATH || "",
        HOME: process.env.HOME || "",
        TMPDIR: process.env.TMPDIR || "/tmp",
        NODE_ENV: "production",
        NEXT_TELEMETRY_DISABLED: "1",
      };

    const child: ChildProcess =
      spawn(
        "npm",
        [
          "run",
          "start",
          "--",
          "-H",
          "127.0.0.1",
          "-p",
          String(port),
        ],
        {
          cwd: root,
          env:
            runtimeEnv,
          shell: false,
          stdio:
            "ignore",
        }
      );

    const runtime:
      RuntimeInstance = {
        projectId,
        port,
        root,
        process:
          child,
        startedAt:
          new Date().toISOString(),
      };

    runtimes.set(
      projectId,
      runtime
    );

    child.once(
      "exit",
      () => {
        const current =
          runtimes.get(
            projectId
          );

        if (
          current?.process ===
          child
        ) {
          runtimes.delete(
            projectId
          );
        }

        void rm(
          root,
          {
            recursive: true,
            force: true,
          }
        );
      }
    );

    await waitForRuntime(
      port
    );

    return {
      running: true,
      projectId,
      port,
      url:
        `http://127.0.0.1:${port}`,
      startedAt:
        runtime.startedAt,
    };
  } catch (error) {
    await rm(
      root,
      {
        recursive: true,
        force: true,
      }
    );

    throw error;
  }
}
