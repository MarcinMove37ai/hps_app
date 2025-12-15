from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
import logging
import sys
import os
import traceback
import uvicorn
from dotenv import load_dotenv

from search_module import SearchModule, SearchParams, SearchResult

# Konfiguracja logowania
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('api.log')
    ]
)
logger = logging.getLogger(__name__)

# Ładowanie zmiennych środowiskowych
load_dotenv()
logger.info("Environment loaded")

app = FastAPI(title="Omega3 Search API")

# Konfiguracja CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instancja modułu wyszukiwania
search_module = None


@app.on_event("startup")
async def startup_event():
    """Inicjalizacja przy starcie aplikacji."""
    global search_module
    logger.info("Starting API server")
    try:
        search_module = SearchModule()
        logger.info("SearchModule initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize SearchModule: {str(e)}")
        logger.error(traceback.format_exc())
        raise


@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Endpoint do sprawdzania stanu aplikacji."""
    if search_module is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Search module not initialized"
        )
    return {
        "status": "healthy",
        "search_module": True
    }


@app.post("/search", response_model=SearchResult)
async def search(params: SearchParams):
    """
    Endpoint wyszukiwania badań.

    Args:
        params: SearchParams - parametry wyszukiwania zawierające:
            - queries: List[str] - lista zapytań
            - search_type: str - typ wyszukiwania (semantic/statistical/hybrid)
            - top_k: int - liczba wyników
            - alpha: Optional[float] - waga dla wyszukiwania hybrydowego
    """
    request_id = id(params)
    logger.info(f"[Request {request_id}] Received search request: {params}")

    try:
        # Sprawdzenie inicjalizacji modułu
        if search_module is None:
            raise HTTPException(
                status_code=503,
                detail="Search module not initialized"
            )

        # Walidacja parametrów
        if not params.queries:
            raise HTTPException(
                status_code=400,
                detail="No queries provided"
            )

        # Wywołanie wyszukiwania
        results = await search_module.search(params)

        logger.info(
            f"[Request {request_id}] Search completed successfully. "
            f"Found {results.total_found} results"
        )

        return results

    except Exception as e:
        logger.error(f"[Request {request_id}] Search error: {str(e)}")
        logger.error(traceback.format_exc())

        if isinstance(e, HTTPException):
            raise

        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


def start():
    """Funkcja startowa dla serwera."""
    try:
        logger.info("Starting Uvicorn server")
        uvicorn.run(
            "main:app",
            host="127.0.0.1",
            port=8000,
            reload=True,
            log_level="info"
        )
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        logger.error(traceback.format_exc())
        sys.exit(1)


if __name__ == "__main__":
    start()
