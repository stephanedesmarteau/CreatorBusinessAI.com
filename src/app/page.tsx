import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white selection:bg-blue-500 selection:text-white">
      {/* Navigation */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between border-b border-white/10 px-6 py-5">
        <Link href="/" className="text-xl font-black tracking-tight">
          CreatorBusiness<span className="text-blue-500">AI</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
          <a href="#engines" className="transition hover:text-white">
            Moteurs IA
          </a>
          <a href="#features" className="transition hover:text-white">
            Fonctionnalités
          </a>
          <a href="#pricing" className="transition hover:text-white">
            Tarifs Payants
          </a>
          <Link href="/dashboard" className="transition hover:text-blue-400">
            Espace Client
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="hidden text-sm font-semibold text-slate-300 transition hover:text-white sm:block"
          >
            Se connecter
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500"
          >
            Espace Client →
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-24 text-center">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-300">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            La suite IA tout-en-un la plus puissante du marché
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-7xl">
            Créez des Entreprises, Sites Web & Applications avec{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent">
              l'IA Ultime
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
            Profitez des moteurs d'intelligence artificielle les plus performants à ce jour (GPT-4o, Claude 3.5 Sonnet, Sora-2, DALL-E 3, ElevenLabs) réunis dans une plateforme payante complète avec Espace Client dédié.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="w-full rounded-2xl bg-blue-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-blue-600/30 transition hover:bg-blue-500 sm:w-auto"
            >
              Accéder à l'Espace Client
            </Link>
            <Link
              href="/business-builder"
              className="w-full rounded-2xl border border-white/15 bg-white/[0.05] px-8 py-4 text-base font-bold transition hover:bg-white/10 sm:w-auto"
            >
              Lancer le Business Builder
            </Link>
          </div>
        </div>
      </section>

      {/* AI Engines Section */}
      <section id="engines" className="border-t border-white/10 bg-black/40 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400">
              Technologie de Pointe
            </p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              Les Moteurs IA les plus Performants Réunis
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              Notre Orchestrateur multi-agents sélectionne dynamiquement le meilleur modèle pour chaque tâche spécifique.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-blue-500/40">
              <div className="text-xs font-bold text-blue-400">RAISONNEMENT & CODE</div>
              <h3 className="mt-2 text-xl font-bold">GPT-4o & Claude 3.5</h3>
              <p className="mt-3 text-sm text-slate-400 leading-6">
                Architecture logicielle, code d'application mobile et web, analyse financière et réflexion stratégique poussée.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-fuchsia-500/40">
              <div className="text-xs font-bold text-fuchsia-400">GÉNÉRATION VISUELLE</div>
              <h3 className="mt-2 text-xl font-bold">DALL-E 3 & Image Engine</h3>
              <p className="mt-3 text-sm text-slate-400 leading-6">
                Maquettes ultra-réalistes, identité visuelle d'entreprise, retouche d'image et éléments graphiques haute définition.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-cyan-500/40">
              <div className="text-xs font-bold text-cyan-400">PRODUCTION VIDÉO</div>
              <h3 className="mt-2 text-xl font-bold">Sora-2 & Video Engine</h3>
              <p className="mt-3 text-sm text-slate-400 leading-6">
                Création de spots publicitaires, démos de produits animées et contenus vidéo haute qualité pour vos campagnes.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-emerald-500/40">
              <div className="text-xs font-bold text-emerald-400">VOIX & AUDIO</div>
              <h3 className="mt-2 text-xl font-bold">ElevenLabs Voice Engine</h3>
              <p className="mt-3 text-sm text-slate-400 leading-6">
                Doublage réaliste, synthèse vocale premium, voix-off et transcription intelligente multilingue.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Capabilities Section */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400">
              Possibilités Infinies
            </p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              Tout ce que vous pouvez construire avec CreatorBusinessAI
            </h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 flex flex-col justify-between transition hover:border-blue-400/50">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl font-bold mb-6">
                  💼
                </div>
                <h3 className="text-2xl font-bold">Création de Compagnies & Plans d'Affaires</h3>
                <p className="mt-4 text-slate-300 leading-7">
                  Générez un plan d'affaires complet : étude de marché, modèle de revenus, stratégie financière, score de viabilité et plan d'exécution à 30/60/90 jours.
                </p>
              </div>
              <Link
                href="/business-builder"
                className="mt-8 inline-flex items-center text-sm font-bold text-blue-400 hover:text-blue-300"
              >
                Créer une Entreprise →
              </Link>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 flex flex-col justify-between transition hover:border-fuchsia-400/50">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center text-2xl font-bold mb-6">
                  📱
                </div>
                <h3 className="text-2xl font-bold">Sites Web & Applications Mobiles</h3>
                <p className="mt-4 text-slate-300 leading-7">
                  Générez l'architecture, les composants frontend/backend et le code complet pour vos applications web, mobile et SaaS avec prévisualisation en direct.
                </p>
              </div>
              <Link
                href="/builder"
                className="mt-8 inline-flex items-center text-sm font-bold text-fuchsia-400 hover:text-fuchsia-300"
              >
                Lancer le Web & App Builder →
              </Link>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 flex flex-col justify-between transition hover:border-cyan-400/50">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-2xl font-bold mb-6">
                  ⚡
                </div>
                <h3 className="text-2xl font-bold">Super AI & Réponse à Tout</h3>
                <p className="mt-4 text-slate-300 leading-7">
                  Un assistant central doté d'une mémoire persistante et d'un orchestrateur multi-agents pour répondre à tous vos besoins marketing, stratégiques et techniques.
                </p>
              </div>
              <Link
                href="/ai"
                className="mt-8 inline-flex items-center text-sm font-bold text-cyan-400 hover:text-cyan-300"
              >
                Ouvrir AI Central →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Espace Client & Pricing Section */}
      <section id="pricing" className="border-t border-white/10 bg-black/60 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400">
              Abonnements & Espace Client
            </p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              Choisissez votre plan et accédez à l'Espace Client
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              Débloquez la puissance maximale de nos moteurs IA payants avec un Espace Client sécurisé et dédié.
            </p>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {/* Plan Pro */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold">Pro Creator</h3>
                <p className="mt-2 text-sm text-slate-400">Pour les créateurs et entrepreneurs individuels.</p>
                <div className="mt-6">
                  <span className="text-4xl font-extrabold">49$</span>
                  <span className="text-slate-400"> / mois</span>
                </div>
                <ul className="mt-8 space-y-4 text-sm text-slate-300">
                  <li className="flex items-center gap-3">✓ Accès à l'Espace Client dédié</li>
                  <li className="flex items-center gap-3">✓ GPT-4o & Claude 3.5 Sonnet</li>
                  <li className="flex items-center gap-3">✓ AI Business Builder (10 plans/mois)</li>
                  <li className="flex items-center gap-3">✓ Website & App Builder (5 projets)</li>
                  <li className="flex items-center gap-3">✓ Génération d'images HD (100/mois)</li>
                </ul>
              </div>
              <Link
                href="/dashboard"
                className="mt-8 block rounded-xl border border-white/20 bg-white/10 py-3.5 text-center text-sm font-bold transition hover:bg-white/20"
              >
                Choisir le Plan Pro
              </Link>
            </div>

            {/* Plan Business */}
            <div className="relative rounded-3xl border-2 border-blue-500 bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-900 p-8 flex flex-col justify-between shadow-2xl shadow-blue-500/20">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-4 py-1 text-xs font-bold text-white uppercase tracking-wider">
                Le Plus Populaire
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Business Suite</h3>
                <p className="mt-2 text-sm text-slate-300">Pour les entreprises et créateurs exigeants.</p>
                <div className="mt-6">
                  <span className="text-5xl font-extrabold text-white">149$</span>
                  <span className="text-slate-300"> / mois</span>
                </div>
                <ul className="mt-8 space-y-4 text-sm text-slate-200">
                  <li className="flex items-center gap-3">✓ Espace Client avec workspaces illimités</li>
                  <li className="flex items-center gap-3">✓ Moteurs IA Ultime & Super Orchestrator</li>
                  <li className="flex items-center gap-3">✓ AI Business Builder & Plans illimités</li>
                  <li className="flex items-center gap-3">✓ Builder Web & App complet avec export ZIP</li>
                  <li className="flex items-center gap-3">✓ Génération Vidéo (Sora-2) & Voix ElevenLabs</li>
                  <li className="flex items-center gap-3">✓ Compilation et déploiement en direct</li>
                </ul>
              </div>
              <Link
                href="/dashboard"
                className="mt-8 block rounded-xl bg-blue-600 py-4 text-center text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
              >
                Commencer avec Business Suite →
              </Link>
            </div>

            {/* Plan Enterprise */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold">Enterprise AI</h3>
                <p className="mt-2 text-slate-400 text-sm">Pour les agences et grandes organisations.</p>
                <div className="mt-6">
                  <span className="text-4xl font-extrabold">399$</span>
                  <span className="text-slate-400"> / mois</span>
                </div>
                <ul className="mt-8 space-y-4 text-sm text-slate-300">
                  <li className="flex items-center gap-3">✓ Espace Client Agence Multi-utilisateurs</li>
                  <li className="flex items-center gap-3">✓ Accès API direct & limites prioritaires</li>
                  <li className="flex items-center gap-3">✓ Tous les moteurs IA sans restriction</li>
                  <li className="flex items-center gap-3">✓ Support dédié 24/7 & intégration sur-mesure</li>
                  <li className="flex items-center gap-3">✓ Mémoire d'entreprise persistante avancée</li>
                </ul>
              </div>
              <Link
                href="/dashboard"
                className="mt-8 block rounded-xl border border-white/20 bg-white/10 py-3.5 text-center text-sm font-bold transition hover:bg-white/20"
              >
                Contacter l'équipe Enterprise
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-10 text-center text-sm text-slate-500">
        <p>© 2026 CreatorBusinessAI.com — La plateforme IA d'entreprise ultime.</p>
      </footer>
    </main>
  );
}
