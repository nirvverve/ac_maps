import pandas as pd

unassigned_df = pd.read_csv('/home/ubuntu/tucson_unassigned_zips.csv')
print("ZIP column dtype:", unassigned_df['ZIP'].dtype)
print("\nFirst few ZIPs:")
print(unassigned_df[['ZIP', 'City', 'Total']].head(10))
print("\nLooking for 85122:")
result = unassigned_df[unassigned_df['ZIP'] == '85122']
print(result)

