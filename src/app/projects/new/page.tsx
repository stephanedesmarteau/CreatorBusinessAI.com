"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de créer le projet.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de créer le projet."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mb-8 text-sm font-semibold text-slate-400 hover:text-white"
        >
          ← Retour au tableau de bord
        </button>

        <p className="text-sm font-semibold text-blue-400">
          CREATORBUSINESSAI
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Nouveau projet
        </h1>

        <p className="mt-3 text-slate-400">
          Créez un espace de travail dédié à votre nouvelle idée ou entreprise.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-3xl border border-white/10 bg-slate-900 p-6"
        >
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-semibold"
            >
              Nom du projet
            </label>

            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="Ex. Nouvelle entreprise IA"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-semibold"
            >
              Description
            </label>

            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              placeholder="Décrivez brièvement votre projet..."
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-400">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-500 px-5 py-3 font-bold text-white disabled:opacity-50"
          >
            {loading ? "Création..." : "Créer le projet"}
          </button>
        </form>
      </div>
    </main>
  );
}
