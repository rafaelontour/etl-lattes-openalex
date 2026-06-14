"use client";

import { useEffect, useState } from "react";
import SearchBar from "@/components/SearchBar";
import { api, Stats } from "@/lib/api";
import { BarChart3, BookOpen, Users, Building2, FileText } from "lucide-react";

function HomeContent() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
  }, []);

  const cards = [
    { label: "Pesquisadores", value: stats?.total_pesquisadores ?? "-", icon: Users, color: "text-sky-600 bg-sky-100" },
    { label: "Produções", value: stats?.total_producoes ?? "-", icon: BookOpen, color: "text-emerald-600 bg-emerald-100" },
    { label: "Periódicos", value: stats?.total_periodicos ?? "-", icon: Building2, color: "text-violet-600 bg-violet-100" },
    { label: "Citações", value: stats?.total_citacoes ?? "-", icon: FileText, color: "text-amber-600 bg-amber-100" },
  ];

  return (
    <div className="flex flex-col items-center gap-12">
      {/* Hero */}
      <div className="mt-12 flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2 rounded-full bg-sky-100 px-4 py-1 text-xs font-medium text-sky-700 shadow-sm dark:bg-sky-900 dark:text-sky-300">
          <BarChart3 className="h-3.5 w-3.5" /> Lattes + OpenAlex
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-r from-sky-700 to-indigo-600 bg-clip-text text-transparent">Lattes Analytics</h1>
        <p className="max-w-lg text-zinc-600 dark:text-zinc-400">
          Consulte pesquisadores, produções acadêmicas e realize buscas semânticas sobre dados da Plataforma Lattes
          integrados ao OpenAlex.
        </p>
      </div>

      {/* Search */}
      <SearchBar variant="home" />

      {/* Stats */}
      <div className="grid w-full max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-sky-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow dark:border-zinc-700 dark:bg-zinc-900">
            <div className={`mb-2 inline-flex rounded-lg p-2 ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold dark:text-white">{value}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
          </div>
        ))}
      </div>

      {stats && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Dados de {stats.ano_min ?? "—"} a {stats.ano_max ?? "—"} · {stats.pesquisadores_com_producao} pesquisadores com produção
        </p>
      )}
    </div>
  );
}

export default function Home() {
  return <HomeContent />;
}
