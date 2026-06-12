from typing import Optional
from core.database import get_pool
<<<<<<< HEAD
from models.pesquisador import PesquisadorResumo, PesquisadorDetalhe, Formacao, AreaAtuacao
=======
from models.pesquisador import PesquisadorResumo, PesquisadorDetalhe, Formacao, AreaAtuacao, AreaResumo
>>>>>>> cf92a72 (atualizando)


async def listar_pesquisadores(
    nome: Optional[str] = None,
    instituicao: Optional[str] = None,
    nacionalidade: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> list[PesquisadorResumo]:
    pool = await get_pool()
    conditions = []
    params = []
    idx = 1

    if nome:
        conditions.append(f"LOWER(nome_completo) LIKE LOWER(${idx})")
        params.append(f"%{nome}%")
        idx += 1
    if instituicao:
        conditions.append(f"LOWER(instituicao_empresa) LIKE LOWER(${idx})")
        params.append(f"%{instituicao}%")
        idx += 1
    if nacionalidade:
        conditions.append(f"LOWER(nacionalidade) = LOWER(${idx})")
        params.append(nacionalidade)
        idx += 1

    where = " AND ".join(conditions) if conditions else "TRUE"
    offset = (page - 1) * limit

    query = f"""
        SELECT lattes_id, nome_completo, orcid_id, indice_h, indice_i10,
               qtd_producoes, qtd_citacoes_pesquisador, instituicao_empresa, nacionalidade
        FROM relacional.pesquisador
        WHERE {where}
        ORDER BY nome_completo
        LIMIT ${idx} OFFSET ${idx + 1}
    """
    params.append(limit)
    params.append(offset)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
    return [PesquisadorResumo(**dict(r)) for r in rows]


async def obter_pesquisador(lattes_id: str) -> Optional[PesquisadorDetalhe]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT * FROM relacional.pesquisador WHERE lattes_id = $1""",
            lattes_id,
        )
    return PesquisadorDetalhe(**dict(row)) if row else None


async def listar_formacao(lattes_id: str) -> list[Formacao]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT tipo_formacao, nome_curso, nome_instituicao,
                      ano_inicio, ano_conclusao, nome_orientador
               FROM relacional.formacao WHERE lattes_id = $1
               ORDER BY ano_conclusao DESC NULLS LAST""",
            lattes_id,
        )
    return [Formacao(**dict(r)) for r in rows]


async def listar_areas_atuacao(lattes_id: str) -> list[AreaAtuacao]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT nome_grande_area, nome_area, nome_sub_area, nome_especialidade
               FROM relacional.area_atuacao WHERE lattes_id = $1""",
            lattes_id,
        )
    return [AreaAtuacao(**dict(r)) for r in rows]
<<<<<<< HEAD
=======


async def listar_areas(
    prefixo: Optional[str] = None,
    limite: int = 100,
) -> list[AreaResumo]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        if prefixo:
            rows = await conn.fetch(
                """SELECT nome_grande_area, nome_area, nome_sub_area,
                          COUNT(DISTINCT lattes_id) AS total_pesquisadores
                   FROM relacional.area_atuacao
                   WHERE nome_area ILIKE $1 OR nome_grande_area ILIKE $1
                   GROUP BY nome_grande_area, nome_area, nome_sub_area
                   ORDER BY total_pesquisadores DESC
                   LIMIT $2""",
                f"%{prefixo}%",
                limite,
            )
        else:
            rows = await conn.fetch(
                """SELECT nome_grande_area, NULL::text AS nome_area, NULL::text AS nome_sub_area,
                          COUNT(DISTINCT lattes_id) AS total_pesquisadores
                   FROM relacional.area_atuacao
                   GROUP BY nome_grande_area
                   ORDER BY total_pesquisadores DESC
                   LIMIT $1""",
                limite,
            )
    return [AreaResumo(**dict(r)) for r in rows]
>>>>>>> cf92a72 (atualizando)
