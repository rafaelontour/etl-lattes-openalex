from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from backend.models.pesquisador import PesquisadorResumo, PesquisadorDetalhe, Formacao, AreaAtuacao
from backend.models.producao import ProducaoResumo
from backend.services import pesquisador_service, producao_service

router = APIRouter(prefix="/pesquisadores", tags=["Pesquisadores"])


@router.get("", response_model=list[PesquisadorResumo])
async def listar_pesquisadores(
    nome: Optional[str] = Query(None),
    instituicao: Optional[str] = Query(None),
    nacionalidade: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    return await pesquisador_service.listar_pesquisadores(nome, instituicao, nacionalidade, page, limit)


@router.get("/{lattes_id}", response_model=PesquisadorDetalhe)
async def obter_pesquisador(lattes_id: str):
    result = await pesquisador_service.obter_pesquisador(lattes_id)
    if not result:
        raise HTTPException(status_code=404, detail="Pesquisador nao encontrado")
    return result


@router.get("/{lattes_id}/formacao", response_model=list[Formacao])
async def listar_formacao(lattes_id: str):
    return await pesquisador_service.listar_formacao(lattes_id)


@router.get("/{lattes_id}/areas", response_model=list[AreaAtuacao])
async def listar_areas(lattes_id: str):
    return await pesquisador_service.listar_areas_atuacao(lattes_id)


@router.get("/{lattes_id}/producoes", response_model=list[ProducaoResumo])
async def listar_producoes_pesquisador(
    lattes_id: str,
    ano: Optional[int] = Query(None),
    tipo: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
):
    return await producao_service.listar_producoes_pesquisador(
        lattes_id, ano=ano, tipo=tipo, page=page, limit=limit,
    )
