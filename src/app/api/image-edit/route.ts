import OpenAI, { toFile } from "openai";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAIModel } from "@/lib/ai/providers";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "La clé API OpenAI est manquante." },
        { status: 500 }
      );
    }

    const maxImageBytes = 10 * 1024 * 1024;
    if (Number(request.headers.get("content-length")) > 2 * maxImageBytes + 65536) {
      return NextResponse.json({ error: "Images trop volumineuses." }, { status: 413 });
    }
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Formulaire image invalide." }, { status: 400 });
    }

    const image = formData.get("image");
    const mask = formData.get("mask");
    const editMode = String(formData.get("editMode") ?? "full");
    const prompt = String(formData.get("prompt") ?? "").trim();
    const size = String(formData.get("size") ?? "1024x1024");
    const quality = String(formData.get("quality") ?? "medium");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "Veuillez importer une image." },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Veuillez indiquer la modification souhaitée." },
        { status: 400 }
      );
    }

    if (prompt.length > 12000) {
      return NextResponse.json({ error: "Instruction trop longue." }, { status: 413 });
    }
    if (
      !["full", "mask"].includes(editMode) ||
      !["1024x1024", "1536x1024", "1024x1536"].includes(size) ||
      !["low", "medium", "high"].includes(quality) ||
      (editMode === "mask" && !(mask instanceof File))
    ) {
      return NextResponse.json({ error: "Paramètres image invalides." }, { status: 400 });
    }
    const images = editMode === "mask" && mask instanceof File ? [image, mask] : [image];
    for (const file of images) {
      if (file.size > maxImageBytes) {
        return NextResponse.json({ error: "Image trop volumineuse (10 Mo maximum)." }, { status: 413 });
      }
      if (!file.size || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        return NextResponse.json({ error: "Format image invalide (PNG, JPEG ou WebP requis)." }, { status: 400 });
      }
    }

    const bytes = Buffer.from(await image.arrayBuffer());

    const upload = await toFile(
      bytes,
      image.name || "source-image.png",
      {
        type: image.type || "image/png",
      }
    );

    let maskUpload;

    if (editMode === "mask" && mask instanceof File) {
      const maskBytes = Buffer.from(await mask.arrayBuffer());

      maskUpload = await toFile(
        maskBytes,
        mask.name || "mask.png",
        {
          type: mask.type || "image/png",
        }
      );
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.images.edit({
      model: getAIModel("image").id,
      image: upload,
      ...(maskUpload ? { mask: maskUpload } : {}),
      prompt,
      size: size as "1024x1024" | "1536x1024" | "1024x1536",
      quality: quality as "low" | "medium" | "high",
    });

    const editedImage = response.data?.[0];

    if (!editedImage) {
      throw new Error("Aucune image modifiée n'a été générée.");
    }

    if (editedImage.b64_json) {
      return NextResponse.json({
        success: true,
        image: {
          type: "base64",
          data: editedImage.b64_json,
          mimeType: "image/png",
        },
      });
    }

    if (editedImage.url) {
      return NextResponse.json({
        success: true,
        image: {
          type: "url",
          data: editedImage.url,
          mimeType: "image/png",
        },
      });
    }

    throw new Error("Format d'image inattendu.");
  } catch (error) {
    console.error("Erreur Image Edit:", error);

    return NextResponse.json(
      {
        error: "Une erreur est survenue pendant l'édition de l'image.",
      },
      { status: 500 }
    );
  }
}
