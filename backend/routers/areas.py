from fastapi import APIRouter, Query
from typing import Optional
from backend.models.pesquisador import AreaResumo
from backend.services import pesquisador_service

router = APIRouter(prefix="/areas", tags=["Areas"])


@router.get("", response_model=list[AreaResumo])
async def listar_areas(
    q: Optional[str] = Query(None),
    limite: int = Query(100, ge=1, le=500),
):
    return await pesquisador_service.listar_areas(prefixo=q, limite=limite)
