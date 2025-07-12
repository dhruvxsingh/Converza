# delete_user.py
"""
One-off helper: delete a user row from converza.db.

Usage:
    python delete_user.py
"""

from app.core.database import SessionLocal
from app.models.user import User

ID_TO_DELETE = 2   # <<<  Change this to 2, 3, 4, etc.

def main():
    db = SessionLocal()

    user = db.get(User,ID_TO_DELETE)
    if not user:
        print(f"No user with id {ID_TO_DELETE}")
        return

    print(f"Deleting id={user.id}, username={user.username}")
    db.delete(user)
    db.commit()
    db.close()
    print("Done.")

if __name__ == "__main__":
    main()