import sqlite3
import os


def migrate():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    for db_name in ["doa.db", "test_doa.db"]:
        db_path = os.path.join(base_dir, db_name)
        if not os.path.exists(db_path):
            continue
        try:
            con = sqlite3.connect(db_path)
            cur = con.cursor()

            # 1. Users table columns
            cols_users = [col[1] for col in cur.execute("PRAGMA table_info(users)").fetchall()]
            if cols_users:
                if "entity_id" not in cols_users:
                    print(f"Adding entity_id to users in {db_name}")
                    cur.execute("ALTER TABLE users ADD COLUMN entity_id VARCHAR(50) DEFAULT 'ENT-BH-01'")
                if "allowed_domains" not in cols_users:
                    print(f"Adding allowed_domains to users in {db_name}")
                    cur.execute("ALTER TABLE users ADD COLUMN allowed_domains VARCHAR(255) DEFAULT NULL")

            # 2. DOA records table columns
            cols_doa = [col[1] for col in cur.execute("PRAGMA table_info(doa_records)").fetchall()]
            if cols_doa:
                if "entity_id" not in cols_doa:
                    print(f"Adding entity_id to doa_records in {db_name}")
                    cur.execute("ALTER TABLE doa_records ADD COLUMN entity_id VARCHAR(50) DEFAULT 'ENT-BH-01'")
                if "classification" not in cols_doa:
                    print(f"Adding classification to doa_records in {db_name}")
                    cur.execute("ALTER TABLE doa_records ADD COLUMN classification VARCHAR(50) DEFAULT 'Board-level DOA'")

            # 3. Change requests table columns
            cols_cr = [col[1] for col in cur.execute("PRAGMA table_info(change_requests)").fetchall()]
            if cols_cr:
                if "entity_id" not in cols_cr:
                    print(f"Adding entity_id to change_requests in {db_name}")
                    cur.execute("ALTER TABLE change_requests ADD COLUMN entity_id VARCHAR(50) DEFAULT 'ENT-BH-01'")
                if "classification" not in cols_cr:
                    print(f"Adding classification to change_requests in {db_name}")
                    cur.execute("ALTER TABLE change_requests ADD COLUMN classification VARCHAR(50) DEFAULT 'Board-level DOA'")
                if "exception_id" not in cols_cr:
                    print(f"Adding exception_id to change_requests in {db_name}")
                    cur.execute("ALTER TABLE change_requests ADD COLUMN exception_id VARCHAR(50) DEFAULT NULL")

            con.commit()
            print(f"[+] Successfully migrated {db_name}")
            con.close()
        except Exception as e:
            print(f"Error migrating {db_name}: {e}")


if __name__ == "__main__":
    migrate()
