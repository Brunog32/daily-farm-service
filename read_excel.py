import pandas as pd
import json
import sys

def read_excel_file(filepath):
    try:
        xls = pd.ExcelFile(filepath)
        data = {}
        for sheet_name in xls.sheet_names:
            df = pd.read_excel(filepath, sheet_name=sheet_name)
            data[sheet_name] = df.to_json(orient='records')
        print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    read_excel_file("CHECK LIST.xlsx")
