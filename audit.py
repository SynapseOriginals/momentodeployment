import os
import re
import sys

dir_path = os.path.dirname(os.path.abspath(__file__))
frontend_dir = os.path.join(dir_path, 'frontend')
backend_dir = os.path.join(dir_path, 'backend')
errors = []

print("Auditing Full-Stack Architecture...")

# 1. Check Directory Separation
if not os.path.isdir(frontend_dir):
    errors.append("Missing 'frontend/' directory")
if not os.path.isdir(backend_dir):
    errors.append("Missing 'backend/' directory")

# 2. Check Backend Core Files
backend_files = ['server.js', 'package.json', os.path.join('data', 'inquiries.json')]
for bf in backend_files:
    bp = os.path.join(backend_dir, bf)
    if not os.path.exists(bp):
        errors.append(f"[backend] Missing backend file: {bf}")

# 3. Check Frontend HTML Files
html_files = ['index.html', 'experience.html', 'faq.html', 'watch.html', 'conversation.html', 'pricing.html', 'reserve.html']

for file in html_files:
    file_path = os.path.join(frontend_dir, file)
    if not os.path.exists(file_path):
        errors.append(f"[frontend] Missing file: {file}")
        continue
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check internal href links
    hrefs = re.findall(r'href=["\']([^"\']+)["\']', content)
    for link in hrefs:
        if not link.startswith(('http', 'mailto:', 'tel:', '#', 'data:')):
            clean_path = link.split('?')[0].split('#')[0]
            if clean_path and not os.path.exists(os.path.join(frontend_dir, clean_path)):
                errors.append(f"[frontend/{file}] Broken link: {link}")

    # Check image src
    srcs = re.findall(r'src=["\']([^"\']+)["\']', content)
    for src in srcs:
        if not src.startswith(('http', 'data:', 'blob:')):
            clean_src = src.split('?')[0]
            if clean_src and not os.path.exists(os.path.join(frontend_dir, clean_src)):
                errors.append(f"[frontend/{file}] Missing asset: {src}")

# 4. Check Voice Feature in frontend/index.html ("What Momento Is Not")
with open(os.path.join(frontend_dir, 'index.html'), 'r', encoding='utf-8') as f:
    index_content = f.read()

if 'What Momento Is Not' not in index_content:
    errors.append("[frontend/index.html] Missing 'What Momento Is Not' section")

if 'section-not-momento' not in index_content:
    errors.append("[frontend/index.html] Missing voice button target for 'What Momento Is Not'")

# 5. Check Voice Feature in frontend/faq.html ("Questions & Answers")
with open(os.path.join(frontend_dir, 'faq.html'), 'r', encoding='utf-8') as f:
    faq_content = f.read()

if 'Questions & Answers' not in faq_content:
    errors.append("[frontend/faq.html] Missing 'Questions & Answers' section")

if 'Listen to Overview' not in faq_content and 'Listen to Questions and Answers' not in faq_content:
    errors.append("[frontend/faq.html] Missing voice button for 'Questions & Answers'")

# 6. Check Core Assets
core_assets = ['assets/logo.jpg', 'assets/logo-dark.jpg', 'assets/favicon.png']
for asset in core_assets:
    if not os.path.exists(os.path.join(frontend_dir, asset)):
        errors.append(f"[frontend] Missing core asset: {asset}")

if not errors:
    print("\nSUCCESS: Frontend & Backend separation verified with 0 errors!")
    print(f"- Frontend Root: {frontend_dir}")
    print(f"- Backend Root:  {backend_dir}")
else:
    print("\nFAILED: Errors found:")
    for err in errors:
        print(f"- {err}")
    sys.exit(1)
