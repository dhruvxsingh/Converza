# backend/app/api/endpoints/chat.py
from datetime import datetime
from typing import Dict, List, Tuple

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db, SessionLocal
from app.auth.dependencies import (
    get_current_user_ws,
    get_current_user,
)
from app.models.message import Message
from app.schemas.message import MessageResponse, MessageCreate

router = APIRouter(prefix="/chat", tags=["chat"])

# --- Connection manager ---
class ConnectionManager:
    def __init__(self):
        # room_key -> list of (user_id, websocket) tuples
        self.rooms: Dict[str, List[Tuple[int, WebSocket]]] = {}

    async def connect(self, room: str, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if room not in self.rooms:
            self.rooms[room] = []
        self.rooms[room].append((user_id, websocket))

    def disconnect(self, room: str, user_id: int, websocket: WebSocket):
        if room in self.rooms:
            self.rooms[room] = [(uid, ws) for uid, ws in self.rooms[room] 
                               if not (uid == user_id and ws == websocket)]
            if not self.rooms[room]:
                del self.rooms[room]

    async def broadcast(self, room: str, message: dict, exclude_user_id: int = None):
        if room not in self.rooms:
            return
        
        disconnected = []
        for user_id, ws in self.rooms[room]:
            # Skip sending to excluded user for signaling messages
            if exclude_user_id and user_id == exclude_user_id and message.get("type") in ["call-offer", "call-answer", "ice-candidate"]:
                continue
            
            try:
                await ws.send_json(message)
            except:
                disconnected.append((user_id, ws))
        
        # Clean up disconnected websockets
        for user_id, ws in disconnected:
            self.disconnect(room, user_id, ws)


manager = ConnectionManager()

# --- Helper: build deterministic room id for a 1-to-1 chat ---
def room_id(user_a: int, user_b: int) -> str:
    """Always returns the same string for a pair of user ids (e.g. '3_7')."""
    return "_".join(map(str, sorted([user_a, user_b])))


# ---- WebSocket endpoint ----------------------------------------------------
@router.websocket("/ws/{partner_id}")
async def chat_ws(
    websocket: WebSocket,
    partner_id: int,
    current_user=Depends(get_current_user_ws)
):
    """
    WebSocket URL:  ws://…/api/chat/ws/<partner_id>?token=<JWT>
    Protocol: JSON messages with different types
    """
    room = room_id(current_user.id, partner_id)
    await manager.connect(room, current_user.id, websocket)
    
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            
            # Handle video call signaling messages
            if msg_type in {"call-offer", "call-answer", "ice-candidate", "call-end"}:
                # Don't send back to sender for signaling
                await manager.broadcast(room, data, exclude_user_id=current_user.id)
                continue
            
            # Handle regular chat messages
            content = data.get("content", "").strip()
            if not content:
                continue

            # 1. Persist message
            db = SessionLocal()
            try:
                msg = Message(
                    sender_id=current_user.id,
                    receiver_id=partner_id,
                    content=content,
                    created_at=datetime.utcnow(),
                )
                db.add(msg)
                db.commit()
                db.refresh(msg)
                
                # Convert to response format
                payload = MessageResponse.model_validate(msg).model_dump(mode="json")
                
                # 2. Broadcast to both users (including sender for chat)
                await manager.broadcast(room, payload)
                
            finally:
                db.close()
                
    except WebSocketDisconnect:
        manager.disconnect(room, current_user.id, websocket)


# ---- History endpoint ------------------------------------------------------
@router.get("/messages/{partner_id}", response_model=List[MessageResponse])
def get_history(
    partner_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    room_users = {current_user.id, partner_id}
    messages = (
        db.query(Message)
        .filter(
            Message.sender_id.in_(room_users),
            Message.receiver_id.in_(room_users),
        )
        .order_by(Message.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    # newest->oldest; reverse for UI
    return list(reversed(messages))