from sqlalchemy import create_engine, text

def test_db():
    db_url = "mysql+pymysql://root:@127.0.0.1:3306/hinneh_unifie"
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            res = conn.execute(text("SELECT * FROM api_personnel")).fetchall()
            print("MySQL Personnel count:", len(res))
            for row in res:
                print(dict(row._mapping))
    except Exception as e:
        print("Error connecting to MySQL:", e)

if __name__ == "__main__":
    test_db()
