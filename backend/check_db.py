import sqlite3

# Connect to database
conn = sqlite3.connect('converza.db')
cursor = conn.cursor()

# Show all tables
print("=== TABLES IN DATABASE ===")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
for table in tables:
    print(f"- {table[0]}")

# Show users
print("\n=== USERS IN DATABASE ===")
cursor.execute("SELECT id, username, email, created_at FROM users;")
users = cursor.fetchall()
for user in users:
    print(f"ID: {user[0]}, Username: {user[1]}, Email: {user[2]}, Created: {user[3]}")

# Show messages
print("\n=== MESSAGES IN DATABASE ===")
cursor.execute("SELECT COUNT(*) FROM messages;")
count = cursor.fetchone()[0]
print(f"Total messages: {count}")

conn.close()