"""Chat routes"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db, PersonalInfo
from schemas import ChatRequest, ChatResponse
from prompts import get_system_prompt
from utils import call_openai_api, extract_profession_and_info
import httpx

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """Send chat messages"""
    from config import OPENAI_API_KEY, OPENAI_BASE_URL
    
    api_key = request.api_key or OPENAI_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=400, 
            detail="API key is required."
        )
    
    api_url = OPENAI_BASE_URL
    
    # Get user's personal info and profession
    personal_info_record = db.query(PersonalInfo).filter(PersonalInfo.user_id == request.user_id).first()
    profession = None
    personal_info_text = None
    
    if personal_info_record:
        personal_info_data = personal_info_record.personal_info_data
        profession = personal_info_data.get("<Profession>", "") or personal_info_data.get("Profession", "")
        personal_info_text = personal_info_data.get("<PersonalInfo>", "") or personal_info_data.get("PersonalInfo", "")
    
    # LIVE PROFESSION EXTRACTION: If profession not saved yet, try to extract from current messages
    if not profession or profession == "":
        # Check if we have enough messages to extract profession (at least 2-3 messages)
        if len(request.messages) >= 2:
            # Extract profession from current conversation
            messages_dict = [{"role": msg.role, "content": msg.content} for msg in request.messages]
            extracted_data = await extract_profession_and_info(messages_dict, api_key, api_url)
            
            extracted_profession = extracted_data.get("<Profession>", "").strip()
            extracted_personal_info = extracted_data.get("<PersonalInfo>", "").strip()
            
            # If profession was extracted, save it immediately
            if extracted_profession:
                profession = extracted_profession
                if personal_info_record:
                    # Update existing - ensure we use the correct keys
                    existing_data = personal_info_record.personal_info_data.copy() if personal_info_record.personal_info_data else {}
                    existing_data["<Profession>"] = extracted_profession
                    if extracted_personal_info:
                        existing_data["<PersonalInfo>"] = extracted_personal_info
                    personal_info_record.personal_info_data = existing_data
                else:
                    # Create new - use extracted_data directly (already has correct keys)
                    personal_info_record = PersonalInfo(
                        user_id=request.user_id,
                        personal_info_data=extracted_data
                    )
                    db.add(personal_info_record)
                db.commit()
                db.refresh(personal_info_record)
                personal_info_text = extracted_personal_info if extracted_personal_info else personal_info_text
                print(f"✅ Saved profession '{extracted_profession}' for user {request.user_id}")
    
    # Get system prompt with user context
    system_prompt = get_system_prompt(profession, personal_info_text)
    
    try:
        # Prepare messages with system prompt
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend([{"role": msg.role, "content": msg.content} for msg in request.messages])
        
        # Call OpenAI API
        assistant_message = await call_openai_api(
            messages=messages,
            api_key=api_key,
            api_url=api_url,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        return ChatResponse(
            response=assistant_message,
            usage=None
        )
        
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request to OpenAI timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Network error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
