"""Session management routes"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db, ChatSession, Summary, PersonalInfo
from schemas import SaveSessionRequest, UpdateSessionRequest
from utils import extract_summary, extract_profession_and_info
from config import OPENAI_API_KEY, OPENAI_BASE_URL

router = APIRouter(tags=["sessions"])


@router.post("/save-session")
async def save_session(
    session_data: SaveSessionRequest,
    db: Session = Depends(get_db)
):
    """Save chat session. Generate summary only if generate_summary=True (logout)"""
    try:
        # Convert messages to dict format
        messages_dict = [{"role": msg.role, "content": msg.content} for msg in session_data.messages]
        
        # Check if there's an active session (without summary) to update
        active_session = db.query(ChatSession).filter(
            ChatSession.user_id == session_data.user_id
        ).outerjoin(Summary).filter(Summary.id == None).order_by(ChatSession.updated_at.desc()).first()
        
        if active_session:
            # Update existing active session
            active_session.messages = messages_dict
            db.commit()
            db.refresh(active_session)
            chat_session = active_session
            
            # If generating summary (logout), generate it for this updated session
            if session_data.generate_summary:
                # Extract summary
                summary_data = await extract_summary(messages_dict, OPENAI_API_KEY, OPENAI_BASE_URL)
                summary = Summary(
                    chat_session_id=chat_session.id,
                    user_id=session_data.user_id,
                    summary_data=summary_data
                )
                db.add(summary)
                
                # Extract profession and personal info
                extracted_data = await extract_profession_and_info(messages_dict, OPENAI_API_KEY, OPENAI_BASE_URL)
                
                # Update or create personal info
                personal_info = db.query(PersonalInfo).filter(PersonalInfo.user_id == session_data.user_id).first()
                if personal_info:
                    # Merge with existing data - ensure we preserve existing keys
                    existing_data = personal_info.personal_info_data.copy() if personal_info.personal_info_data else {}
                    # Update with extracted data (which has <Profession> and <PersonalInfo> keys)
                    existing_data.update(extracted_data)
                    personal_info.personal_info_data = existing_data
                    print(f"✅ Updated profession '{extracted_data.get('<Profession>', '')}' for user {session_data.user_id} on logout")
                else:
                    personal_info = PersonalInfo(
                        user_id=session_data.user_id,
                        personal_info_data=extracted_data
                    )
                    db.add(personal_info)
                    print(f"✅ Created profession '{extracted_data.get('<Profession>', '')}' for user {session_data.user_id} on logout")
                
                db.commit()
                return {
                    "message": "Session updated and summary generated",
                    "session_id": chat_session.id,
                    "summary": summary_data,
                    "personal_info": extracted_data
                }
            else:
                # Just update, no summary (refresh case)
                return {
                    "message": "Session updated successfully",
                    "session_id": active_session.id
                }
        
        # No active session - create new one
        chat_session = ChatSession(
            user_id=session_data.user_id,
            messages=messages_dict
        )
        db.add(chat_session)
        db.commit()
        db.refresh(chat_session)
        
        # Only generate summary on logout (generate_summary=True)
        summary_data = None
        extracted_data = None
        if session_data.generate_summary:
            # Extract summary
            summary_data = await extract_summary(messages_dict, OPENAI_API_KEY, OPENAI_BASE_URL)
            summary = Summary(
                chat_session_id=chat_session.id,
                user_id=session_data.user_id,
                summary_data=summary_data
            )
            db.add(summary)
            
            # Extract profession and personal info
            extracted_data = await extract_profession_and_info(messages_dict, OPENAI_API_KEY, OPENAI_BASE_URL)
            
            # Update or create personal info
            personal_info = db.query(PersonalInfo).filter(PersonalInfo.user_id == session_data.user_id).first()
            if personal_info:
                # Merge with existing data - ensure we preserve existing keys
                existing_data = personal_info.personal_info_data.copy() if personal_info.personal_info_data else {}
                # Update with extracted data (which has <Profession> and <PersonalInfo> keys)
                existing_data.update(extracted_data)
                personal_info.personal_info_data = existing_data
                print(f"✅ Updated profession '{extracted_data.get('<Profession>', '')}' for user {session_data.user_id} on logout")
            else:
                personal_info = PersonalInfo(
                    user_id=session_data.user_id,
                    personal_info_data=extracted_data
                )
                db.add(personal_info)
                print(f"✅ Created profession '{extracted_data.get('<Profession>', '')}' for user {session_data.user_id} on logout")
        
        db.commit()
        
        return {
            "message": "Session saved successfully",
            "session_id": chat_session.id,
            "summary": summary_data,
            "personal_info": extracted_data
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving session: {str(e)}")


@router.put("/update-session/{session_id}")
async def update_session(
    session_id: int,
    session_data: UpdateSessionRequest,
    db: Session = Depends(get_db)
):
    """Update an existing session with new messages"""
    try:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Convert messages to dict format
        messages_dict = [{"role": msg.role, "content": msg.content} for msg in session_data.messages]
        session.messages = messages_dict
        db.commit()
        db.refresh(session)
        
        return {
            "message": "Session updated successfully",
            "session_id": session.id
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating session: {str(e)}")


@router.get("/active-session/{user_id}")
async def get_active_session(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get the active session (without summary) for a user"""
    # IMPORTANT: Only return sessions that:
    # 1. Belong to this user
    # 2. Don't have a summary (not logged out yet)
    # 3. Were created/updated recently (within last 24 hours) - prevents loading very old sessions
    
    from datetime import datetime, timedelta
    cutoff_time = datetime.utcnow() - timedelta(hours=24)
    
    active_session = db.query(ChatSession).filter(
        ChatSession.user_id == user_id,
        ChatSession.updated_at >= cutoff_time
    ).outerjoin(Summary).filter(Summary.id == None).order_by(ChatSession.updated_at.desc()).first()
    
    if not active_session:
        return {"session_id": None, "messages": []}
    
    # Verify the session belongs to the requested user (safety check)
    if active_session.user_id != user_id:
        return {"session_id": None, "messages": []}
    
    return {
        "session_id": active_session.id,
        "messages": active_session.messages
    }


@router.get("/sessions/{user_id}")
async def get_sessions(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get all chat sessions for a user"""
    sessions = db.query(ChatSession).filter(ChatSession.user_id == user_id).order_by(ChatSession.created_at.desc()).all()
    return {
        "sessions": [
            {
                "id": session.id,
                "created_at": session.created_at.isoformat(),
                "updated_at": session.updated_at.isoformat(),
                "summary": session.summary.summary_data if session.summary else None
            }
            for session in sessions
        ]
    }


@router.get("/session/{session_id}")
async def get_session(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific chat session"""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "id": session.id,
        "messages": session.messages,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
        "summary": session.summary.summary_data if session.summary else None
    }
