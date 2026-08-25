import path from "path";

export type BuilderValidationFile = {
  path: string;
  content: string;
};

export type ValidationIssue = {
  severity: "error" | "warning";
  code: string;
  file?: string;
  message: string;
};

export type ValidationReport = {
  valid: boolean;
  score: number;
  errors: number;
  warnings: number;
  issues: ValidationIssue[];
};

function normalizeFilePath(value: string) {
  return value
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
}

function dirname(filePath: string) {
  const normalized =
    normalizeFilePath(filePath);

  const parts =
    normalized.split("/");

  parts.pop();

  return parts.join("/");
}

function resolveRelativeImport(
  fromFile: string,
  importedPath: string
) {
  const base =
    dirname(fromFile);

  const resolved =
    path.posix.normalize(
      path.posix.join(
        base,
        importedPath
      )
    );

  return normalizeFilePath(
    resolved
  );
}

function candidatePaths(
  basePath: string
) {
  return [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.json`,
    `${basePath}/index.ts`,
    `${basePath}/index.tsx`,
    `${basePath}/index.js`,
    `${basePath}/index.jsx`,
  ];
}

function extractImports(
  content: string
) {
  const imports: string[] = [];

  const patterns = [
    /from\s+["']([^"']+)["']/g,
    /import\s+["']([^"']+)["']/g,
    /require\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const regex of patterns) {
    let match;

    while (
      (match =
        regex.exec(content)) !==
      null
    ) {
      if (match[1]) {
        imports.push(
          match[1]
        );
      }
    }
  }

  return imports;
}

function basicBracketCheck(
  content: string
) {
  const pairs: Record<
    string,
    string
  > = {
    "{": "}",
    "[": "]",
    "(": ")",
  };

  const closers =
    new Set(
      Object.values(pairs)
    );

  const stack: string[] = [];

  let quote:
    | "'"
    | '"'
    | "`"
    | null = null;

  let escaped = false;

  for (
    let i = 0;
    i < content.length;
    i++
  ) {
    const char =
      content[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (
      quote &&
      char === "\\"
    ) {
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      }

      continue;
    }

    if (
      char === "'" ||
      char === '"' ||
      char === "`"
    ) {
      quote =
        char as
          | "'"
          | '"'
          | "`";
      continue;
    }

    if (pairs[char]) {
      stack.push(
        pairs[char]
      );
      continue;
    }

    if (
      closers.has(char)
    ) {
      const expected =
        stack.pop();

      if (
        expected !== char
      ) {
        return false;
      }
    }
  }

  return (
    stack.length === 0 &&
    quote === null
  );
}

export function validateBuilderProject(
  files: BuilderValidationFile[]
): ValidationReport {
  const issues:
    ValidationIssue[] = [];

  const normalizedFiles =
    files.map((file) => ({
      path:
        normalizeFilePath(
          file.path
        ),
      content:
        file.content,
    }));

  const fileMap =
    new Map<
      string,
      BuilderValidationFile
    >();

  for (
    const file
    of normalizedFiles
  ) {
    if (!file.path) {
      continue;
    }

    if (
      fileMap.has(
        file.path
      )
    ) {
      issues.push({
        severity: "error",
        code:
          "DUPLICATE_FILE",
        file:
          file.path,
        message:
          "Le même chemin de fichier est présent plusieurs fois.",
      });
    }

    fileMap.set(
      file.path,
      file
    );

    if (
      !file.content.trim()
    ) {
      issues.push({
        severity: "warning",
        code:
          "EMPTY_FILE",
        file:
          file.path,
        message:
          "Le fichier est vide.",
      });
    }
  }

  if (
    !fileMap.has(
      "package.json"
    )
  ) {
    issues.push({
      severity: "error",
      code:
        "MISSING_PACKAGE_JSON",
      message:
        "package.json est manquant.",
    });
  } else {
    try {
      JSON.parse(
        fileMap.get(
          "package.json"
        )!.content
      );
    } catch {
      issues.push({
        severity: "error",
        code:
          "INVALID_PACKAGE_JSON",
        file:
          "package.json",
        message:
          "package.json n'est pas un JSON valide.",
      });
    }
  }

  const hasAppRouter =
    normalizedFiles.some(
      (file) =>
        file.path.startsWith(
          "src/app/"
        )
    );

  if (hasAppRouter) {
    if (
      !fileMap.has(
        "src/app/page.tsx"
      ) &&
      !fileMap.has(
        "src/app/page.jsx"
      ) &&
      !fileMap.has(
        "src/app/page.js"
      )
    ) {
      issues.push({
        severity: "error",
        code:
          "MISSING_APP_PAGE",
        message:
          "Le projet App Router ne contient pas src/app/page.tsx.",
      });
    }

    if (
      !fileMap.has(
        "src/app/layout.tsx"
      ) &&
      !fileMap.has(
        "src/app/layout.jsx"
      ) &&
      !fileMap.has(
        "src/app/layout.js"
      )
    ) {
      issues.push({
        severity: "warning",
        code:
          "MISSING_APP_LAYOUT",
        message:
          "Le projet App Router ne contient pas src/app/layout.tsx.",
      });
    }
  }

  for (
    const file
    of normalizedFiles
  ) {
    const ext =
      file.path
        .split(".")
        .pop()
        ?.toLowerCase();

    if (
      ["ts", "tsx", "js", "jsx"].includes(
        ext || ""
      )
    ) {
      if (
        !basicBracketCheck(
          file.content
        )
      ) {
        issues.push({
          severity: "error",
          code:
            "UNBALANCED_SYNTAX",
          file:
            file.path,
          message:
            "Le fichier semble contenir des parenthèses, crochets, accolades ou chaînes non équilibrés.",
        });
      }

      const imports =
        extractImports(
          file.content
        );

      for (
        const imported
        of imports
      ) {
        if (
          imported.startsWith(
            "."
          )
        ) {
          const resolved =
            resolveRelativeImport(
              file.path,
              imported
            );

          const exists =
            candidatePaths(
              resolved
            ).some(
              (candidate) =>
                fileMap.has(
                  candidate
                )
            );

          if (!exists) {
            issues.push({
              severity: "error",
              code:
                "MISSING_RELATIVE_IMPORT",
              file:
                file.path,
              message:
                `Import relatif introuvable : ${imported}`,
            });
          }

          continue;
        }

        if (
          imported.startsWith(
            "@/"
          )
        ) {
          const target =
            `src/${imported.slice(
              2
            )}`;

          const exists =
            candidatePaths(
              target
            ).some(
              (candidate) =>
                fileMap.has(
                  candidate
                )
            );

          if (!exists) {
            issues.push({
              severity:
                "error",
              code:
                "MISSING_ALIAS_IMPORT",
              file:
                file.path,
              message:
                `Import alias introuvable : ${imported}`,
            });
          }
        }
      }
    }

    if (
      ext === "json"
    ) {
      try {
        JSON.parse(
          file.content
        );
      } catch {
        issues.push({
          severity: "error",
          code:
            "INVALID_JSON",
          file:
            file.path,
          message:
            "Le fichier JSON n'est pas valide.",
        });
      }
    }
  }

  const errors =
    issues.filter(
      (issue) =>
        issue.severity ===
        "error"
    ).length;

  const warnings =
    issues.filter(
      (issue) =>
        issue.severity ===
        "warning"
    ).length;

  const score =
    Math.max(
      0,
      100 -
        errors * 15 -
        warnings * 5
    );

  return {
    valid:
      errors === 0,
    score,
    errors,
    warnings,
    issues,
  };
}
