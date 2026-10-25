#!/usr/bin/env python3
"""Добавляет к ссылкам на style.css, common.js и prices.js метку версии (?v=…),
вычисленную по содержимому файла. Когда файл меняется, меняется и метка —
браузеры покупателей сразу загружают свежую версию, а не старую из кэша.

Запуск из папки сайта:  python3 _server/bust_cache.py
(после правки CSS/JS или после python3 _server/build_pages.py .)"""
import hashlib, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
assets = ['style.css', 'common.js', 'prices.js']
ver = {a: hashlib.md5((root / a).read_bytes()).hexdigest()[:8] for a in assets if (root / a).exists()}

for page in sorted(root.glob('*.html')):
    s = page.read_text(encoding='utf-8')
    new = s
    for a, v in ver.items():
        new = re.sub(r'(["\'])' + re.escape(a) + r'(\?v=[0-9a-f]*)?\1', r'\g<1>' + a + '?v=' + v + r'\g<1>', new)
    if new != s:
        page.write_text(new, encoding='utf-8')
        print('обновлено:', page.name)
print('версии:', ver)
