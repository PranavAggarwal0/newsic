with open('artistsfollowed.txt') as af:
    with open('/app/tosearch.txt', 'w') as ts:
        for line in af:
            if 'name' in line:
                line = line.strip()
                line = line.replace('name: ', '')
                line = line.replace('\'', '')
                line = line.replace(',', '')
                ts.write(line + '\n')
