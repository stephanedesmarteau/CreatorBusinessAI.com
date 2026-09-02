import Link from "next/link";
import { NaturalCreatorLogo } from "@/components/logo";
import { SloganBanner } from "@/components/slogan-banner";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white selection:bg-emerald-500 selection:text-white">
      {/* Navigation */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between border-b border-white/10 px-6 py-5">
        <Link href="/" className="hover:opacity-95 transition">
          <NaturalCreatorLogo className="h-10" />
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
          <a href="#slogan" className="transition hover:text-white">
            Slogan Multilingue
          </a>
          <a href="#engines" className="transition hover:text-white">
            Les 50+ Moteurs IA
          </a>
          <a href="#features" className="transition hover:text-white">
            Meta-Orchestrateur
          </a>
          <a href="#pricing" className="transition hover:text-white">
            Tarifs Payants
          </a>
          <Link href="/dashboard" className="transition hover:text-emerald-400">
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
            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
          >
            Espace Client →
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20 text-center">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex justify-center">
            <NaturalCreatorLogo className="h-16 scale-110" />
          </div>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Meta-Moteur IA Mondial • www.naturalcreatorai.com
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-7xl">
            Les 50 Meilleurs Moteurs IA au Monde Interrogés pour{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Chaque Requête
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
            <strong>NaturalCreatorAI</strong> rassemble la puissance brute des 50 plus grands modèles d'IA au monde (GPT-4o/o3, Claude 3.7, Gemini 2.0, DeepSeek R1, Sora-2, Runway Gen-3, Midjourney, ElevenLabs, Perplexity). Notre méta-moteur analyse, interroge et synthétise simultanément la meilleure réponse et la solution la plus performante du marché dans tous les domaines.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="w-full rounded-2xl bg-emerald-500 px-8 py-4 text-base font-bold text-slate-950 shadow-xl shadow-emerald-500/30 transition hover:bg-emerald-400 sm:w-auto"
            >
              Accéder à l'Espace Client
            </Link>
            <Link
              href="/ai"
              className="w-full rounded-2xl border border-white/15 bg-white/[0.05] px-8 py-4 text-base font-bold transition hover:bg-white/10 sm:w-auto"
            >
              Tester le Méta-Moteur 50+ IA
            </Link>
          </div>
        </div>
      </section>

      {/* Slogan Banner Section */}
      <section id="slogan" className="px-6 py-6">
        <SloganBanner />
      </section>

      {/* 50+ AI Engines Showcase Section */}
      <section id="engines" className="border-t border-white/10 bg-black/40 py-20 mt-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              L'Écosystème le plus Puissant de la Planète
            </p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              50+ Moteurs IA Réunis en Une Seule Interface
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              Pour chaque question, le méta-orchestrateur NaturalCreatorAI pose la question en parallèle aux meilleurs moteurs mondiaux et ne vous livre que la solution ultime.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-emerald-500/40">
              <div className="text-xs font-bold text-emerald-400">RAISONNEMENT & CODE (15 MOTEURS)</div>
              <h3 className="mt-2 text-xl font-bold">GPT-4o, Claude 3.7 & DeepSeek R1</h3>
              <p className="mt-3 text-sm text-slate-400 leading-6">
                Interrogation croisée de GPT-4o, Claude 3.7 Sonnet, DeepSeek R1, Gemini 2.0 Pro et Mistral Large pour générer du code parfait, des apps mobiles et des architectures logicielles sans failles.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-cyan-500/40">
              <div className="text-xs font-bold text-cyan-400">BUSINESS & STRATÉGIE (10 MOTEURS)</div>
              <h3 className="mt-2 text-xl font-bold">Perplexity, O3 & Business Engine</h3>
              <p className="mt-3 text-sm text-slate-400 leading-6">
                Recherche financière en temps réel, création de compagnies, plans d'affaires avec score de viabilité et modélisation des revenus ultra-précise.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-fuchsia-500/40">
              <div className="text-xs font-bold text-fuchsia-400">GÉNÉRATION VISUELLE & MAQUETTES (12 MOTEURS)</div>
              <h3 className="mt-2 text-xl font-bold">Midjourney, Flux1 & DALL-E 3</h3>
              <p className="mt-3 text-sm text-slate-400 leading-6">
                Combinaison des meilleurs générateurs visuels pour créer vos logos, identités de marque, maquettes d'applications et visuels marketing haute qualité.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-amber-500/40">
              <div className="text-xs font-bold text-amber-400">VIDÉO, VOIX & MÉDIAS (13 MOTEURS)</div>
              <h3 className="mt-2 text-xl font-bold">Sora-2, Runway Gen-3 & ElevenLabs</h3>
              <p className="mt-3 text-sm text-slate-400 leading-6">
                Production vidéo cinématique, voix-off haute fidélité, doublage multilingue et transcription instantanée intégrée.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Capabilities Section */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Solution Universelle
            </p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              NaturalCreatorAI Répond à Tout et Tout Exemple de Projet
            </h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 flex flex-col justify-between transition hover:border-emerald-400/50">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-bold mb-6">
                  🏢
                </div>
                <h3 className="text-2xl font-bold">Création de Compagnies & Plan d'Affaires</h3>
                <p className="mt-4 text-slate-300 leading-7">
                  Passez d'une idée à une entreprise opérationnelle : structure juridique, étude de marché mondiale, prévisions financières et feuille de route d'exécution.
                </p>
              </div>
              <Link
                href="/business-builder"
                className="mt-8 inline-flex items-center text-sm font-bold text-emerald-400 hover:text-emerald-300"
              >
                Créer une Compagnie →
              </Link>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 flex flex-col justify-between transition hover:border-cyan-400/50">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-2xl font-bold mb-6">
                  💻
                </div>
                <h3 className="text-2xl font-bold">Tous Exemples de Sites & Apps Mobiles</h3>
                <p className="mt-4 text-slate-300 leading-7">
                  Générez n'importe quel exemple de site web, application iOS/Android, marketplace ou plateforme SaaS avec compilation et prévisualisation instantanée.
                </p>
              </div>
              <Link
                href="/builder"
                className="mt-8 inline-flex items-center text-sm font-bold text-cyan-400 hover:text-cyan-300"
              >
                Générer un Site ou App →
              </Link>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 flex flex-col justify-between transition hover:border-fuchsia-400/50">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center text-2xl font-bold mb-6">
                  ⚡
                </div>
                <h3 className="text-2xl font-bold">Méta-Moteur "Réponse à Tout"</h3>
                <p className="mt-4 text-slate-300 leading-7">
                  Grâce à l'interrogation simultanée des 50 moteurs IA les plus avancés, recevez la réponse la plus pertinente, complète et exacte du marché.
                </p>
              </div>
              <Link
                href="/ai"
                className="mt-8 inline-flex items-center text-sm font-bold text-fuchsia-400 hover:text-fuchsia-300"
              >
                Tester l'IA Universelle →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Espace Client & Pricing Section */}
      <section id="pricing" className="border-t border-white/10 bg-black/60 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Abonnements Payants & Espace Client
            </p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              Accédez à la Plus Puissante IA du Marché
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              Débloquez l'accès complet au Méta-Moteur 50+ IA et gérez tous vos projets dans votre Espace Client dédié.
            </p>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {/* Plan Pro */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold">Pro Creator</h3>
                <p className="mt-2 text-sm text-slate-400">Pour les créateurs et solopreneurs.</p>
                <div className="mt-6">
                  <span className="text-4xl font-extrabold">49$</span>
                  <span className="text-slate-400"> / mois</span>
                </div>
                <ul className="mt-8 space-y-4 text-sm text-slate-300">
                  <li className="flex items-center gap-3">✓ Accès à l'Espace Client sécurisé</li>
                  <li className="flex items-center gap-3">✓ Accès à 15 Moteurs IA principaux</li>
                  <li className="flex items-center gap-3">✓ Business Plan & Création de Compagnie</li>
                  <li className="flex items-center gap-3">✓ Builder Web & Mobile (5 projets)</li>
                  <li className="flex items-center gap-3">✓ Méta-Moteur "Réponse à Tout"</li>
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
            <div className="relative rounded-3xl border-2 border-emerald-500 bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-900 p-8 flex flex-col justify-between shadow-2xl shadow-emerald-500/20">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-xs font-bold text-slate-950 uppercase tracking-wider">
                Le Plus Puissant
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Natural Business Suite</h3>
                <p className="mt-2 text-sm text-slate-300">Pour les entreprises et professionnels exigeants.</p>
                <div className="mt-6">
                  <span className="text-5xl font-extrabold text-white">149$</span>
                  <span className="text-slate-300"> / mois</span>
                </div>
                <ul className="mt-8 space-y-4 text-sm text-slate-200">
                  <li className="flex items-center gap-3">✓ Espace Client Illimité & Workspaces</li>
                  <li className="flex items-center gap-3">✓ Accès complet aux 50+ Moteurs IA</li>
                  <li className="flex items-center gap-3">✓ Interrogation simultanée & Synthèse Ultime</li>
                  <li className="flex items-center gap-3">✓ Builder Web & App avec Export ZIP & Live Preview</li>
                  <li className="flex items-center gap-3">✓ Moteurs Vidéo (Sora-2) & Voix (ElevenLabs)</li>
                  <li className="flex items-center gap-3">✓ Compilation et Déploiement en Direct</li>
                </ul>
              </div>
              <Link
                href="/dashboard"
                className="mt-8 block rounded-xl bg-emerald-500 py-4 text-center text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
              >
                Démarrer la Business Suite →
              </Link>
            </div>

            {/* Plan Enterprise */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold">Enterprise 50+ AI</h3>
                <p className="mt-2 text-slate-400 text-sm">Pour les agences et grandes organisations.</p>
                <div className="mt-6">
                  <span className="text-4xl font-extrabold">399$</span>
                  <span className="text-slate-400"> / mois</span>
                </div>
                <ul className="mt-8 space-y-4 text-sm text-slate-300">
                  <li className="flex items-center gap-3">✓ Espace Client Agence Multi-utilisateurs</li>
                  <li className="flex items-center gap-3">✓ Accès direct aux API des 50 moteurs</li>
                  <li className="flex items-center gap-3">✓ Vitesse d'exécution prioritaire ultra-rapide</li>
                  <li className="flex items-center gap-3">✓ Mémoire d'entreprise persistante avancée</li>
                  <li className="flex items-center gap-3">✓ Support dédié 24/7 & intégration personnalisée</li>
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
      <footer className="border-t border-white/10 px-6 py-12 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-4">
        <NaturalCreatorLogo className="h-8" />
        <p>© 2026 NaturalCreatorAI (www.naturalcreatorai.com) — La plateforme IA la plus puissante du marché.</p>
      </footer>
    </main>
  );
}
