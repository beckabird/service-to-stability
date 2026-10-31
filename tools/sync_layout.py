#!/usr/bin/env python3
"""Write the shared header, crisis strip and footer into every page.

Edit the files in layout/, then run:  python3 tools/sync_layout.py
Each page gets the block for its site (main site or /rally-point), and the nav
link for the current page is marked with aria-current="page".
Run with --check to fail (exit 1) if any page is out of date, without writing.
"""
import glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARTS = {
    'header': r'<header class="topbar">.*?</header>',
    'crisis': r'<div class="crisis".*?</div>\s*</div>',
    'footer': r'<footer>.*?</footer>',
}
SKIP = {'staff.html'}  # the staff inbox has its own header


def url_for(rel):
    path = '/' + rel[:-5]
    if path.endswith('/index'):
        path = path[:-6] or '/'
    return path or '/'


def mark_current(block, url):
    # Only the primary nav and the mobile menu say "you are here"; the logo and footer do not.
    m = re.search(r'<nav\b.*?</nav>', block, re.S)
    if not m:
        return block
    nav = re.sub(r'(<a\b(?=[^>]*\bhref="%s")(?![^>]*\baria-current)[^>]*?)(>)' % re.escape(url),
                 r'\1 aria-current="page"\2', m.group(0))
    return block[:m.start()] + nav + block[m.end():]


def main():
    check = '--check' in sys.argv
    stale = []
    pages = glob.glob(os.path.join(ROOT, '*.html')) + glob.glob(os.path.join(ROOT, 'rally-point', '*.html'))
    for path in sorted(pages):
        rel = os.path.relpath(path, ROOT)
        if os.path.basename(rel) in SKIP:
            continue
        site = 'rally-point' if rel.startswith('rally-point/') else 'main'
        url = url_for(rel)
        src = open(path, encoding='utf-8').read()
        out = src
        for part, pat in PARTS.items():
            tpl = open(os.path.join(ROOT, 'layout', f'{site}-{part}.html'), encoding='utf-8').read().rstrip('\n')
            if part == 'header':
                tpl = mark_current(tpl, url)
            if not re.search(pat, out, re.S):
                sys.exit(f'{rel}: no {part} block found')
            out = re.sub(pat, lambda m: tpl, out, count=1, flags=re.S)
        if out != src:
            stale.append(rel)
            if not check:
                open(path, 'w', encoding='utf-8').write(out)
    if stale:
        print(('Out of date: ' if check else 'Updated: ') + ', '.join(stale))
        sys.exit(1 if check else 0)
    print('All pages match layout/.')


if __name__ == '__main__':
    main()
