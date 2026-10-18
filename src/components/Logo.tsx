import Link from "next/link";

export default function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3 font-bold tracking-tight" aria-label="StudioNova AI, accueil">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/20">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2Z" fill="currentColor" />
          <path d="m18.5 16 .7 2.8 2.8.7-2.8.7-.7 2.8-.7-2.8-2.8-.7 2.8-.7.7-2.8Z" fill="currentColor" opacity=".65" />
        </svg>
      </span>
      <span className={inverse ? "text-white" : "text-ink"}>StudioNova <span className="text-brand-500">AI</span></span>
    </Link>
  );
}