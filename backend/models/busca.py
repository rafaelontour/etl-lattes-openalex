from pydantic import BaseModel
from typing import Optional


class BuscaRequest(BaseModel):
    texto: str
    filtros: Optional[dict] = None
    limite: int = 20


class BuscaNaturalRequest(BaseModel):
    pergunta: str
    limite: int = 20


class ResultadoBusca(BaseModel):
    openalex_id: Optional[str] = None
    titulo: Optional[str] = None
    abstract: Optional[str] = None
    ano_publicacao: Optional[int] = None
    tipo_producao: Optional[str] = None
    journal_name: Optional[str] = None
    score: Optional[float] = None
    pesquisador: Optional[str] = None
    lattes_id: Optional[str] = None
    tipo_resultado: str = "producao"
    doi: Optional[str] = None
    eh_acesso_aberto: Optional[bool] = None


class Sugestao(BaseModel):
    texto: str
    tipo: str
