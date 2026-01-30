import pandas as pd
import numpy as np

# Disable truncation
pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)
pd.set_option('display.width', None)
pd.set_option('display.max_colwidth', None)

# Load the data
df = pd.read_csv('/home/ubuntu/Uploads/Tucson CG List Active and InActive.csv')

print("=== DATASET OVERVIEW ===")
print(f"Total records: {len(df)}")
print(f"\nColumns: {list(df.columns)}")
print(f"\nData types:\n{df.dtypes}")
print(f"\nShape: {df.shape}")

print("\n=== FIRST 10 ROWS ===")
print(df.head(10))

print("\n=== STATUS FIELD VALUES ===")
print(df['Status'].value_counts())

print("\n=== UNIQUE ZIP CODES ===")
zip_codes = df['ShippingPostalCode'].dropna().unique()
print(f"Total unique ZIP codes: {len(zip_codes)}")
print(f"ZIP codes: {sorted([str(z) for z in zip_codes])}")

print("\n=== MISSING VALUES ===")
print(df.isnull().sum())

