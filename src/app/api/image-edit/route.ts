import OpenAI, { toFile } from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "La clé API OpenAI est manquante." },
        { status: 500 }
      );
    }

    const formData = await request.formData();

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

    const response = await client.images.edit({
      model: "gpt-image-2",
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
