import os
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, List, Any
from dotenv import load_dotenv
import logging
import pandas as pd
import time  # <- ZMIANA: Dodano import

# NOWE IMPORTY
import voyageai
import psycopg2
from transformers import AutoTokenizer
from collections import Counter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SearchParams(BaseModel):
    queries: List[str]
    search_type: str = "semantic"
    top_k: int = Field(default=5, ge=1, le=20)
    alpha: Optional[float] = Field(default=0.5, ge=0.0, le=1.0)

    @validator('alpha')
    def validate_alpha(cls, v, values):
        if values.get('search_type') == 'hybrid' and v is None:
            raise ValueError('alpha jest wymagane dla wyszukiwania hybrydowego')
        return v

    @validator('queries')
    def validate_queries(cls, v):
        if not v or not any(query.strip() for query in v):
            raise ValueError('Wymagane jest co najmniej jedno niepuste zapytanie')
        return [query.strip() for query in v if query.strip()]


class SearchResult(BaseModel):
    results: List[Dict[str, Any]]
    total_found: int


class SearchModule:
    def __init__(self):
        load_dotenv()
        logger.info("Inicjalizacja SearchModule dla PostgreSQL/pgvector...")

        try:
            self.db_url = os.getenv('DATABASE_URL')
            if not self.db_url:
                raise ValueError("DATABASE_URL nie zostało znalezione w pliku .env")

            self.vo = voyageai.Client(api_key=os.getenv('VOYAGE_API_KEY'))
            self.tokenizer = AutoTokenizer.from_pretrained('voyageai/voyage-3')

            logger.info("✅ Pomyślnie zainicjowano klienta Voyage AI i tokenizer.")
            logger.info("✅ Moduł gotowy do pracy z bazą danych na Railway.")

        except Exception as e:
            logger.error(f"❌ Błąd podczas inicjalizacji: {str(e)}")
            raise

    def _combine_queries(self, queries: List[str]) -> str:
        return " ".join(queries)

    def _generate_dense_embedding(self, text: str) -> List[float]:
        try:
            logger.info("🔹 Generowanie wektora gęstego (semantic)...")
            result = self.vo.contextualized_embed(
                inputs=[[text]],
                model="voyage-context-3",
                input_type="document"
            )
            embedding = result.results[0].embeddings[0]
            logger.info(f"✅ Wektor gęsty wygenerowany ({len(embedding)} wymiarów).")
            return embedding
        except Exception as e:
            logger.error(f"❌ Błąd podczas generowania wektora gęstego: {e}")
            raise

    def _generate_sparse_vector(self, text: str) -> Dict[str, float]:
        logger.info("🔸 Generowanie wektora rzadkiego (statistical)...")
        tokens = self.tokenizer.encode(text, truncation=True, max_length=4096)
        token_counts = dict(Counter(tokens))
        token_counts.pop(self.tokenizer.cls_token_id, None)
        token_counts.pop(self.tokenizer.sep_token_id, None)
        sparse_vector = {str(k): float(v) for k, v in token_counts.items()}
        logger.info(f"✅ Wektor rzadki wygenerowany ({len(sparse_vector)} niezerowych elementów).")
        return sparse_vector

    def _format_sparse_for_db(self, sparse_dict: dict) -> str:
        dimensions = self.tokenizer.vocab_size
        if not sparse_dict:
            return f'{{}}/{dimensions}'
        elements = ','.join([f'{k}:{v:g}' for k, v in sparse_dict.items()])
        return f'{{{elements}}}/{dimensions}'

    def _process_results(self, db_results: List[tuple], column_names: List[str]) -> List[Dict[str, Any]]:
        processed = []
        for row in db_results:
            res_dict = dict(zip(column_names, row))
            if 'final_score' in res_dict:
                res_dict['similarity'] = res_dict.pop('final_score')
            elif 'similarity' in res_dict:
                pass
            elif 'score' in res_dict:
                res_dict['similarity'] = res_dict.pop('score')

            res_dict.pop('description_embedding', None)
            res_dict.pop('sparse', None)

            processed.append(res_dict)
        return processed

    async def search(self, params: SearchParams) -> SearchResult:
        start_time = time.time()  # <- ZMIANA: Początek pomiaru czasu

        logger.info("=" * 50)
        logger.info(f"🚀 Rozpoczynanie wyszukiwania w PostgreSQL/pgvector")
        logger.info(f"   Typ: {params.search_type.upper()}, Top_k: {params.top_k}, Alpha: {params.alpha}")

        combined_query = self._combine_queries(params.queries)

        query_dense_vector = self._generate_dense_embedding(combined_query)
        query_sparse_vector_dict = self._generate_sparse_vector(combined_query)
        query_sparse_for_db = self._format_sparse_for_db(query_sparse_vector_dict)

        sql_query = ""
        sql_params = []

        if params.search_type == 'semantic':
            sql_query = """
                SELECT *, (1 - (description_embedding <=> %s::vector)) AS similarity
                FROM articles ORDER BY similarity DESC LIMIT %s;
            """
            sql_params = [str(query_dense_vector), params.top_k]

        elif params.search_type == 'statistical':
            sql_query = """
                SELECT *, (sparse <#> %s) AS score
                FROM articles ORDER BY score ASC LIMIT %s;
            """
            sql_params = [query_sparse_for_db, params.top_k]

        elif params.search_type == 'hybrid':
            sql_query = """
                WITH semantic_search AS (
                    SELECT "PMID", (1 - (description_embedding <=> %s::vector)) AS score
                    FROM articles ORDER BY description_embedding <=> %s::vector ASC LIMIT 100
                ),
                lexical_search_raw AS (
                    SELECT "PMID", (sparse <#> %s) AS score
                    FROM articles ORDER BY score ASC LIMIT 100
                ),
                lexical_search AS (
                    SELECT "PMID", 1.0 - CASE
                        WHEN (max(score) OVER () - min(score) OVER ()) = 0 THEN 0.0
                        ELSE (score - min(score) OVER ()) / (max(score) OVER () - min(score) OVER ())
                    END AS score
                    FROM lexical_search_raw
                )
                SELECT
                    a.*,
                    ( (%s * COALESCE(s.score, 0)) + ((1 - %s) * COALESCE(l.score, 0)) ) AS final_score
                FROM semantic_search s
                FULL OUTER JOIN lexical_search l ON s."PMID" = l."PMID"
                JOIN articles a ON a."PMID" = COALESCE(s."PMID", l."PMID")
                ORDER BY final_score DESC
                LIMIT %s;
            """
            sql_params = [
                str(query_dense_vector), str(query_dense_vector),
                query_sparse_for_db,
                params.alpha, params.alpha,
                params.top_k
            ]

        conn = None
        try:
            logger.info("📡 Łączenie z bazą danych Railway...")
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()

            logger.info("Executing query...")
            cur.execute(sql_query, sql_params)
            results = cur.fetchall()

            end_time = time.time()  # <- ZMIANA: Koniec pomiaru czasu
            duration = end_time - start_time

            colnames = [desc[0] for desc in cur.description]

            processed_results = self._process_results(results, colnames)

            # <- ZMIANA: Dodatkowy log z czasem wykonania
            logger.info(f"⏱️ Całkowity czas wyszukiwania: {duration:.4f} sekundy.")
            logger.info(f"✅ Zakończono wyszukiwanie. Znaleziono {len(processed_results)} wyników.")
            return SearchResult(results=processed_results, total_found=len(processed_results))

        except Exception as e:
            logger.error(f"❌ Błąd podczas wykonywania zapytania SQL: {e}")
            raise
        finally:
            if conn:
                conn.close()
                logger.info("🛑 Połączenie z bazą danych zostało zamknięte.")