import numpy as np
from sentence_transformers import SentenceTransformer

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    return _model


def gerar_embedding(texto: str) -> list[float] | None:
    try:
        model = _get_model()
        emb = model.encode(texto, normalize_embeddings=True)
        return emb.tolist()
    except Exception:
        return None
