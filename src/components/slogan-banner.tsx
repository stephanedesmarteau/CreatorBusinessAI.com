"use client";

import React, { useState } from "react";

type LanguageOption = {
  code: string;
  flag: string;
  label: string;
  slogan: string;
  sub: string;
};

const slogans: LanguageOption[] = [
  {
    code: "fr",
    flag: "🇫🇷",
    label: "Français",
    slogan: "L'Intelligence Artificielle Ultime : 50 Moteurs, Une Seule Réponse Parfaite.",
    sub: "Créez vos entreprises, applications mobiles, sites web et obtenez la meilleure réponse du marché.",
  },
  {
    code: "en",
    flag: "🇬🇧",
    label: "English",
    slogan: "The Ultimate AI Engine: 50 World AI Models, One Perfect Answer.",
    sub: "Build companies, mobile apps, websites, and get the best market solution for any prompt.",
  },
  {
    code: "es",
    flag: "🇪🇸",
    label: "Español",
    slogan: "La Inteligencia Artificial Suprema: 50 Motores, Una Respuesta Perfecta.",
    sub: "Crea empresas, aplicaciones móviles, sitios web y obtén la mejor solución del mercado.",
  },
  {
    code: "de",
    flag: "🇩🇪",
    label: "Deutsch",
    slogan: "Die Ultimative KI: 50 Weltklasse-Modelle, Eine Perfekte Antwort.",
    sub: "Erbauen Sie Unternehmen, mobile Apps, Websites und erhalten Sie die beste Marktlösung.",
  },
];

export function SloganBanner() {
  const [selectedLang, setSelectedLang] = useState<LanguageOption>(slogans[0]);

  return (
    <div className="mx-auto max-w-4xl rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 p-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
            Slogan Multilingue • NaturalCreatorAI
          </span>
        </div>

        {/* Sélecteur de Langue */}
        <div className="flex flex-wrap items-center gap-2">
          {slogans.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setSelectedLang(lang)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                selectedLang.code === lang.code
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 text-center sm:text-left">
        <p className="text-xl font-extrabold text-white sm:text-2xl leading-tight">
          "{selectedLang.slogan}"
        </p>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
          {selectedLang.sub}
        </p>
      </div>
    </div>
  );
}
