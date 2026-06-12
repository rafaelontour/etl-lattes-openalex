from pydantic import BaseModel
from typing import Optional


class ProducaoResumo(BaseModel):
    openalex_id: str
    titulo: Optional[str] = None
    ano_publicacao: Optional[int] = None
    tipo_producao: Optional[str] = None
    qtd_citacoes_producao: Optional[int] = None
    journal_name: Optional[str] = None
    idioma: Optional[str] = None
<<<<<<< HEAD
=======
    pesquisador: Optional[str] = None
>>>>>>> cf92a72 (atualizando)


class ProducaoDetalhe(ProducaoResumo):
    doi: Optional[str] = None
    abstract: Optional[str] = None
    qtd_referencias_producao: Optional[int] = None
    issn: Optional[str] = None
    palavras_chave: Optional[str] = None


class ProducaoAutor(BaseModel):
    nome_autor: Optional[str] = None
    ordem_autoria: Optional[int] = None
    autor_principal: bool = False
    correspondente: bool = False
    afiliacao_autor: Optional[str] = None
