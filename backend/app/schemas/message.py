from pydantic import BaseModel
from datetime import datetime

class MessageCreate(BaseModel):
    receiver_id: int
    content: str

class MessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    created_at: datetime
    is_read: bool
    
    class Config:
        orm_mode = True