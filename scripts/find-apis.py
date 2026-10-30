import os, re

routes = set()
for folder in ['app', 'components']:
    for root, _, files in os.walk(folder):
        for f in files:
            if f.endswith(('.tsx', '.ts', '.js')):
                p = os.path.join(root, f)
                # Skip route.ts files themselves
                if 'route.ts' in f:
                    continue
                text = open(p, 'r', encoding='utf-8', errors='ignore').read()
                for m in re.findall(r'[\'"`](/api/v1/[^\'"`\s\?]+)', text):
                    routes.add((m, p))

for r, p in sorted(routes):
    print(f'{r:45} -> {p}')
