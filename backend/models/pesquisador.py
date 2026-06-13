from pydantic import BaseModel
from typing import Optional


class PesquisadorResumo(BaseModel):
    lattes_id: str
    nome_completo: str
    orcid_id: Optional[str] = None
    indice_h: Optional[int] = None
    indice_i10: Optional[int] = None
    qtd_producoes: Optional[int] = None
    qtd_citacoes_pesquisador: Optional[int] = None
    instituicao_empresa: Optional[str] = None
    nacionalidade: Optional[str] = None


class PesquisadorDetalhe(PesquisadorResumo):
    resumo_cv: Optional[str] = None
    nome_orgao: Optional[str] = None
    data_atualizacao_lattes: Optional[str] = None


class Formacao(BaseModel):
    tipo_formacao: Optional[str] = None
    nome_curso: Optional[str] = None
    nome_instituicao: Optional[str] = None
    ano_inicio: Optional[int] = None
    ano_conclusao: Optional[int] = None
    nome_orientador: Optional[str] = None


class AreaAtuacao(BaseModel):
    nome_grande_area: Optional[str] = None
    nome_area: Optional[str] = None
    nome_sub_area: Optional[str] = None
    nome_especialidade: Optional[str] = None


class AreaResumo(BaseModel):
    nome_grande_area: str
    nome_area: Optional[str] = None
    nome_sub_area: Optional[str] = None
    total_pesquisadores: int
