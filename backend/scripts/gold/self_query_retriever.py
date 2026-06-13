import os
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "localhost"),
    "port": int(os.getenv("POSTGRES_PORT", "5432")),
    "dbname": os.getenv("POSTGRES_DB", "lattes_gold"),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD", "postgres"),
}
SCHEMA_REL = os.getenv("POSTGRES_SCHEMA_RELATIONAL", "relacional")
SCHEMA_STAR = os.getenv("POSTGRES_SCHEMA_STAR", "star_schema")

LATTES_PRODUCAO_DESCRIPTION = (
    "Producoes academicas de pesquisadores brasileiros, "
    "contendo artigos, livros, capitulos, e outras producoes "
    "bibliograficas, tecnicas e artisticas."
)

METADATA_FIELDS = [
    {"name": "pesquisador", "description": "Nome do pesquisador/autor", "type": "string"},
    {"name": "ano_publicacao", "description": "Ano de publicacao da producao", "type": "integer"},
    {"name": "tipo_producao", "description": "Tipo da producao (article, book-chapter, etc.)", "type": "string"},
    {"name": "journal_name", "description": "Nome do periodico onde foi publicado", "type": "string"},
    {"name": "idioma", "description": "Idioma da producao (pt, en, etc.)", "type": "string"},
    {"name": "instituicao", "description": "Instituicao do pesquisador", "type": "string"},
]


class SelfQueryGold:
    def __init__(self, llm=None, connection_string: Optional[str] = None):
        self._llm = llm
        self._connection_string = connection_string or self._build_connection_string()
        self._vectorstore = None
        self._retriever = None

    def _build_connection_string(self) -> str:
        return (
            f"postgresql+psycopg2://{DB_CONFIG['user']}:{DB_CONFIG['password']}"
            f"@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['dbname']}"
        )

    def _get_llm(self):
        if self._llm is not None:
            return self._llm
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            try:
                from langchain_openai import ChatOpenAI
                self._llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
                return self._llm
            except ImportError:
                print("langchain-openai nao instalado. Instale com: pip install langchain-openai")
        print("Nenhuma chave OPENAI_API_KEY encontrada no .env")
        return None

    def _build_vectorstore(self, collection_name: str = "lattes_producoes"):
        try:
            from langchain_community.vectorstores import PGVector
            from langchain_community.embeddings import HuggingFaceEmbeddings

            embeddings = HuggingFaceEmbeddings(
                model_name="paraphrase-multilingual-MiniLM-L12-v2",
            )
            self._vectorstore = PGVector(
                connection_string=self._connection_string,
                embedding_function=embeddings,
                collection_name=collection_name,
            )
            return self._vectorstore
        except Exception as e:
            print(f"Erro ao conectar ao PGVector: {e}")
            return None

    def setup(self, collection_name: str = "lattes_producoes"):
        from langchain.retrievers.self_query.base import SelfQueryRetriever
        from langchain.chains.query_constructor.base import AttributeInfo

        llm = self._get_llm()
        if llm is None:
            print("ERRO: LLM nao configurado. Defina OPENAI_API_KEY no .env")
            return False

        vectorstore = self._build_vectorstore(collection_name)
        if vectorstore is None:
            return False

        metadata_field_info = [
            AttributeInfo(**field) for field in METADATA_FIELDS
        ]

        self._retriever = SelfQueryRetriever.from_llm(
            llm=llm,
            vectorstore=vectorstore,
            document_contents=LATTES_PRODUCAO_DESCRIPTION,
            metadata_field_info=metadata_field_info,
            verbose=True,
            enable_limit=True,
        )
        return True

    def search(self, query: str, k: int = 10) -> List[Dict[str, Any]]:
        if self._retriever is None:
            ok = self.setup()
            if not ok:
                return []

        docs = self._retriever.invoke(query)
        results = []
        for doc in docs[:k]:
            results.append({
                "conteudo": doc.page_content,
                **doc.metadata,
            })
        return results

    def search_sql(self, query: str) -> List[Dict[str, Any]]:
        try:
            from langchain.chains.query_constructor.base import (
                StructuredQuery,
                get_query_constructor_prompt,
                load_query_constructor_runnable,
            )
            from langchain.chains.query_constructor.parser import get_parser
            from langchain.llms.base import BaseLLM

            llm = self._get_llm()
            if llm is None:
                return []

            prompt = get_query_constructor_prompt(
                document_contents=LATTES_PRODUCAO_DESCRIPTION,
                attribute_info=METADATA_FIELDS,
            )
            output_parser = get_parser(
                allowed_comparators=["eq", "ne", "lt", "gt", "gte", "lte", "like"],
                allowed_operators=["and", "or"],
            )

            from langchain.chains.query_constructor.base import load_query_constructor_runnable
            chain = load_query_constructor_runnable(
                llm=llm,
                document_contents=LATTES_PRODUCAO_DESCRIPTION,
                attribute_info=METADATA_FIELDS,
            )
            result = chain.invoke({"query": query})
            structured_query = result

            sql_parts = []
            if structured_query.filter:
                sql_parts.append(f"WHERE {self._filter_to_sql(structured_query.filter)}")
            if structured_query.query:
                sql_parts.append(f"-- Busca semantic: {structured_query.query}")

            return {
                "query_semantica": structured_query.query,
                "filtro": str(structured_query.filter) if structured_query.filter else None,
                "sql_sugerido": "SELECT * FROM producao " + " ".join(sql_parts) if sql_parts else None,
            }
        except Exception as e:
            return {"erro": str(e)}

    @staticmethod
    def _filter_to_sql(filter_obj) -> str:
        if hasattr(filter_obj, "comparator") and hasattr(filter_obj, "attribute"):
            op_map = {
                "eq": "=", "ne": "!=", "lt": "<", "gt": ">",
                "lte": "<=", "gte": ">=", "like": "ILIKE",
            }
            op = op_map.get(str(filter_obj.comparator), "=")
            val = filter_obj.value
            if isinstance(val, str) and op == "ILIKE":
                val = f"'%{val}%'"
            elif isinstance(val, str):
                val = f"'{val}'"
            return f"{filter_obj.attribute} {op} {val}"

        if hasattr(filter_obj, "operator") and hasattr(filter_obj, "arguments"):
            op_map = {"and": "AND", "or": "OR"}
            op = op_map.get(str(filter_obj.operator), "AND")
            args = [SelfQueryGold._filter_to_sql(arg) for arg in filter_obj.arguments]
            return f"({f' {op} '.join(args)})"

        return str(filter_obj)


