from fastapi import APIRouter, Query
from typing import Optional
from backend.core.database import get_pool

router = APIRouter(tags=["Metricas"])


@router.get("/metricas")
async def listar_metricas(
    ordenar_por: str = Query("qtd_producoes"),
    order_dir: str = Query("desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    pool = await get_pool()
    allowed_cols = {"qtd_producoes", "qtd_citacoes_pesquisador", "indice_h", "indice_i10", "nome_completo"}
    col = ordenar_por if ordenar_por in allowed_cols else "qtd_producoes"
    dir_ = "DESC" if order_dir.lower() == "desc" else "ASC"
    offset = (page - 1) * limit

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""SELECT lattes_id, nome_completo, instituicao_empresa,
                       qtd_producoes, qtd_citacoes_pesquisador, indice_h, indice_i10
                FROM relacional.pesquisador
                ORDER BY {col} {dir_} NULLS LAST
                LIMIT $1 OFFSET $2""",
            limit, offset,
        )
    return [dict(r) for r in rows]


@router.get("/stats")
async def get_stats():
    pool = await get_pool()
    async with pool.acquire() as conn:
        stats = await conn.fetchrow("""
            SELECT
                (SELECT COUNT(*) FROM relacional.pesquisador) AS total_pesquisadores,
                (SELECT COUNT(*) FROM relacional.producao) AS total_producoes,
                (SELECT COUNT(DISTINCT journal_name) FROM relacional.producao WHERE journal_name IS NOT NULL) AS total_periodicos,
                (SELECT COUNT(DISTINCT lattes_id) FROM relacional.autoria) AS pesquisadores_com_producao,
                (SELECT COALESCE(SUM(qtd_citacoes_pesquisador), 0) FROM relacional.pesquisador) AS total_citacoes,
                (SELECT MIN(ano_publicacao) FROM relacional.producao WHERE ano_publicacao IS NOT NULL) AS ano_min,
                (SELECT MAX(ano_publicacao) FROM relacional.producao WHERE ano_publicacao IS NOT NULL) AS ano_max
        """)
    return dict(stats)
