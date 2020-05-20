import requests
from bs4 import BeautifulSoup

with open('artistsfollowed.txt') as f:
    with open('tosearch.txt', 'w') as f1:
        for line in f:
            if 'name' in line:
                line = line.strip()
                line = line.replace('name: ', '')
                line = line.replace('\'', '')
                line = line.replace(',', '')
                f1.write(line+'\n')
