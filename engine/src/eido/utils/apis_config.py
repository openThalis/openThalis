from typing import Optional
from src.disk.pythonDB.services.settings import crud as settings_crud


async def fetch_api_key_for_provider(provider: str, email: Optional[str] = None) -> str:
    """Return the API key for a given provider from the database only.

    Looks up the key in the user's Eido settings table. If no email is provided
    or the key is not found, returns an empty string.
    """

    # Determine which key to look up
    provider_to_key = {
        "openai": "OPENAI_API_KEY",
        "xai": "XAI_API_KEY",
        "perplexity": "PERPLEXITY_API_KEY",
    }

    key_name = provider_to_key.get(provider.lower())
    if not key_name:
        return ""

    # Query database only if we have an email
    if email:
        try:

            general_settings = await settings_crud.get_settings_dict(email)
            value = general_settings.get(key_name, "")
            if value:
                return value
        except Exception:
            print(f"\n\n### Error fetching API key from database for {key_name}")
            return ""

    return ""

