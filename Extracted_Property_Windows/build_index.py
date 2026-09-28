from pathlib import Path
from html.parser import HTMLParser
from html import escape
from urllib.parse import unquote
import shutil
import json
import hashlib

ROOT = Path(__file__).resolve().parent
HELP = ROOT / 'Help'

class Tags(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.images = []
        self.links = []
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'img' and a.get('src'):
            self.images.append(a['src'])
        if tag == 'a' and a.get('href'):
            self.links.append(a['href'])

overview = HELP / 'Station_Modules/About_Station_Modules.htm'
stations = sorted({(overview.parent / href).resolve().parent for href in Tags(overview.read_text(encoding='cp1252')).links if '_Features.htm' in href})
records = []
sections = []
extras = []
for station in stations:
    name = station.name.replace('_', ' ')
    cards = []
    primary = set()
    pages = sorted(station.glob('*Properties.htm'))
    assert pages, f'No properties page: {name}'
    for page in pages:
        for src in Tags(page.read_text(encoding='cp1252')).images:
            source = (page.parent / unquote(src).replace('\\', '/')).resolve()
            assert source.is_file(), source
            primary.add(source)
            dest = ROOT / 'Station_Screens' / station.name / source.name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, dest)
            assert hashlib.sha256(source.read_bytes()).digest() == hashlib.sha256(dest.read_bytes()).digest()
            rel = dest.relative_to(ROOT).as_posix()
            doc = page.relative_to(ROOT).as_posix()
            records.append({'station': name, 'image': rel, 'documentation': doc, 'source_image': source.relative_to(ROOT).as_posix()})
            cards.append(f'<figure><a href="{escape(rel)}"><img loading="lazy" src="{escape(rel)}" alt="{escape(source.stem)}"></a><figcaption>{escape(source.stem)} · <a href="{escape(doc)}">Field descriptions</a></figcaption></figure>')
    sections.append(f'<section id="{station.name}"><h2>{escape(name)}</h2>{"".join(cards)}</section>')
    extra_cards = []
    for source in sorted(station.rglob('*')):
        if source.is_file() and '_scn' in source.stem.lower() and source.suffix.lower() in {'.png', '.gif', '.jpg'} and source not in primary:
            dest = ROOT / 'Additional_Station_Screens' / station.name / source.name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, dest)
            rel = dest.relative_to(ROOT).as_posix()
            extras.append(rel)
            extra_cards.append(f'<figure><a href="{rel}"><img loading="lazy" src="{rel}" alt="{escape(source.stem)}"></a><figcaption>{escape(source.stem)}</figcaption></figure>')
    if extra_cards:
        sections.append(f'<details><summary>{escape(name)} — {len(extra_cards)} additional example / evaluation screens</summary>{"".join(extra_cards)}</details>')

nav = ' '.join(f'<a href="#{p.name}">{escape(p.name.replace("_", " "))}</a>' for p in stations)
html = f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sugars — Station Property Windows</title>
<style>body{{font:16px/1.6 system-ui,sans-serif;margin:32px auto;padding:0 24px;max-width:1100px;background:#f4f6f8;color:#192735}}h1{{line-height:1.2}}nav{{display:flex;flex-wrap:wrap;gap:8px}}nav a{{background:#fff;padding:5px 10px;border:1px solid #ccd5df;border-radius:5px}}a{{color:#075da2}}section,details{{background:white;padding:20px;margin:20px 0;border:1px solid #d9e0e7;border-radius:8px}}figure{{margin:20px 0}}img{{max-width:100%;height:auto;border:1px solid #ddd}}figcaption{{font-size:13px;color:#4c5d6a}}summary{{cursor:pointer}}@media print{{nav,details{{display:none}}section{{break-before:page}}}}</style>
<h1>Sugars station property windows</h1><p>{len(stations)} station types · {len(records)} property screenshots · {len(extras)} additional example and evaluation screenshots.</p>
<p>Original images extracted from <b>Help/sugars.chm</b>. Click a screenshot to open it at its original size, or use “Field descriptions” to read the original help page. These are documentation screenshots, not editable or live program windows. Coverage includes every station listed in the manual; undocumented runtime screens may not be represented.</p>
<nav>{nav}</nav>{''.join(sections)}</html>'''
(ROOT / 'index.html').write_text(html, encoding='utf-8')
(ROOT / 'manifest.json').write_text(json.dumps({'source': 'Help/sugars.chm', 'station_count': len(stations), 'property_screenshots': records, 'additional_screenshots': extras}, indent=2), encoding='utf-8')
(ROOT / 'README.txt').write_text(f'Open index.html to browse all extracted station property screenshots.\n\nStation_Screens: {len(records)} original property screenshots for {len(stations)} station types.\nAdditional_Station_Screens: {len(extras)} example/evaluation screenshots.\nHelp: complete extracted help manual, including field descriptions and other program screens.\nmanifest.json: source mapping for each property screenshot.\n\nThese are the screenshots provided by the installed help manual, not editable form source or newly captured live windows. All stations listed in About Station Modules have property-page coverage. Runtime variations not shown in the manual cannot be verified from these images.\n', encoding='utf-8')
print(json.dumps({'stations': len(stations), 'property_screenshots': len(records), 'additional_screenshots': len(extras)}, indent=2))
