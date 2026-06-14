import os
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

def get_llm(temperature=0.7, api_key=None, model=None, max_tokens=None):
    load_dotenv(override=True)
    if not api_key:
        api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("AZURE_OPENAI_API_KEY")
    base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    if not model:
        model = os.getenv("OPENROUTER_CHAT_MODEL", "google/gemini-2.5-flash")
    
    # Sensible default to prevent OpenRouter 402 errors (insufficient balance for max model tokens)
    if max_tokens is None:
        try:
            max_tokens = int(os.getenv("OPENROUTER_MAX_TOKENS", "4096"))
        except ValueError:
            max_tokens = 4096
    
    return ChatOpenAI(
        model=model,
        openai_api_key=api_key,
        openai_api_base=base_url,
        temperature=temperature,
        max_tokens=max_tokens,
        default_headers={
            "HTTP-Referer": "https://localhost:3000",
            "X-OpenRouter-Title": "Vendor Verse"
        }
    )
