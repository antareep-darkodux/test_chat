"""Utility functions for OpenAI API calls and data extraction"""
import httpx
import re
import json
from typing import List, Dict
from config import OPENAI_API_KEY, OPENAI_BASE_URL


async def extract_summary(messages: List[Dict], api_key: str = None, api_url: str = None) -> Dict:
    """Extract summary from chat messages using OpenAI"""
    api_key = api_key or OPENAI_API_KEY
    api_url = api_url or OPENAI_BASE_URL
    
    try:
        summary_prompt = """Please provide a concise summary of this conversation in JSON format:
{
    "summary": "brief summary of the conversation"
}

Keep it short and focused on the main topics discussed."""
        
        conversation_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
        full_prompt = f"{summary_prompt}\n\nConversation:\n{conversation_text}"
        
        is_azure = 'azure' in api_url.lower()
        headers = {"Content-Type": "application/json"}
        if is_azure:
            headers["api-key"] = api_key
        else:
            headers["Authorization"] = f"Bearer {api_key}"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            request_body = {
                "messages": [{"role": "user", "content": full_prompt}],
                "temperature": 0.3,
                "max_tokens": 200
            }
            
            if not is_azure:
                request_body["model"] = "gpt-3.5-turbo"
            
            response = await client.post(
                api_url if is_azure else f"{api_url}/chat/completions",
                headers=headers,
                json=request_body
            )
            
            if response.status_code == 200:
                data = response.json()
                summary_text = data["choices"][0]["message"]["content"]
                # Try to extract JSON from response
                json_match = re.search(r'\{[^}]+\}', summary_text, re.DOTALL)
                if json_match:
                    return {"summary": json.loads(json_match.group()).get("summary", summary_text.strip())}
                return {"summary": summary_text.strip()}
            else:
                return {"summary": "Summary extraction failed"}
    except Exception as e:
        print(f"Error extracting summary: {e}")
        return {"summary": "Summary extraction failed"}


async def extract_profession_and_info(messages: List[Dict], api_key: str = None, api_url: str = None) -> Dict:
    """Extract profession and personal info from conversation"""
    api_key = api_key or OPENAI_API_KEY
    api_url = api_url or OPENAI_BASE_URL
    
    try:
        extraction_prompt = """From this conversation, extract the user's profession and personal information.
Return in JSON format:
{
    "<PersonalInfo>": "extracted personal information about the user",
    "<Profession>": "user's profession or job"
}

If profession is mentioned, extract it. If not, leave it empty."""
        
        conversation_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
        full_prompt = f"{extraction_prompt}\n\nConversation:\n{conversation_text}"
        
        is_azure = 'azure' in api_url.lower()
        headers = {"Content-Type": "application/json"}
        if is_azure:
            headers["api-key"] = api_key
        else:
            headers["Authorization"] = f"Bearer {api_key}"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            request_body = {
                "messages": [{"role": "user", "content": full_prompt}],
                "temperature": 0.3,
                "max_tokens": 300
            }
            
            if not is_azure:
                request_body["model"] = "gpt-3.5-turbo"
            
            response = await client.post(
                api_url if is_azure else f"{api_url}/chat/completions",
                headers=headers,
                json=request_body
            )
            
            if response.status_code == 200:
                data = response.json()
                extraction_text = data["choices"][0]["message"]["content"]
                # Try to extract JSON from response
                json_match = re.search(r'\{[^}]+\}', extraction_text, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
                return {"<PersonalInfo>": "", "<Profession>": ""}
            else:
                return {"<PersonalInfo>": "", "<Profession>": ""}
    except Exception as e:
        print(f"Error extracting profession and info: {e}")
        return {"<PersonalInfo>": "", "<Profession>": ""}


async def call_openai_api(
    messages: List[Dict],
    api_key: str = None,
    api_url: str = None,
    model: str = "gpt-3.5-turbo",
    temperature: float = 0.7,
    max_tokens: int = 500
) -> str:
    """Call OpenAI API and return the response"""
    api_key = api_key or OPENAI_API_KEY
    api_url = api_url or OPENAI_BASE_URL
    
    is_azure = 'azure' in api_url.lower()
    headers = {"Content-Type": "application/json"}
    if is_azure:
        headers["api-key"] = api_key
    else:
        headers["Authorization"] = f"Bearer {api_key}"
    
    request_body = {
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    if not is_azure:
        request_body["model"] = model
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            api_url if is_azure else f"{api_url}/chat/completions",
            headers=headers,
            json=request_body
        )
        
        if response.status_code != 200:
            error_text = response.text
            raise Exception(f"OpenAI API error: {error_text}")
        
        data = response.json()
        return data["choices"][0]["message"]["content"]
