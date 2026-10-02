import pdfplumber

with pdfplumber.open("uploaded_files/6eme.pdf") as pdf:
    for i, page in enumerate(pdf.pages[:2]):
        tables = page.extract_tables()
        print(f"=== PAGE {i+1} : {len(tables)} table(s) ===")
        for t_idx, table in enumerate(tables):
            print(f"--- table {t_idx} : {len(table)} rows ---")
            for row in table[:5]:
                print(row)
