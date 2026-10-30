import re

for filepath in ['cpanel_deploy/cgi-bin/app.cgi', 'cgi-bin/app.cgi']:
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Ensure top imports include csv, io, secrets, random, re
    new_lines = []
    top_inserted = False
    
    # We will remove inner lines that match `^\s+import (random|secrets|re|csv|io)\s*$`
    inner_import_regex = re.compile(r'^\s+import (random|secrets|re|csv|io)\s*$')
    
    for idx, line in enumerate(lines):
        if idx < 40 and 'from email.mime.multipart import MIMEMultipart' in line and not top_inserted:
            new_lines.append(line)
            new_lines.append("import csv\n")
            new_lines.append("import io\n")
            new_lines.append("import secrets\n")
            new_lines.append("import random\n")
            new_lines.append("import re\n")
            top_inserted = True
            continue
            
        if inner_import_regex.match(line):
            # Skip inner import
            continue
            
        new_lines.append(line)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

    print(f'CLEANED_IMPORTS_IN_{filepath}')
