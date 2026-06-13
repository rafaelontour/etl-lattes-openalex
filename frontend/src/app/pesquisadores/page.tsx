"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, PesquisadorResumo } from "@/lib/api";
import { ChevronLeft, ChevronRight, ExternalLink, Globe, GraduationCap } from "lucide-react";

function getCached(key: string): PesquisadorResumo[] | null {
  try {
    const raw = sessionStorage.getItem(`pesq_cache_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > 60_000) { sessionStorage.removeItem(`pesq_cache_${key}`); return null; }
    return data;
  } catch { return null; }
}
function setCached(key: string, data: PesquisadorResumo[]) {
  try { sessionStorage.setItem(`pesq_cache_${key}`, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

const memCache = new Map<string, PesquisadorResumo[]>();

function PesquisadoresContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<PesquisadorResumo[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const q = searchParams.get("q");
  const fetchKeyRef = useRef<string>("");
  const lastQRef = useRef<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (q !== lastQRef.current) {
      lastQRef.current = q;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }

    const fetchKey = `${q ?? ""}_${page}`;
    if (fetchKey === fetchKeyRef.current) return;
    fetchKeyRef.current = fetchKey;

    const cached = memCache.get(fetchKey) ?? getCached(fetchKey);
    if (cached) {
      setData(cached);
      return;
    }

    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "20" };
    if (q) params.nome = q;
    api.pesquisadores.listar(params)
      .then((result) => {
        if (mountedRef.current) {
          setData(result);
          memCache.set(fetchKey, result);
          setCached(fetchKey, result);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [q, page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pesquisadores</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {data.length} pesquisador{data.length !== 1 ? "es" : ""} encontrado{data.length !== 1 ? "s" : ""}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
        </div>
      ) : data.length === 0 ? (
        <p className="text-center text-zinc-400 py-12">Nenhum pesquisador encontrado.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Link
              key={p.lattes_id}
              href={`/pesquisadores/${p.lattes_id}`}
              className="group rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:border-blue-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {p.id_photo_lattes && (
                    <img
                      src={`http://servicosweb.cnpq.br/wspessoa/servletrecuperafoto?tipo=1&id=${p.id_photo_lattes}`}
                      alt={`Foto de ${p.nome_completo}`}
                      className="h-10 w-10 shrink-0 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <h2 className="font-semibold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 truncate">
                    {p.nome_completo}
                  </h2>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-zinc-300 group-hover:text-blue-500" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">{p.qtd_producoes ?? 0}</p>
                  <p className="text-zinc-400">Produções</p>
                </div>
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">{p.qtd_citacoes_pesquisador ?? 0}</p>
                  <p className="text-zinc-400">Citações</p>
                </div>
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">{p.indice_h ?? 0}</p>
                  <p className="text-zinc-400">H-index</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-zinc-400 truncate">{p.instituicao_empresa ?? "—"}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>
        <span className="text-sm text-zinc-500">Página {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={data.length < 20}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Próxima <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function PesquisadoresPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><p className="text-zinc-400">Carregando...</p></div>}>
      <PesquisadoresContent />
    </Suspense>
  );
}
