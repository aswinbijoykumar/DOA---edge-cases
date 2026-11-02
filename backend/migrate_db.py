import sqlite3

def migrate():
    for db_path in ["doa.db", "test_doa.db"]:
        try:
            con = sqlite3.connect(db_path)
            cur = con.cursor()
            cols_doa = [col[1] for col in cur.execute("PRAGMA table_info(doa_records)").fetchall()]
            if "entity_id" not in cols_doa:
                print(f"Adding entity_id to doa_records in {db_path}")
                cur.execute("ALTER TABLE doa_records ADD COLUMN entity_id VARCHAR(50) DEFAULT 'ENT-BH-01'")
            if "classification" not in cols_doa:
                print(f"Adding classification to doa_records in {db_path}")
                cur.execute("ALTER TABLE doa_records ADD COLUMN classification VARCHAR(50) DEFAULT 'Board-level DOA'")

            
            if "entity_id" not in cols:
                print(f"Adding entity_id to {db_path}")
                cur.execute("ALTER TABLE change_requests ADD COLUMN entity_id VARCHAR(50) DEFAULT 'ENT-BH-01'")
                
            if "classification" not in cols:
                print(f"Adding classification to {db_path}")
                cur.execute("ALTER TABLE change_requests ADD COLUMN classification VARCHAR(50) DEFAULT 'Board-level DOA'")
                
            if "exception_id" not in cols:
                print(f"Adding exception_id to {db_path}")
                cur.execute("ALTER TABLE change_requests ADD COLUMN exception_id VARCHAR(50) DEFAULT NULL")
                
            con.commit()
            cols_after = [col[1] for col in cur.execute("PRAGMA table_info(change_requests)").fetchall()]
            print(f"{db_path} columns now: {cols_after}")
            con.close()
        except Exception as e:
            print(f"Error migrating {db_path}: {e}")

if __name__ == "__main__":
    migrate()
