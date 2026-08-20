import os
import re
import sys

dir_path = os.path.dirname(os.path.abspath(__file__))
errors = []

print("Auditing MOMENTO Static Website...")

# 1. Check HTML Files
html_files = ['index.html', 'experience.html', 'faq.html', 'watch.html', 'conversation.html', 'pricing.html', 'reserve.html']

for file in html_files:
    file_path = os.path.join(dir_path, file)
    if not os.path.exists(file_path):
        errors.append(f"Missing file: {file}")
        continue
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check internal href links
    hrefs = re.findall(r'href=["\']([^"\']+)["\']', content)
    for link in hrefs:
        if not link.startswith(('http', 'mailto:', 'tel:', '#', 'data:')):
            clean_path = link.split('?')[0].split('#')[0]
            if clean_path and not os.path.exists(os.path.join(dir_path, clean_path)):
                errors.append(f"[{file}] Broken link: {link}")

    # Check image src
    srcs = re.findall(r'src=["\']([^"\']+)["\']', content)
    for src in srcs:
        if not src.startswith(('http', 'data:', 'blob:')):
            clean_src = src.split('?')[0]
            if clean_src and not os.path.exists(os.path.join(dir_path, clean_src)):
                errors.append(f"[{file}] Missing asset: {src}")

# 2. Check Core Assets
core_assets = ['assets/logo.jpg', 'assets/logo-dark.jpg', 'assets/favicon.png', 'styles.css', 'main.js']
for asset in core_assets:
    if not os.path.exists(os.path.join(dir_path, asset)):
        errors.append(f"Missing core asset: {asset}")

if not errors:
    print("\nSUCCESS: All static pages, stylesheets, scripts, navigation links, and media verified with 0 errors!")
else:
    print("\nFAILED: Errors found:")
    for err in errors:
        print(f"- {err}")
    sys.exit(1)
