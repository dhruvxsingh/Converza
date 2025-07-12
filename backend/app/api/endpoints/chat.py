from datetime import datetime
from typing import Dict, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.database import get_db, SessionLocal      # NEW import
from app.auth.dependencies import (
    get_current_user_ws,
    get_current_user,                                   # NEW import
)
from app.models.message import Message
from app.schemas.message import MessageResponse, MessageCreate

router = APIRouter(prefix="/chat", tags=["chat"])

# --- Connection manager ---
class ConnectionManager:
    # room_key -> list[WebSocket]
    rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, room: str, websocket: WebSocket):
        await websocket.accept()
        self.rooms.setdefault(room, []).append(websocket)

    def disconnect(self, room: str, websocket: WebSocket):
        if room in self.rooms:
            self.rooms[room].remove(websocket)
            if not self.rooms[room]:
                self.rooms.pop(room)

    async def broadcast(self, room: str, message: dict):
        if room not in self.rooms:
            return
        for ws in self.rooms[room]:
            await ws.send_json(message)


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
    Protocol: plain JSON -> { content: "Hello" }
    """
    room = room_id(current_user.id, partner_id)
    await manager.connect(room, websocket)

    try:
        while True:
            data = await websocket.receive_json()
            content = data.get("content", "").strip()
            if not content:
                continue

            # 1. Persist message
            db = SessionLocal()                      # OPEN session
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
            finally:
                db.close()   

                payload = MessageResponse.model_validate(msg).model_dump(mode="json")

            # 2. Broadcast to both ends
            await manager.broadcast(room, payload)
    except WebSocketDisconnect:
        manager.disconnect(room, websocket)


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