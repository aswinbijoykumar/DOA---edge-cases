import sqlite3

conn = sqlite3.connect('doa.db')
cursor = conn.cursor()

# Check user columns
cursor.execute('PRAGMA table_info(users)')
cols = [r[1] for r in cursor.fetchall()]
if 'can_request' not in cols:
    cursor.execute('ALTER TABLE users ADD COLUMN can_request BOOLEAN DEFAULT 1 NOT NULL')
    print("Added can_request to users")
if 'can_review' not in cols:
    cursor.execute('ALTER TABLE users ADD COLUMN can_review BOOLEAN DEFAULT 0 NOT NULL')
    print("Added can_review to users")

# Check change_requests columns
cursor.execute('PRAGMA table_info(change_requests)')
cr_cols = [r[1] for r in cursor.fetchall()]

migrations = [
    ('currency', "VARCHAR(20) DEFAULT 'USD'"),
    ('current_limit', 'VARCHAR(100)'),
    ('proposed_limit', 'VARCHAR(100)'),
    ('effective_date', 'VARCHAR(50)'),
    ('priority', "VARCHAR(20) DEFAULT 'MEDIUM'"),
    ('due_date', 'VARCHAR(50)'),
    ('risk_impact', 'TEXT')
]

for col_name, col_def in migrations:
    if col_name not in cr_cols:
        cursor.execute(f"ALTER TABLE change_requests ADD COLUMN {col_name} {col_def}")
        print(f"Added {col_name} to change_requests")

# Update permissions
cursor.execute("""
    UPDATE users SET can_review = 1 WHERE persona_type IN ('REVIEWER', 'APPROVER') OR role IN ('ADMIN', 'GOVERNANCE_TEAM', 'DOA_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR')
""")
cursor.execute("UPDATE users SET can_request = 1")

conn.commit()
print("Migration completed successfully!")
conn.close()
