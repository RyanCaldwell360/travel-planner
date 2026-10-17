from pathlib import Path
import re, yaml
from datetime import datetime
root=Path(__file__).resolve().parent
errors=[]; concepts=0; links=0
for f in sorted(root.rglob('*.md')):
    text=f.read_text(encoding='utf-8'); rel=f.relative_to(root)
    if f.name=='index.md':
        if text.startswith('---\n'):
            if rel!=Path('index.md'): errors.append(f'{rel}: section index frontmatter')
            else:
                m=yaml.safe_load(text.split('---\n')[1])
                if m!={'okf_version':'0.2'}: errors.append('root index version')
    elif f.name=='log.md':
        if text.startswith('---'): errors.append(f'{rel}: log frontmatter')
        if not re.search(r'^## \d{4}-\d{2}-\d{2}$',text,re.M): errors.append(f'{rel}: date heading missing')
    else:
        concepts+=1
        try:
            assert text.startswith('---\n')
            m=yaml.safe_load(text.split('---\n')[1]); assert isinstance(m.get('type'),str) and m['type'].strip()
            assert m.get('status') in ('draft','stable','deprecated')
            dt=m['generated']['at']; dt=datetime.fromisoformat(dt.replace('Z','+00:00')) if isinstance(dt,str) else dt
            assert dt.tzinfo is not None
            assert 'verified' not in m
            source_ids={s.get('id') for s in m.get('sources',[])}
            for footnote in re.findall(r'\[\^([^]]+)\]',text):
                assert footnote in source_ids, f'unknown source footnote {footnote}'
            for source in m.get('sources',[]):
                resource=source['resource']
                if resource.startswith('/'): assert (root/resource[1:]).is_file(),resource
        except Exception as e: errors.append(f'{rel}: frontmatter/provenance {e}')
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)',text):
        if '://' in target or target.startswith('#'): continue
        target=target.split('#')[0]
        dest=(root/target[1:]) if target.startswith('/') else f.parent/target
        links+=1
        if not dest.exists(): errors.append(f'{rel}: broken link {target}')
print(f'Concepts: {concepts}; internal links: {links}; errors: {len(errors)}')
for err in errors: print(err)
raise SystemExit(bool(errors))
