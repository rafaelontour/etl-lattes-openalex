"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api, ProducaoResumo, ProducaoDetalhe } from "@/lib/api";
import { ChevronLeft, ChevronRight, ExternalLink, X, Quote, FileText } from "lucide-react";

function highlightText(text: string | null, query: string | null) {
  if (!text || !query) return text ?? "Sem título";
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="rounded-sm bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-800">{part}</mark>
      : part
  );
}

function getCached(key: string): ProducaoResumo[] | null {
  try {
    const raw = sessionStorage.getItem(`prod_cache_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > 60_000) { sessionStorage.removeItem(`prod_cache_${key}`); return null; }
    return data;
  } catch { return null; }
}
function setCached(key: string, data: ProducaoResumo[]) {
  try { sessionStorage.setItem(`prod_cache_${key}`, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

const memCache = new Map<string, ProducaoResumo[]>();

function ProducoesContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ProducaoResumo[]>([]);
  const [page, setPage] = useState(1);
  const [tipos, setTipos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProducaoDetalhe | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const q = searchParams.get("q");
  const fetchKeyRef = useRef<string>("");
  const lastQRef = useRef<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    api.producoes.tipos().then(setTipos).catch(() => {});
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
    if (q) params.titulo = q;
    api.producoes.listar(params)
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

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setDetailLoading(true);
    setDetail(null);
    api.producoes.obter(selectedId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const cleanId = (id: string) => id.split("/").pop() ?? id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Artigos / Produções</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {data.length} produção(ões) encontrada(s)
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
        </div>
      ) : data.length === 0 ? (
        <p className="text-center text-zinc-400 py-12">Nenhuma produção encontrada.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((p) => (
            <button
              key={p.openalex_id}
              onClick={() => setSelectedId(p.openalex_id)}
              className="group flex flex-col items-stretch justify-between rounded-xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-blue-200 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-800"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <h2 className="font-medium text-zinc-900 dark:text-zinc-100 line-clamp-3">
                    {highlightText(p.titulo, q)}
                  </h2>
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  {p.pesquisador && `${p.pesquisador} · `}
                  {p.ano_publicacao && `${p.ano_publicacao} · `}
                  {p.tipo_producao}
                  {p.journal_name && ` · ${p.journal_name}`}
                  {p.idioma && ` · ${p.idioma}`}
                </p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {p.qtd_citacoes_producao !== null && p.qtd_citacoes_producao !== undefined && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    <Quote className="h-3 w-3" />
                    {p.qtd_citacoes_producao}
                  </span>
                )}
                <span className="ml-auto text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Ver detalhes →
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedId(null)} />
          <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <button
              onClick={() => setSelectedId(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            >
              <X className="h-5 w-5" />
            </button>

            {detailLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
              </div>
            ) : detail ? (
              <div className="space-y-5">
                <h2 className="text-lg font-bold leading-relaxed pr-8">
                  {highlightText(detail.titulo, q)}
                </h2>

                <div className="flex flex-wrap gap-2">
                  {detail.pesquisador && (
                    <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                      {detail.pesquisador}
                    </span>
                  )}
                  {detail.ano_publicacao && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {detail.ano_publicacao}
                    </span>
                  )}
                  {detail.tipo_producao && (
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {detail.tipo_producao}
                    </span>
                  )}
                  {detail.idioma && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {detail.idioma}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                    <p className="text-xs text-zinc-400">Citações</p>
                    <p className="text-lg font-bold">{detail.qtd_citacoes_producao ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                    <p className="text-xs text-zinc-400">Referências</p>
                    <p className="text-lg font-bold">{detail.qtd_referencias_producao ?? 0}</p>
                  </div>
                  {detail.journal_name && (
                    <div className="col-span-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                      <p className="text-xs text-zinc-400">Periódico</p>
                      <p className="text-sm font-medium">{detail.journal_name}</p>
                    </div>
                  )}
                </div>

                {detail.abstract && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Resumo</h3>
                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-6">
                      {highlightText(detail.abstract, q)}
                    </p>
                  </div>
                )}

                {detail.palavras_chave && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Palavras-chave</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{detail.palavras_chave}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <a
                    href={`https://openalex.org/${detail.openalex_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir no OpenAlex
                  </a>
                  {detail.doi && (
                    <a
                      href={`https://doi.org/${detail.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <FileText className="h-4 w-4" />
                      DOI
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-center text-zinc-400 py-16">Não foi possível carregar os detalhes.</p>
            )}
          </div>
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

export default function ProducoesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><p className="text-zinc-400">Carregando...</p></div>}>
      <ProducoesContent />
    </Suspense>
  );
}
