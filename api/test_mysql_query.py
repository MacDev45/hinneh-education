from sqlalchemy import create_engine, text

def test():
    db_url = "mysql+pymysql://root:@127.0.0.1:3306/hinneh_unifie"
    engine = create_engine(db_url)
    with engine.connect() as conn:
        # Check all personnel
        print("ALL PERSONNEL:")
        res = conn.execute(text("SELECT id, prenom, nom FROM api_personnel")).fetchall()
        for r in res:
            print(dict(r._mapping))
            
        print("\nQUERY WHERE id = 1:")
        res = conn.execute(text("SELECT id, prenom, nom FROM api_personnel WHERE id = 1")).fetchall()
        for r in res:
            print(dict(r._mapping))

        print("\nQUERY WHERE id = :1:")
        # Let's see what happens if we pass ':1' or ':id' as parameter or as literal
        try:
            res = conn.execute(text("SELECT id, prenom, nom FROM api_personnel WHERE id = ':1'")).fetchall()
            print("Literal ':1' query results:")
            for r in res:
                print(dict(r._mapping))
        except Exception as e:
            print("Literal ':1' query failed:", e)

        try:
            res = conn.execute(text("SELECT id, prenom, nom FROM api_personnel WHERE id = :staff_id"), {"staff_id": ":1"}).fetchall()
            print("Parameterized ':1' query results:")
            for r in res:
                print(dict(r._mapping))
        except Exception as e:
            print("Parameterized ':1' query failed:", e)

if __name__ == "__main__":
    test()
