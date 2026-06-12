<<<<<<< HEAD
from fastapi import APIRouter, HTTPException
from models.busca import BuscaRequest, BuscaNaturalRequest, ResultadoBusca
=======
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from models.busca import BuscaRequest, BuscaNaturalRequest, ResultadoBusca, Sugestao
>>>>>>> cf92a72 (atualizando)
from services import busca_service
from services.busca_service import self_query_service

router = APIRouter(prefix="/busca", tags=["Busca"])


@router.post("", response_model=list[ResultadoBusca])
async def buscar_vetorial(body: BuscaRequest):
    from services.embedding_service import gerar_embedding

    embedding = gerar_embedding(body.texto)
    if embedding is None:
        raise HTTPException(status_code=500, detail="Erro ao gerar embedding")

    return await busca_service.buscar_vetorial(
        embedding=embedding,
        filtros=body.filtros,
        limite=body.limite,
    )


<<<<<<< HEAD
=======
@router.get("/sugestoes", response_model=list[Sugestao])
async def sugerir(
    q: str = Query(min_length=1),
    tipo: str = Query("pesquisador"),
    limite: int = Query(10, ge=1, le=50),
):
    return await busca_service.sugerir(prefixo=q, tipo=tipo, limite=limite)


>>>>>>> cf92a72 (atualizando)
@router.post("/natural", response_model=dict)
async def buscar_natural(body: BuscaNaturalRequest):
    if self_query_service is None:
        raise HTTPException(status_code=503, detail="Self-Query nao configurado. Defina OPENAI_API_KEY no .env")

    results = self_query_service.search(body.pergunta, k=body.limite)
    return {
        "pergunta": body.pergunta,
        "resultados": results,
    }
