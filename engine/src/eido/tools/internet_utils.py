from src.eido.utils.apis_config import fetch_api_key_for_provider


async def internet_perplexity_search(query, email):
    """Internet search using perplexity API, useful for internet searches, news, etc."""
    import requests

    PERPLEXITY_KEY = await fetch_api_key_for_provider("perplexity", email=email)

    if not PERPLEXITY_KEY:
        return "No perplexity key found"

    url = "https://api.perplexity.ai/chat/completions"

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {PERPLEXITY_KEY.strip()}"
    }

    payload = {
        "model": "sonar",
        "messages": [
            {
                "role": "system",
                "content": """
You are a powerful online search engine; Be precise and concise, return as many information as possible while getting to the point. 
You prioritize the least unbias and most reliable sources and filter out the most biased and unreliable sources.
You MUST return a json response EXACTLY like this:
'''
{
"response" : "the response",
"sources" : "numbered exact sources links",
"related" : "related queries to the user search query/topic/your response"
}
'''
"""
            },
            {
                "role": "user",
                "content": query
            }
        ],
        "max_tokens": 4000,
        "temperature": 0
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        response_text = response.text

        if response.status_code != 200:
            error_message = {
                "success": False,
                "error": f"API request failed with status code {response.status_code}. Response: {response_text}"
            }
            if response.status_code == 401:
                error_message["error"] = "Authentication failed. Please check your API key."
            return error_message

        response_data = response.json()
        return {
            "success": True,
            "data": response_data['choices'][0]['message']['content']
        }

    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "error": f"Request error: {str(e)}"
        }
    except (KeyError, ValueError, requests.exceptions.JSONDecodeError) as e:
        return {
            "success": False,
            "error": f"Error processing response: {str(e)}. Response: {response_text}"
        }