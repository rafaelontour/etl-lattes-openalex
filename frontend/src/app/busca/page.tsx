"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { api, ResultadoBusca, ProducaoDetalhe } from "@/lib/api";
import { ArrowLeft, AlertCircle, Search, ExternalLink, Quote, ChevronLeft, ChevronRight, X, FileText } from "lucide-react";

function BuscaContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q");
  const [resultados, setResultados] = useState<ResultadoBusca[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProducaoDetalhe | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const ITENS_POR_PAG = 10;

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setDetailLoading(true);
    setDetail(null);
    api.producoes.obter(selectedId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (q && q !== fetchedRef.current) {
      fetchedRef.current = q;
      setLoading(true);
      setErro(null);
      setResultados(null);
      setPagina(0);
      api.busca.vetorial(q)
        .then(setResultados)
        .catch(() => {
          setErro("Erro ao realizar busca semântica. Verifique se o backend está rodando.");
        })
        .finally(() => setLoading(false));
    }
  }, [q]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <h1 className="text-2xl font-bold">Busca semântica</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {q ? `Resultados para "${q}"` : "Faça uma busca livre por produções e pesquisadores"}
        </p>
      </div>

      <SearchBar initialLivre={true} initialTipo="producao" initialQuery={q ?? ""} />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
        </div>
      ) : erro ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {erro}
        </div>
      ) : resultados === null ? (
        <div className="flex flex-col items-center gap-3 py-16 text-zinc-400">
          <Search className="h-10 w-10" />
          <p className="text-sm">Digite um termo e clique em Buscar</p>
        </div>
      ) : resultados.length === 0 ? (
        <p className="text-center text-zinc-400 py-12">Nenhum resultado encontrado.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">{resultados.length} resultado(s) encontrado(s)</p>

          <div className="grid gap-3 sm:grid-cols-2">
            {resultados.slice(pagina * ITENS_POR_PAG, (pagina + 1) * ITENS_POR_PAG).map((r) => (
              r.tipo_resultado === "pesquisador" ? (
                <Link
                  key={r.lattes_id}
                  href={`/pesquisadores/${r.lattes_id}`}
                  className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-blue-200 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-800"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">{r.titulo}</h3>
                    <ExternalLink className="ml-2 h-4 w-4 shrink-0 text-zinc-300" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                      Pesquisador
                    </span>
                    {r.score !== null && (
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        score: {r.score.toFixed(3)}
                      </span>
                    )}
                  </div>
                </Link>
              ) : (
                <div
                  key={r.openalex_id}
                  onClick={() => setSelectedId(r.openalex_id)}
                  className="flex cursor-pointer flex-col rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-blue-200 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-800"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium leading-relaxed text-zinc-900 dark:text-zinc-100 line-clamp-3">
                      {r.titulo}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.pesquisador && (
                        <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                          {r.pesquisador}
                        </span>
                      )}
                      {r.ano_publicacao && (
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {r.ano_publicacao}
                        </span>
                      )}
                      {r.tipo_producao && (
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {r.tipo_producao}
                        </span>
                      )}
                      {r.score !== null && (
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          score: {r.score.toFixed(3)}
                        </span>
                      )}
                    </div>
                    {r.journal_name && (
                      <p className="mt-2 text-xs text-zinc-400 line-clamp-1">{r.journal_name}</p>
                    )}
                    <div className="mt-2 flex items-center gap-1">
                      {r.doi ? (
                        <a
                          href={`https://doi.org/${r.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Acesso aberto
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                          Fechado
                        </span>
                      )}
                    </div>
                  </div>
                  {r.abstract && (
                    <p className="mt-2 text-xs text-zinc-500 line-clamp-2">{r.abstract}</p>
                  )}
                </div>
              )
            ))}
          </div>

          {resultados.length > ITENS_POR_PAG && (
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
                disabled={pagina === 0}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
              <span className="text-sm text-zinc-500">
                {pagina + 1} de {Math.ceil(resultados.length / ITENS_POR_PAG)}
              </span>
              <button
                onClick={() => setPagina((p) => p + 1)}
                disabled={(pagina + 1) * ITENS_POR_PAG >= resultados.length}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Próxima <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
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
                  {detail.titulo ?? "Sem título"}
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
                      {detail.abstract}
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
    </div>
  );
}

export default function BuscaPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><p className="text-zinc-400">Carregando...</p></div>}>
      <BuscaContent />
    </Suspense>
  );
}
