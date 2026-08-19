export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="text-xl font-bold">
          CreatorBusiness<span className="text-blue-600">AI</span>
        </div>

        <div className="hidden gap-8 text-sm font-medium md:flex">
          <a href="#features">Fonctionnalités</a>
          <a href="#solutions">Solutions</a>
          <a href="#pricing">Tarifs</a>
        </div>

        <button className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
          Commencer
        </button>
      </nav>

      <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-24 text-center">
        <div className="mb-6 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
          Votre entreprise propulsée par l'intelligence artificielle
        </div>

        <h1 className="max-w-5xl text-5xl font-bold tracking-tight sm:text-7xl">
          Imaginez. Créez. Lancez.
          <span className="block text-blue-600">
            L'IA construit votre entreprise.
          </span>
        </h1>

        <p className="mt-8 max-w-3xl text-lg leading-8 text-slate-600">
          CreatorBusinessAI réunit les outils nécessaires pour transformer une
          idée en entreprise : stratégie, image de marque, sites web,
          applications, marketing, contenu et automatisation.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <button className="rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-lg">
            Créer mon entreprise
          </button>

          <button className="rounded-xl border border-slate-300 px-8 py-4 font-semibold">
            Découvrir la plateforme
          </button>
        </div>
      </section>

      <section
        id="features"
        className="mx-auto grid max-w-7xl gap-6 px-6 pb-24 md:grid-cols-3"
      >
        <div className="rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="mb-4 text-3xl">✦</div>
          <h2 className="text-xl font-bold">AI Business Builder</h2>
          <p className="mt-3 text-slate-600">
            Passez de votre idée à un plan d'affaires structuré et exploitable.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="mb-4 text-3xl">◈</div>
          <h2 className="text-xl font-bold">Website & App Builder</h2>
          <p className="mt-3 text-slate-600">
            Préparez des sites web et applications modernes à partir de vos
            objectifs.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="mb-4 text-3xl">↗</div>
          <h2 className="text-xl font-bold">AI Growth Engine</h2>
          <p className="mt-3 text-slate-600">
            Créez vos campagnes, contenus, stratégies SEO et automatisations.
          </p>
        </div>
      </section>

      <section
        id="solutions"
        className="border-y border-slate-200 bg-slate-50 py-20"
      >
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
            Une plateforme. Plusieurs moteurs IA.
          </p>

          <h2 className="mt-4 text-4xl font-bold">
            Construisez plus vite avec CreatorBusinessAI
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-slate-600">
            Une base pour centraliser création, stratégie, développement,
            marketing et croissance dans un même environnement.
          </p>
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-6 py-10 text-center text-sm text-slate-500">
        © 2026 CreatorBusinessAI.com
      </footer>
    </main>
  );
}
