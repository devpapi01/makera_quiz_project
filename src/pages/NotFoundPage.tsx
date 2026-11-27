import { ArrowLeft, Home, Link2Off } from "lucide-react";

type NotFoundPageProps = {
  onHome: () => void;
  onBack: () => void;
};

export default function NotFoundPage({ onHome, onBack }: NotFoundPageProps) {
  return (
    <main className="grid min-h-[calc(100dvh-20rem)] place-items-center px-5 py-16 text-center">
      <section className="w-full max-w-xl rounded-[28px] border border-[#e4ebe3] bg-white px-7 py-12 shadow-sm dark:border-white/10 dark:bg-[#19251e] sm:px-12">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#edf5ef] text-[#26734c] dark:bg-[#26734c]/15 dark:text-[#9dd4ae]">
          <Link2Off size={27} aria-hidden="true" />
        </div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-[#38805a] dark:text-[#9dd4ae]">Erreur 404</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#203329] dark:text-white sm:text-4xl">Cette page est introuvable</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#738078] dark:text-[#a5b2a8]">
          Le lien a peut-être changé ou contient une erreur. Vérifiez l’adresse, ou revenez à votre espace Makera.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={onHome} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#26734c] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1e603e]">
            <Home size={16} aria-hidden="true" /> Accueil
          </button>
          <button onClick={onBack} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce5dc] px-5 py-3 text-sm font-bold text-[#405147] transition-colors hover:bg-[#f5f8f4] dark:border-white/15 dark:text-[#d4dfd6] dark:hover:bg-white/5">
            <ArrowLeft size={16} aria-hidden="true" /> Page précédente
          </button>
        </div>
      </section>
    </main>
  );
}
