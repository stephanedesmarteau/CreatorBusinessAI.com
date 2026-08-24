import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type ResearchSource = {
  title: string;
  url: string;
};

export type ResearchResult = {
  text: string;
  sources: ResearchSource[];
};

function extractSources(response: any): ResearchSource[] {
  const sources: ResearchSource[] = [];
  const seen = new Set<string>();

  for (const item of response.output ?? []) {
    if (item?.type !== "web_search_call") continue;

    const rawSources = item?.action?.sources;

    if (!Array.isArray(rawSources)) continue;

    for (const source of rawSources) {
      const url = String(source?.url ?? "").trim();
      const title = String(
        source?.title ?? source?.url ?? ""
      ).trim();

      if (!url || seen.has(url)) continue;

      seen.add(url);

      sources.push({
        title: title || url,
        url,
      });
    }
  }

  return sources;
}

export async function researchWeb(
  query: string
): Promise<ResearchResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "La clé API OpenAI est manquante."
    );
  }

  const cleanQuery = query.trim();

  if (!cleanQuery) {
    throw new Error(
      "La demande de recherche est vide."
    );
  }

  const response = await client.responses.create({
    model: "gpt-5.6-sol",
    reasoning: {
      effort: "low",
    },
    tools: [
      {
        type: "web_search_preview",
      },
    ],
    include: [
      "web_search_call.action.sources",
    ],
    input: [
      {
        role: "developer",
        content: `
Tu es le Research Engine de CreatorBusinessAI.

Tu disposes d'une recherche Web réelle.

Objectifs :
- rechercher les informations nécessaires ;
- privilégier les sources récentes et officielles ;
- comparer plusieurs sources lorsque pertinent ;
- distinguer clairement faits, estimations et opinions ;
- vérifier les dates ;
- éviter les affirmations non soutenues ;
- signaler les incertitudes ;
- produire une synthèse directement exploitable.

Pour les sujets canadiens, privilégie lorsque pertinent :
- Gouvernement du Canada ;
- Statistique Canada ;
- autorités provinciales ;
- BDC ;
- organismes réglementaires ;
- associations sectorielles reconnues ;
- sources primaires des entreprises concernées.

Réponds en français sauf demande contraire.
        `.trim(),
      },
      {
        role: "user",
        content: cleanQuery,
      },
    ],
  });

  return {
    text:
      response.output_text ||
      "La recherche n'a retourné aucun texte.",
    sources: extractSources(response),
  };
}
