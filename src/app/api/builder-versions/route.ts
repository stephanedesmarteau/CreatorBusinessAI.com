import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

type SnapshotFile = {
  path: string;
  content: string;
  mimeType?: string | null;
};

function snapshotFiles(
  files: Array<{
    name: string;
    mimeType: string | null;
    metadata: unknown;
  }>
): SnapshotFile[] {
  return files
    .map((file) => {
      const metadata =
        file.metadata &&
        typeof file.metadata === "object"
          ? (
              file.metadata as Record<
                string,
                unknown
              >
            )
          : {};

      return {
        path: file.name,
        content: String(
          metadata.content ?? ""
        ),
        mimeType: file.mimeType,
      };
    })
    .filter(
      (file) =>
        file.path &&
        file.content
    );
}

export async function GET(
  request: Request
) {
  try {
    const url =
      new URL(request.url);

    const projectId =
      String(
        url.searchParams.get(
          "projectId"
        ) ?? ""
      ).trim();

    if (!projectId) {
      return NextResponse.json(
        {
          error:
            "projectId est requis.",
        },
        { status: 400 }
      );
    }

    const versions =
      await prisma.projectVersion.findMany({
        where: {
          projectId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 30,
      });

    return NextResponse.json({
      success: true,
      versions: versions.map(
        (version) => ({
          id: version.id,
          label: version.label,
          description:
            version.description,
          createdAt:
            version.createdAt,
        })
      ),
    });
  } catch (error) {
    console.error(
      "Erreur Builder Versions GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de charger l'historique.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const projectId =
      String(
        body.projectId ?? ""
      ).trim();

    const label =
      String(
        body.label ??
          "Version manuelle"
      ).trim();

    const description =
      String(
        body.description ?? ""
      ).trim();

    if (!projectId) {
      return NextResponse.json(
        {
          error:
            "projectId est requis.",
        },
        { status: 400 }
      );
    }

    const project =
      await prisma.project.findUnique({
        where: {
          id: projectId,
        },
        include: {
          files: {
            where: {
              status: "READY",
            },
            orderBy: {
              name: "asc",
            },
          },
        },
      });

    if (!project) {
      return NextResponse.json(
        {
          error:
            "Projet introuvable.",
        },
        { status: 404 }
      );
    }

    const files =
      snapshotFiles(project.files);

    const version =
      await prisma.projectVersion.create({
        data: {
          projectId:
            project.id,
          label,
          description:
            description || null,
          files,
        },
      });

    return NextResponse.json({
      success: true,
      version: {
        id: version.id,
        label: version.label,
        description:
          version.description,
        createdAt:
          version.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "Erreur Builder Versions POST:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de créer la version.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request
) {
  try {
    const body =
      await request.json();

    const projectId =
      String(
        body.projectId ?? ""
      ).trim();

    const versionId =
      String(
        body.versionId ?? ""
      ).trim();

    if (
      !projectId ||
      !versionId
    ) {
      return NextResponse.json(
        {
          error:
            "projectId et versionId sont requis.",
        },
        { status: 400 }
      );
    }

    const [project, version] =
      await Promise.all([
        prisma.project.findUnique({
          where: {
            id: projectId,
          },
          include: {
            files: {
              where: {
                status: "READY",
              },
            },
          },
        }),

        prisma.projectVersion.findFirst({
          where: {
            id: versionId,
            projectId,
          },
        }),
      ]);

    if (!project) {
      return NextResponse.json(
        {
          error:
            "Projet introuvable.",
        },
        { status: 404 }
      );
    }

    if (!version) {
      return NextResponse.json(
        {
          error:
            "Version introuvable.",
        },
        { status: 404 }
      );
    }

    if (
      !Array.isArray(version.files)
    ) {
      return NextResponse.json(
        {
          error:
            "Snapshot de version invalide.",
        },
        { status: 400 }
      );
    }

    const restoreFiles =
      version.files
        .map((raw) => {
          if (
            !raw ||
            typeof raw !== "object"
          ) {
            return null;
          }

          const file =
            raw as Record<
              string,
              unknown
            >;

          const path =
            String(
              file.path ?? ""
            ).trim();

          const content =
            String(
              file.content ?? ""
            );

          if (
            !path ||
            !content
          ) {
            return null;
          }

          return {
            path,
            content,
            mimeType:
              file.mimeType
                ? String(
                    file.mimeType
                  )
                : "text/plain",
          };
        })
        .filter(
          (
            file
          ): file is {
            path: string;
            content: string;
            mimeType: string;
          } =>
            file !== null
        );

    if (!restoreFiles.length) {
      return NextResponse.json(
        {
          error:
            "Cette version ne contient aucun fichier.",
        },
        { status: 400 }
      );
    }

    const currentSnapshot =
      snapshotFiles(
        project.files
      );

    await prisma.$transaction(
      async (tx) => {
        await tx.projectVersion.create({
          data: {
            projectId:
              project.id,
            label:
              "Sauvegarde avant restauration",
            description:
              `Créée automatiquement avant restauration de ${version.label || version.id}.`,
            files:
              currentSnapshot,
          },
        });

        await tx.fileAsset.deleteMany({
          where: {
            projectId:
              project.id,
            status:
              "READY",
          },
        });

        for (
          const file
          of restoreFiles
        ) {
          await tx.fileAsset.create({
            data: {
              workspaceId:
                project.workspaceId,
              projectId:
                project.id,
              name:
                file.path,
              mimeType:
                file.mimeType,
              status:
                "READY",
              metadata: {
                kind:
                  "generated-source",
                path:
                  file.path,
                content:
                  file.content,
                restoredFrom:
                  version.id,
                restoredAt:
                  new Date().toISOString(),
              },
            },
          });
        }
      }
    );

    const restored =
      await prisma.project.findUnique({
        where: {
          id: project.id,
        },
        include: {
          files: {
            where: {
              status: "READY",
            },
            orderBy: {
              name: "asc",
            },
          },
        },
      });

    const files =
      snapshotFiles(
        restored?.files ?? []
      );

    return NextResponse.json({
      success: true,
      versionId:
        version.id,
      files,
    });
  } catch (error) {
    console.error(
      "Erreur Builder Versions PATCH:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de restaurer cette version.",
      },
      { status: 500 }
    );
  }
}
