"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AreaResumo {
  nome_grande_area: string;
  nome_area: string | null;
  nome_sub_area: string | null;
  total_pesquisadores: number;
}

function AreasContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q");
  const [areas, setAreas] = useState<AreaResumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = q ? `${BASE_URL}/areas?q=${encodeURIComponent(q)}` : `${BASE_URL}/areas`;
    fetch(url)
      .then((r) => r.json())
      .then(setAreas)
      .catch(() => setAreas([]))
      .finally(() => setLoading(false));
  }, [q]);

  const grandesAreas = new Map<string, { count: number; areas: Map<string, number> }>();
  areas.forEach((a) => {
    const nome = a.nome_area ?? a.nome_grande_area;
    if (!grandesAreas.has(a.nome_grande_area)) {
      grandesAreas.set(a.nome_grande_area, { count: 0, areas: new Map() });
    }
    const ga = grandesAreas.get(a.nome_grande_area)!;
    ga.count += a.total_pesquisadores;
    if (a.nome_area) {
      ga.areas.set(a.nome_area, (ga.areas.get(a.nome_area) ?? 0) + a.total_pesquisadores);
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Áreas de Atuação</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {q
            ? `${areas.length} área(s) encontrada(s) para "${q}"`
            : `${areas.length} grandes áreas encontradas na base de dados`}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from(grandesAreas.entries())
            .sort(([, a], [, b]) => b.count - a.count)
            .map(([grande, info]) => (
              <div
                key={grande}
                className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{grande}</h2>
                  <span className="ml-auto rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {info.count}
                  </span>
                </div>
                {info.areas.size > 0 && (
                  <div className="mt-3 space-y-1">
                    {Array.from(info.areas.entries())
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 8)
                      .map(([area, count]) => (
                        <div key={area} className="flex items-center justify-between text-sm">
                          <span className="text-zinc-600 dark:text-zinc-400">{area}</span>
                          <span className="text-xs text-zinc-400">{count}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {!loading && grandesAreas.size === 0 && (
        <p className="text-center text-zinc-400 py-12">Nenhuma área encontrada.</p>
      )}
    </div>
  );
}

export default function AreasPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><p className="text-zinc-400">Carregando...</p></div>}>
      <AreasContent />
    </Suspense>
  );
}