if __name__ == "__main__":
    import json

    sq = SelfQueryGold()
    ok = sq.setup()
    if not ok:
        print("Nao foi possivel configurar o Self-Query Retriever.")
        print("Verifique se o banco PostgreSQL esta rodando e se o OPENAI_API_KEY esta no .env")
        exit(1)

    print("\n=== Self-Query Retriever - Lattes Integration ===")
    print("Digite perguntas em linguagem natural. Exemplos:")
    print('  "Artigos sobre machine learning do Joao publicados em 2023"')
    print('  "Producoes do Pedro sobre educacao"')
    print('  "Trabalhos recentes sobre inteligencia artificial"')
    print("Digite 'sair' para encerrar.\n")

    while True:
        try:
            query = input("> ")
        except (EOFError, KeyboardInterrupt):
            break

        if query.lower() in ("sair", "exit", "quit"):
            break
        if not query.strip():
            continue

        print("\n--- SQL gerado ---")
        sql_info = sq.search_sql(query)
        if "erro" in sql_info:
            print(f"  Erro: {sql_info['erro']}")
        else:
            if sql_info["query_semantica"]:
                print(f"  Busca semantica: {sql_info['query_semantica']}")
            if sql_info["filtro"]:
                print(f"  Filtro extraido: {sql_info['filtro']}")
            if sql_info["sql_sugerido"]:
                print(f"  SQL sugerido: {sql_info['sql_sugerido']}")

        print("\n--- Resultados ---")
        results = sq.search(query)
        if not results:
            print("  Nenhum resultado encontrado.")
        else:
            for i, r in enumerate(results, 1):
                print(f"  {i}. {r.get('conteudo', '')[:100]}...")
                print(f"     Pesquisador: {r.get('pesquisador', 'N/A')}")
                print(f"     Ano: {r.get('ano_publicacao', 'N/A')}")
                print()
