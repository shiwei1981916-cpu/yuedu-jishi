import json, shutil

main_p = '语文要素知识库.json'
w54_p = '语文要素知识库_rewrite_54.json'
html_p = '阅读基石.html'
idx_p = 'index.html'

main = json.load(open(main_p, encoding='utf-8'))
w54 = json.load(open(w54_p, encoding='utf-8'))
wmap = {(x['grade'], x['unit']): x for x in w54}

assert len(w54) == 54, len(w54)
assert len(wmap) == 54, 'duplicate keys in worker output'

viol = []
for x in main:
    k = (x['grade'], x['unit'])
    if x['grade'] == '三年级上册':
        continue  # already rewritten locally
    assert k in wmap, f'missing worker entry {k}'
    w = wmap[k]
    # theme must stay 100% verbatim from source (spec); keep original, ignore worker's theme
    x['reading'] = w['reading']
    x['writing'] = w['writing']
    x['raw'] = w['raw']

# final sanity checks
for x in main:
    r, w = x['reading'], x['writing']
    if not (12 <= len(r) <= 40):
        viol.append(('reading_len', x['grade'], x['unit'], len(r)))
    if not (12 <= len(w) <= 40):
        viol.append(('writing_len', x['grade'], x['unit'], len(w)))
    if x['raw'] != r + w:
        viol.append(('raw_mismatch', x['grade'], x['unit']))
    if not r or not w:
        viol.append(('empty', x['grade'], x['unit']))

print('violations:', viol if viol else 'NONE')
assert not viol, viol

json.dump(main, open(main_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

# regenerate HTML DATA block
dumped = json.dumps(main, ensure_ascii=False, separators=(", ", ": "))
lines = open(html_p, encoding='utf-8').read().split('\n')
for i, l in enumerate(lines):
    if l.startswith('const DATA ='):
        lines[i] = 'const DATA = ' + dumped + ';'
        break
else:
    raise SystemExit('const DATA not found')
open(html_p, 'w', encoding='utf-8').write('\n'.join(lines))

# bump version
lines2 = open(html_p, encoding='utf-8').read().split('\n')
for i, l in enumerate(lines2):
    if l.strip().startswith('const APP_VERSION'):
        lines2[i] = "const APP_VERSION = '1.1.0';"
        break
open(html_p, 'w', encoding='utf-8').write('\n'.join(lines2))

# copy to index.html (GitHub Pages entry)
shutil.copy(html_p, idx_p)

# verify HTML DATA parses and count == 62
txt = open(html_p, encoding='utf-8').read()
s = txt.index('const DATA =') + len('const DATA =')
e = txt.index('];', s) + 1
arr = json.loads(txt[s:e])
print('HTML DATA unit count:', len(arr))
assert len(arr) == 62
print('OK: merged 62 units, HTML regenerated, version -> 1.1.0')
