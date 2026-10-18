"use client";
import "./studio.css";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

type Service = { id: number; name: string; description: string };
type Project = {
  email: string;
  business: string;
  activity: string;
  audience: string;
  difference: string;
  tone: string;
  services: Service[];
  generated: boolean;
  published: boolean;
  feedback: number;
  comment: string;
};

const emptyProject: Project = {
  email: "",
  business: "",
  activity: "",
  audience: "",
  difference: "",
  tone: "Clair et professionnel",
  services: [{ id: 1, name: "", description: "" }],
  generated: false,
  published: false,
  feedback: 0,
  comment: ""
};

const labels = ["Activité", "Services", "Génération", "Aperçu"];

export default function StudioPage() {
  const [project, setProject] = useState<Project>(emptyProject);
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showPilot, setShowPilot] = useState(false);
  const projectIdRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const pendingSaveRef = useRef<Project | null>(null);
  const projectGenerationRef = useRef(0);
  const [cloudStatus, setCloudStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const changeVersionRef = useRef(0);

  useEffect(() => {
    projectIdRef.current =
      window.localStorage.getItem("studionova-project-id");

    const stored = window.localStorage.getItem("studionova-project");
    if (stored) {
      try {
        const restored = {
          ...emptyProject,
          ...JSON.parse(stored),
        };
        setProject(restored);
        setStep(restored.generated ? 3 : 0);
      } catch {}
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem("studionova-project", JSON.stringify(project));
      void saveToCloud(project);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [project, loaded]);

  async function saveToCloud(data: Project) {
    if (!data.business.trim()) return;

    pendingSaveRef.current = data;

    if (savingRef.current) return;

    savingRef.current = true;
    const saveGeneration = projectGenerationRef.current;

    try {
      while (pendingSaveRef.current) {
        const current = pendingSaveRef.current;
        const generation = projectGenerationRef.current;
        const savingVersion = changeVersionRef.current;
        pendingSaveRef.current = null;

        setCloudStatus("saving");

        let response: Response;

        try {
          response = await fetch("/api/studionova-projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            projectId: projectIdRef.current,
            data: current,
          }),
        });
        } catch (error) {
          if (generation === projectGenerationRef.current) {
            pendingSaveRef.current ??= current;
          }
          throw error;
        }

        if (!response.ok) {
          if (generation === projectGenerationRef.current) {
            pendingSaveRef.current ??= current;
          }
          throw new Error("Sauvegarde PostgreSQL refusée");
        }

        let result: { success?: boolean; projectId?: string };

        try {
          result = await response.json();
        } catch (error) {
          if (generation === projectGenerationRef.current) {
            pendingSaveRef.current ??= current;
          }
          throw error;
        }

        if (!result.success || !result.projectId) {
          if (generation === projectGenerationRef.current) {
            pendingSaveRef.current ??= current;
          }
          throw new Error("Réponse PostgreSQL invalide");
        }

        if (generation !== projectGenerationRef.current) {
          continue;
        }

        if (savingVersion === changeVersionRef.current && !pendingSaveRef.current) {
          setHasPendingChanges(false);
        }

        projectIdRef.current = result.projectId;

        window.localStorage.setItem(
          "studionova-project-id",
          result.projectId
        );
      }

      if (saveGeneration === projectGenerationRef.current) {
        setCloudStatus("saved");
      }
    } catch (error) {
      console.error("StudioNova sauvegarde cloud :", error);

      if (
        saveGeneration === projectGenerationRef.current &&
        pendingSaveRef.current
      ) {
        setCloudStatus("error");
      }
    } finally {
      savingRef.current = false;

      if (
        saveGeneration !== projectGenerationRef.current &&
        pendingSaveRef.current?.business.trim()
      ) {
        const next = pendingSaveRef.current;
        pendingSaveRef.current = null;
        void saveToCloud(next);
      }
    }
  }

  const [cloudProjects, setCloudProjects] = useState<
    { projectId: string; name: string; data: Project }[]
  >([]);
  const [showCloudProjects, setShowCloudProjects] = useState(false);
  const [loadingCloudProjects, setLoadingCloudProjects] = useState(false);
  const [cloudProjectsError, setCloudProjectsError] = useState("");

  async function loadCloudProjects() {
    setLoadingCloudProjects(true);
    setCloudProjectsError("");

    try {
      const response = await fetch("/api/studionova-projects", {
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Impossible de consulter les projets.");
      }

      const result = await response.json();

      if (!result.success || !Array.isArray(result.projects)) {
        throw new Error("Réponse PostgreSQL invalide.");
      }

      setCloudProjects(result.projects);
      setShowCloudProjects(true);
    } catch (error) {
      setCloudProjectsError(
        error instanceof Error ? error.message : "Erreur de chargement."
      );
    } finally {
      setLoadingCloudProjects(false);
    }
  }

  function openCloudProject(item: {
    projectId: string;
    name: string;
    data: Project;
  }) {
    if (
      !item.projectId ||
      !item.data ||
      typeof item.data.business !== "string" ||
      !Array.isArray(item.data.services)
    ) {
      setCloudProjectsError("Projet sauvegardé invalide.");
      return;
    }

    if (
      savingRef.current ||
      pendingSaveRef.current ||
      cloudStatus === "saving" ||
      cloudStatus === "error"
    ) {
      setCloudProjectsError(
        "Une sauvegarde est en cours ou a échoué. " +
        "Veuillez terminer la sauvegarde avant de changer de projet."
      );
      return;
    }

    if (
      !window.confirm(
        `Ouvrir « ${item.name} » ? Le projet actuellement affiché sera remplacé.`
      )
    ) {
      return;
    }

    const restored = { ...emptyProject, ...item.data };

    projectGenerationRef.current += 1;
    pendingSaveRef.current = null;
    projectIdRef.current = item.projectId;

    window.localStorage.setItem(
      "studionova-project-id",
      item.projectId
    );
    window.localStorage.setItem(
      "studionova-project",
      JSON.stringify(restored)
    );

    setProject(restored);
    setStep(restored.generated ? 3 : 0);
    setHasPendingChanges(false);
    setCloudStatus("saved");
    setCloudProjectsError("");
    setShowCloudProjects(false);
  }

  const update = <K extends keyof Project>(key: K, value: Project[K]) => {
    changeVersionRef.current += 1;
    setHasPendingChanges(true);
    setProject(p => ({ ...p, [key]: value }));
  };
  const canContinue = step === 0 ? Boolean(project.email && project.business && project.activity && project.audience) : step === 1 ? project.services.some(s => s.name.trim()) : true;
  const completed = useMemo(() => {
    let score = 0;
    if (project.business && project.activity && project.audience) score++;
    if (project.services.some(s => s.name)) score++;
    if (project.generated) score++;
    if (project.published) score++;
    return score;
  }, [project]);

  const addService = () => {
    if (project.services.length >= 5) return;
    update("services", [...project.services, { id: Date.now(), name: "", description: "" }]);
  };

  const editService = (id: number, field: "name" | "description", value: string) => {
    update("services", project.services.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const next = () => {
    if (!canContinue) return;
    if (step === 1) {
      update("generated", true);
      setStep(2);
      window.setTimeout(() => setStep(3), 900);
    } else setStep(Math.min(3, step + 1));
  };

  const reset = () => {
    if (!window.confirm("Supprimer le projet sauvegardé dans ce navigateur ?")) return;
    projectGenerationRef.current += 1;
    pendingSaveRef.current = null;
    projectIdRef.current = null;

    window.localStorage.removeItem("studionova-project");
    window.localStorage.removeItem("studionova-project-id");

    setHasPendingChanges(false);
    setCloudStatus("idle");
    setProject(emptyProject);
    setStep(0);
  };

  if (!loaded) return <div className="grid min-h-screen place-items-center text-sm text-muted">Chargement du studio…</div>;

  return (
    <main className="studio-nova min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <span
              role="status"
              aria-live="polite"
              className={`hidden text-xs sm:block ${
                cloudStatus === "saved"
                  ? "text-emerald-600"
                  : cloudStatus === "error"
                    ? "text-red-600"
                    : "text-muted"
              }`}
            >
              {hasPendingChanges
                ? "Enregistrement en cours…"
                : cloudStatus === "saving"
                  ? "Enregistrement en cours…"
                  : cloudStatus === "saved"
                  ? "✓ Enregistré dans PostgreSQL"
                  : cloudStatus === "error"
                    ? "⚠ Sauvegarde non confirmée"
                    : "Sauvegarde automatique"}
            </span>
            <Link href="/" className="button-secondary !px-3 !py-2">Quitter</Link>
          </div>
        </div>
      </header>

      <div className="container-page py-8">
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold text-brand-600">Studio de création MVP</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Construisons votre première présence en ligne</h1>
            <p className="mt-2 text-sm text-muted">Relisez toujours les contenus assistés avant leur utilisation.</p>
          </div>
          <div className="card flex items-center gap-4 px-4 py-3">
            <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${completed * 25}%` }} /></div>
            <span className="text-xs font-bold">{completed}/4 étapes utiles</span>
          </div>
        </div>

        <div className="grid gap-7 lg:grid-cols-[220px_1fr]">
          <aside className="card h-fit p-3">
            {labels.map((label, index) => (
              <button key={label} onClick={() => index <= step || project.generated ? setStep(index) : null} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${step === index ? "bg-brand-50 font-bold text-brand-700" : "text-muted hover:bg-slate-50"}`}>
                <span className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-bold ${index < step || (project.generated && index < 3) ? "bg-emerald-100 text-emerald-700" : step === index ? "bg-brand-600 text-white" : "bg-slate-100"}`}>{index < step || (project.generated && index < 3) ? "✓" : index + 1}</span>
                {label}
              </button>
            ))}
            <div className="mt-3 border-t border-slate-100 pt-3">
              <button
                onClick={() => void loadCloudProjects()}
                disabled={loadingCloudProjects}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50"
              >
                {loadingCloudProjects
                  ? "Chargement des projets..."
                  : "Mes projets sauvegardés"}
              </button>
              {cloudProjectsError && (
                <p role="alert" className="px-3 py-2 text-xs text-red-600">
                  {cloudProjectsError}
                </p>
              )}
              {showCloudProjects && (
                <div className="my-2 rounded-xl bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-bold text-ink">
                    Liste des projets PostgreSQL
                  </p>
                  {cloudProjects.length === 0 ? (
                    <p className="text-xs text-muted">
                      Aucun projet enregistré.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {cloudProjects.map((item) => (
                        <li
                          key={item.projectId}
                          className="rounded-lg border border-slate-200 bg-white p-2 text-xs"
                        >
                          <button
                            type="button"
                            onClick={() => openCloudProject(item)}
                            className="w-full text-left font-semibold text-brand-600 hover:underline"
                          >
                            {item.name || item.data.business}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <button onClick={reset} className="w-full px-3 py-2 text-left text-xs font-semibold text-muted hover:text-red-600">Recommencer le projet</button>
            </div>
          </aside>

          <section className="card min-h-[590px] overflow-hidden">
            {step === 0 && (
              <div className="p-6 sm:p-9">
                <StepHeading number="01" title="Parlez-nous de votre activité" text="Ces informations servent de base à la structure proposée. Vous pourrez tout modifier." />
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <Field label="Votre courriel" required><input className="input" type="email" value={project.email} onChange={e => update("email", e.target.value)} placeholder="vous@entreprise.com" /></Field>
                  <Field label="Nom de l’activité" required><input className="input" value={project.business} onChange={e => update("business", e.target.value)} placeholder="Ex. Atelier Horizon" /></Field>
                  <Field label="Que faites-vous ?" required wide><textarea className="input min-h-28 resize-y" value={project.activity} onChange={e => update("activity", e.target.value)} placeholder="Ex. Je propose des services de photographie pour les entreprises locales…" /></Field>
                  <Field label="À qui vous adressez-vous ?" required><input className="input" value={project.audience} onChange={e => update("audience", e.target.value)} placeholder="Ex. Commerces et restaurateurs" /></Field>
                  <Field label="Ce qui vous distingue"><input className="input" value={project.difference} onChange={e => update("difference", e.target.value)} placeholder="Ex. Une approche flexible et locale" /></Field>
                  <Field label="Ton souhaité" wide><select className="input" value={project.tone} onChange={e => update("tone", e.target.value)}><option>Clair et professionnel</option><option>Chaleureux et accessible</option><option>Direct et dynamique</option><option>Sobre et expert</option></select></Field>
                </div>
                <StepFooter canContinue={canContinue} next={next} />
              </div>
            )}

            {step === 1 && (
              <div className="p-6 sm:p-9">
                <StepHeading number="02" title="Organisez vos services" text="Ajoutez jusqu’à cinq services. Une phrase simple suffit pour cette première version." />
                <div className="mt-8 space-y-4">
                  {project.services.map((service, index) => (
                    <div key={service.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="mb-4 flex items-center justify-between"><h3 className="font-bold">Service {index + 1}</h3>{project.services.length > 1 && <button onClick={() => update("services", project.services.filter(s => s.id !== service.id))} className="text-xs font-semibold text-red-500">Retirer</button>}</div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Nom du service"><input className="input" value={service.name} onChange={e => editService(service.id, "name", e.target.value)} placeholder="Ex. Séance photo professionnelle" /></Field>
                        <Field label="Description courte"><input className="input" value={service.description} onChange={e => editService(service.id, "description", e.target.value)} placeholder="Ex. Des images prêtes pour vos supports" /></Field>
                      </div>
                    </div>
                  ))}
                </div>
                {project.services.length < 5 && <button onClick={addService} className="button-secondary mt-5">+ Ajouter un service</button>}
                <StepFooter canContinue={canContinue} next={next} back={() => setStep(0)} label="Générer ma structure" />
              </div>
            )}

            {step === 2 && (
              <div className="grid min-h-[590px] place-items-center p-8 text-center">
                <div><span className="mx-auto grid h-16 w-16 animate-pulse place-items-center rounded-2xl bg-brand-100 text-2xl text-brand-600">✦</span><h2 className="mt-6 text-2xl font-bold">Préparation de votre projet…</h2><p className="mt-3 max-w-md text-sm leading-6 text-muted">Nous assemblons vos informations en une structure de site, des services et un plan marketing initial.</p></div>
              </div>
            )}

            {step === 3 && project.generated && (
              <Preview project={project} update={update} setStep={setStep} showFeedback={() => setShowFeedback(true)} showPilot={() => setShowPilot(true)} />
            )}
          </section>
        </div>
      </div>

      {showFeedback && <FeedbackModal project={project} update={update} close={() => setShowFeedback(false)} />}
      {showPilot && <PilotModal close={() => setShowPilot(false)} />}
    </main>
  );
}

function StepHeading({ number, title, text }: { number: string; title: string; text: string }) {
  return <div><span className="text-xs font-bold uppercase tracking-widest text-brand-600">Étape {number}</span><h2 className="mt-2 text-2xl font-bold">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{text}</p></div>;
}

function Field({ label, required, wide, children }: { label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? "sm:col-span-2" : ""}><span className="label">{label}{required && <span className="text-brand-600"> *</span>}</span>{children}</label>;
}

function StepFooter({ canContinue, next, back, label = "Continuer" }: { canContinue: boolean; next: () => void; back?: () => void; label?: string }) {
  return <div className="mt-9 flex items-center justify-between border-t border-slate-100 pt-6"><div>{back && <button onClick={back} className="button-secondary">Retour</button>}</div><button onClick={next} disabled={!canContinue} className="button-primary">{label} →</button></div>;
}

function Preview({ project, update, setStep, showFeedback, showPilot }: { project: Project; update: <K extends keyof Project>(key: K, value: Project[K]) => void; setStep: (step: number) => void; showFeedback: () => void; showPilot: () => void }) {
  const activeServices = project.services.filter(s => s.name);
  const actions = [
    `Présenter ${project.business} à 5 contacts correspondant à votre public : ${project.audience}.`,
    `Publier une démonstration simple de votre service « ${activeServices[0]?.name || "principal"} » et noter les questions reçues.`,
    "Demander une recommandation uniquement après qu’un premier client a exprimé une valeur réelle.",
    "Suivre séparément les conversations, projets commencés, résultats finalisés et intentions de paiement."
  ];

  return <div>
    <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div><span className="text-xs font-bold text-emerald-600">✓ Structure générée</span><h2 className="mt-1 text-xl font-bold">Aperçu de {project.business}</h2></div>
      <div className="flex flex-wrap gap-2"><button onClick={() => setStep(0)} className="button-secondary !px-3 !py-2">Modifier</button><button onClick={showFeedback} className="button-secondary !px-3 !py-2">Donner mon avis</button><button onClick={() => update("published", !project.published)} className="button-primary !px-3 !py-2">{project.published ? "✓ Projet finalisé" : "Finaliser le résultat"}</button></div>
    </div>
    <div className="grid lg:grid-cols-[1fr_300px]">
      <div className="p-6 sm:p-9">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><strong>{project.business}</strong><span className="text-xs text-muted">Services · À propos · Contact</span></div>
          <div className="bg-gradient-to-br from-brand-50 to-white px-6 py-12 text-center sm:px-12">
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-brand-700 shadow-sm">{project.tone}</span>
            <h3 className="mx-auto mt-5 max-w-xl text-3xl font-bold tracking-tight">Une solution pensée pour {project.audience.toLowerCase()}</h3>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted">{project.activity} {project.difference ? `Notre approche : ${project.difference.toLowerCase()}.` : ""}</p>
            <button className="button-primary mt-6">Découvrir les services</button>
          </div>
          <div className="p-6 sm:p-8"><h4 className="text-xl font-bold">Services</h4><div className="mt-5 grid gap-4 sm:grid-cols-2">{activeServices.map(s => <div key={s.id} className="rounded-xl border border-slate-200 p-5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600">✦</span><h5 className="mt-4 font-bold">{s.name}</h5><p className="mt-2 text-sm leading-6 text-muted">{s.description || "Description à préciser avant publication."}</p></div>)}</div></div>
        </div>
      </div>
      <aside className="border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-600">Plan marketing initial</p><h3 className="mt-2 font-bold">Premières actions à tester</h3>
        <div className="mt-5 space-y-4">{actions.map((action, i) => <div className="flex gap-3" key={action}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[10px] font-bold text-brand-600 shadow-sm">{i + 1}</span><p className="text-xs leading-5 text-muted">{action}</p></div>)}</div>
        <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold text-amber-900">À vérifier avant publication</p><p className="mt-2 text-xs leading-5 text-amber-800">Exactitude, promesses, coordonnées, orthographe et conformité avec les règles de votre marché.</p></div>
        <button onClick={showPilot} className="button-secondary mt-5 w-full !text-xs">Découvrir l’offre pilote</button>
      </aside>
    </div>
  </div>;
}

function FeedbackModal({ project, update, close }: { project: Project; update: <K extends keyof Project>(key: K, value: Project[K]) => void; close: () => void }) {
  const [sent, setSent] = useState(false);
  const submit = (e: FormEvent) => { e.preventDefault(); setSent(true); window.setTimeout(close, 1000); };
  return <Modal close={close}>{sent ? <div className="py-8 text-center"><span className="text-3xl">✓</span><h2 className="mt-3 text-xl font-bold">Merci pour votre retour</h2></div> : <form onSubmit={submit}><h2 className="text-xl font-bold">Votre résultat vous paraît-il utile ?</h2><p className="mt-2 text-sm text-muted">Votre avis aide à améliorer le parcours avant toute automatisation avancée.</p><div className="mt-6 flex gap-2">{[1,2,3,4,5].map(n => <button type="button" key={n} onClick={() => update("feedback", n)} className={`grid h-10 w-10 place-items-center rounded-lg border font-bold ${project.feedback === n ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200"}`}>{n}</button>)}</div><textarea className="input mt-5 min-h-28" value={project.comment} onChange={e => update("comment", e.target.value)} placeholder="Qu’est-ce qui manque ou devrait changer ?" /><button disabled={!project.feedback} className="button-primary mt-5 w-full">Envoyer mon retour</button></form>}</Modal>;
}

function PilotModal({ close }: { close: () => void }) {
  const [registered, setRegistered] = useState(false);
  return <Modal close={close}>{registered ? <div className="py-8 text-center"><span className="text-3xl">✓</span><h2 className="mt-3 text-xl font-bold">Intérêt enregistré</h2><p className="mt-2 text-sm text-muted">Cette intention est sauvegardée dans votre navigateur pour ce MVP.</p></div> : <div><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">Offre en validation</span><h2 className="mt-4 text-xl font-bold">Participer à l’offre pilote</h2><p className="mt-3 text-sm leading-6 text-muted">Le prix optimal et le marché géographique ne sont pas encore définis. StudioNova AI teste un accès gratuit limité, puis plusieurs hypothèses d’abonnement mensuel selon les retours et les coûts réels.</p><ul className="mt-5 space-y-3 text-sm text-ink"><li>✓ Création et gestion d’un projet</li><li>✓ Organisation des services</li><li>✓ Assistance marketing initiale</li><li>✓ Accompagnement pendant le pilote</li></ul><button onClick={() => { window.localStorage.setItem("studionova-pilot-interest", "true"); setRegistered(true); }} className="button-primary mt-6 w-full">Je souhaite être recontacté</button><p className="mt-3 text-center text-xs text-muted">Aucun paiement n’est effectué à cette étape.</p></div>}</Modal>;
}

function Modal({ children, close }: { children: React.ReactNode; close: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-5 backdrop-blur-sm" role="dialog" aria-modal="true"><div className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-soft"><button onClick={close} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-muted" aria-label="Fermer">×</button>{children}</div></div>;
}