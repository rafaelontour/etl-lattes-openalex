from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from models.producao import ProducaoResumo, ProducaoDetalhe, ProducaoAutor
from services import producao_service

router = APIRouter(prefix="/producoes", tags=["Producoes"])


@router.get("", response_model=list[ProducaoResumo])
async def listar_producoes(
    ano_min: Optional[int] = Query(None),
    ano_max: Optional[int] = Query(None),
    tipo: Optional[str] = Query(None),
    idioma: Optional[str] = Query(None),
    journal: Optional[str] = Query(None),
    titulo: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    return await producao_service.listar_producoes(ano_min, ano_max, tipo, idioma, journal, titulo, page, limit)


@router.get("/tipos", response_model=list[str])
async def listar_tipos():
    return await producao_service.listar_tipos()


@router.get("/anos", response_model=list[int])
async def listar_anos():
    return await producao_service.listar_anos()


@router.get("/{openalex_id}", response_model=ProducaoDetalhe)
async def obter_producao(openalex_id: str):
    result = await producao_service.obter_producao(openalex_id)
    if not result:
        raise HTTPException(status_code=404, detail="Producao nao encontrada")
    return result


@router.get("/{openalex_id}/autores", response_model=list[ProducaoAutor])
async def listar_autores(openalex_id: str):
    return await producao_service.listar_autores(openalex_id)
