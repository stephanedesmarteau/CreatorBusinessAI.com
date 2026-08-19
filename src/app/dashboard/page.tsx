const modules = [
  {
    title: "AI Business Builder",
    description:
      "Transformez une idée en concept d'entreprise, positionnement, offre, plan d'affaires et plan d'exécution.",
    action: "Créer un business",
    icon: "✦",
  },
  {
    title: "Website & App Builder",
    description:
      "Préparez la structure, le contenu et la base technique de sites web et d'applications modernes.",
    action: "Créer un projet",
    icon: "◈",
  },
  {
    title: "Marketing & Growth",
    description:
      "Générez campagnes, contenu, SEO, tunnels de vente et stratégies d'acquisition.",
    action: "Lancer une campagne",
    icon: "↗",
  },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-72 border-r border-white/10 px-6 py-8 lg:block">
          <div className="text-xl font-bold">
            CreatorBusiness<span className="text-blue-400">AI</span>
          </div>

          <nav className="mt-10 space-y-2 text-sm">
            <a
              href="/dashboard"
              className="block rounded-xl bg-white/10 px-4 py-3 font-semibold"
            >
              Tableau de bord
            </a>
            <a
              href="#assistant"
              className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-white/5"
            >
              Assistant IA
            </a>
            <a
              href="#modules"
              className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-white/5"
            >
              Outils IA
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
              <p className="text-sm font-semibold text-blue-400">
                CREATORBUSINESSAI COMMAND CENTER
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Bonjour, créons quelque chose de grand.
              </h1>
              <p className="mt-3 max-w-2xl text-slate-400">
                Une seule plateforme pour concevoir, lancer et développer vos
                projets avec l'intelligence artificielle.
              </p>
            </div>

            <button className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20">
              + Nouveau projet
            </button>
          </header>

          <section
            id="assistant"
            className="mt-8 rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-500/15 via-slate-900 to-slate-900 p-6 sm:p-8"
          >
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-300">
                Assistant IA central
              </div>

              <h2 className="text-2xl font-bold sm:text-3xl">
                Que voulez-vous créer aujourd'hui ?
              </h2>

              <p className="mt-3 text-slate-400">
                Décrivez votre idée, votre entreprise ou votre objectif. Le
                moteur CreatorBusinessAI vous aidera à choisir les bons outils
                et à structurer les prochaines étapes.
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-3">
                <textarea
                  className="min-h-32 w-full resize-none bg-transparent p-3 text-white outline-none placeholder:text-slate-500"
                  placeholder="Exemple : Je veux lancer une entreprise de services au Québec avec un site web, une stratégie marketing et un plan de revenus..."
                />
                <div className="flex justify-end">
                  <button className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950">
                    Générer avec l'IA →
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section id="modules" className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-400">
                  MOTEURS CREATORBUSINESSAI
                </p>
                <h2 className="mt-2 text-2xl font-bold">Vos outils principaux</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-3">
              {modules.map((module) => (
                <article
                  key={module.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-blue-400/40 hover:bg-white/[0.06]"
                >
                  <div className="text-3xl text-blue-400">{module.icon}</div>
                  <h3 className="mt-5 text-xl font-bold">{module.title}</h3>
                  <p className="mt-3 min-h-24 leading-7 text-slate-400">
                    {module.description}
                  </p>
                  <button className="mt-6 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/10">
                    {module.action} →
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm text-slate-500">Projets actifs</p>
              <p className="mt-2 text-3xl font-bold">0</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm text-slate-500">Générations IA</p>
              <p className="mt-2 text-3xl font-bold">0</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm text-slate-500">Statut</p>
              <p className="mt-2 text-lg font-bold text-emerald-400">
                Système prêt
              </p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
