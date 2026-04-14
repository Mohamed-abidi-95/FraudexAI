import pandas as pd
import os

df = pd.read_csv('data/creditcard_clean.csv')
print('Shape:', df.shape)
print('Dtypes:')
print(df.dtypes)
print()
print('Class distribution:')
print(df['Class'].value_counts())
print()
print('Missing values:', df.isnull().sum().sum())
print()
print('Describe:')
print(df[['Time','Amount','Class']].describe())
print()
s1 = os.path.getsize('data/creditcard_clean.csv')
s2 = os.path.getsize('data/creditcard.csv')
print('creditcard_clean.csv:', round(s1/1024/1024, 1), 'MB')
print('creditcard.csv:', round(s2/1024/1024, 1), 'MB')
print()
print('Unique values in Class:', df['Class'].unique())
print('Fraud percentage:', round(df['Class'].mean()*100, 4), '%')

