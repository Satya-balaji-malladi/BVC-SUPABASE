import re

with open('users_js.html', 'r', encoding='utf-8') as f:
    content = f.read()

def replacer(match):
    s = match.group(0)
    # If it has newlines, replace it
    if '\n' in s:
        # We need to replace variables ${var} with ' + var + '
        # And split lines with ' + '
        s = s[1:-1] # remove backticks
        # Escape single quotes
        s = s.replace("'", "\\'")
        
        # Replace ${...}
        s = re.sub(r'\$\{([^}]+)\}', r"' + \1 + '", s)
        
        # Split by newlines and join with ' + \n'
        lines = s.split('\n')
        res = []
        for line in lines:
            res.append("'" + line + "'")
        
        return ' + \n'.join(res)
    return s

new_content = re.sub(r'`([^`]*)`', replacer, content)

with open('users_js.html', 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Done!')
