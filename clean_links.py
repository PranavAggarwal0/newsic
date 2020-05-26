links_cleaned = ''
with open('links.txt') as l:
    for line in l:
        if 'source:' in line:
            if 'id: null' in line:
                line = line.replace('source: { id: null, name: \'', '').replace('\' },', '')
            else:
                line = line.replace('source: { id: ', '').replace('},', '')
            line = line.strip()
            links_cleaned += 'Source: ' + line + '<br>'

        if 'title:' in line:
            if 'title: \"' in line:
                line = line.replace('title: \"', 'title: \'')
            line = line.replace('title: \'', '').replace('\',', '')
            line = line.strip()
            links_cleaned += line + '<br>'

        if 'url:' in line:
            line = line.replace('url: \'', '').replace('\',', '')
            line = line.strip()
            line = '<a href=\"' + line + '\">' + line + '</a>'
            links_cleaned += line + '<br>'

        if 'urlToImage:' in line:
            if 'urlToImage: null' in line:
                links_cleaned += '<br><br><hr>'
            else:
                line = line.replace('urlToImage: \'', '').replace('\',', '')
                line = line.strip()
                line = '<img src=\"' + line + '\" width=\"600px\" height=\"300px\" alt=\"Picture!!\"/>'
                links_cleaned += line + '<br><br><br><hr>'

with open('/app/links_cleaned.txt', 'w') as lc:
    lc.write(links_cleaned)
