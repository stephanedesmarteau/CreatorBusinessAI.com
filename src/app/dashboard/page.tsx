import { getCurrentUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";

const modules = [
  {
    title: "AI Business Builder",
    description:
      "Transformez une idée en concept d'entreprise, positionnement, offre, plan d'affaires et plan d'exécution grâce aux 50+ moteurs IA.",
    action: "Créer une compagnie",
    icon: "✦",
  },
  {
    title: "Website & App Builder",
    description:
      "Préparez la structure, le contenu et le code de tout exemple de site web et d'application mobile moderne.",
    action: "Créer un projet",
    icon: "◈",
  },
  {
    title: "Méta-Moteur Réponse à Tout",
    description:
      "Interrogez simultanément les 50 meilleurs modèles d'IA au monde pour obtenir la meilleure solution du marché dans tous les domaines.",
    action: "Interroger le Méta-Moteur",
    icon: "↗",
  },
];

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-72 border-r border-white/10 px-6 py-8 lg:block">
          <div className="text-xl font-bold">
            NaturalCreator<span className="text-emerald-400">AI</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">www.naturalcreatorai.com</p>

          <nav className="mt-10 space-y-2 text-sm">
            <a
              href="/dashboard"
              className="block rounded-xl bg-white/10 px-4 py-3 font-semibold"
            >
              Espace Client
            </a>
            <a
              href="/ai"
              className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-white/5"
            >
              Méta-Moteur 50+ IA
            </a>
            <a
              href="/builder"
              className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-white/5"
            >
              Web & App Builder
            </a>
            <a
              href="/business-builder"
              className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-white/5"
            >
              Business Builder
            </a>
            <a
              href="/"
              className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-white/5"
            >
              Retour au site
            </a>
          </nav>
        </aside>

        <section className="flex-1 px-6 py-8 lg:px-10">
          <header className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                NATURALCREATORAI ESPACE CLIENT
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Bonjour, créons la meilleure solution du marché.
              </h1>
              <p className="mt-3 max-w-2xl text-slate-400">
                Une seule plateforme réunissant les 50 meilleurs moteurs d'intelligence artificielle au monde pour créer vos entreprises, applications mobiles, sites web et répondre à tous vos besoins.
              </p>
            </div>

            <a
              href="/ai"
              className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20"
            >
              + Poser une question aux 50+ IA
            </a>
          </header>

          <section
            id="assistant"
            className="mt-8 rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-900 p-6 sm:p-8"
          >
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                Méta-Moteur 50+ IA • NaturalCreatorAI
              </div>

              <h2 className="text-2xl font-bold sm:text-3xl">
                Que voulez-vous créer ou résoudre aujourd'hui ?
              </h2>

              <p className="mt-3 text-slate-400">
                Posez votre question ou décrivez votre projet. NaturalCreatorAI interroge simultanément les 50 meilleurs moteurs IA et synthétise la meilleure solution globale du marché.
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-3">
                <textarea
                  className="min-h-32 w-full resize-none bg-transparent p-3 text-white outline-none placeholder:text-slate-500"
                  placeholder="Exemple : Je veux créer une application mobile iOS/Android, un site web et une compagnie dans le domaine des services financiers..."
                />
                <div className="flex justify-end">
                  <a
                    href="/ai"
                    className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950"
                  >
                    Interroger les 50 Moteurs IA →
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section id="modules" className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  ÉCOSYSTÈME NATURALCREATORAI
                </p>
                <h2 className="mt-2 text-2xl font-bold">Vos outils principaux</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-3">
              {modules.map((module) => (
                <article
                  key={module.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-emerald-400/40 hover:bg-white/[0.06]"
                >
                  <div className="text-3xl text-emerald-400">{module.icon}</div>
                  <h3 className="mt-5 text-xl font-bold">{module.title}</h3>
                  <p className="mt-3 min-h-24 leading-7 text-slate-400">
                    {module.description}
                  </p>
                  {module.title === "AI Business Builder" ? (
                    <a
                      href="/business-builder"
                      className="mt-6 inline-block rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/10"
                    >
                      {module.action} →
                    </a>
                  ) : module.title === "Website & App Builder" ? (
                    <a
                      href="/builder"
                      className="mt-6 inline-block rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/10"
                    >
                      {module.action} →
                    </a>
                  ) : (
                    <a
                      href="/ai"
                      className="mt-6 inline-block rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/10"
                    >
                      {module.action} →
                    </a>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm text-slate-500">Moteurs IA Connectés</p>
              <p className="mt-2 text-3xl font-bold text-emerald-400">50 / 50</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm text-slate-500">Espace Client</p>
              <p className="mt-2 text-xl font-bold text-white">Actif (Business Suite)</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm text-slate-500">Statut du Méta-Moteur</p>
              <p className="mt-2 text-lg font-bold text-emerald-400">
                Opérationnel
              </p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
