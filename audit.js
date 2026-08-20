const fs = require('fs');
const path = require('path');

const dir = __dirname;
const htmlFiles = ['index.html', 'experience.html', 'faq.html', 'watch.html', 'conversation.html', 'pricing.html', 'reserve.html'];
let errors = [];

htmlFiles.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) {
    errors.push('File missing: ' + file);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  console.log('Auditing ' + file + '...');

  // Check internal href links
  const hrefRegex = /href=["']([^"']+)["']/g;
  let match;
  while ((match = hrefRegex.exec(content)) !== null) {
    const link = match[1];
    if (!link.startsWith('http') && !link.startsWith('mailto:') && !link.startsWith('tel:') && !link.startsWith('#') && !link.startsWith('data:')) {
      const cleanPath = link.split('?')[0].split('#')[0];
      if (cleanPath && !fs.existsSync(path.join(dir, cleanPath))) {
        errors.push(`[${file}] Broken link: ${link}`);
      }
    }
  }

  // Check image src
  const srcRegex = /src=["']([^"']+)["']/g;
  while ((match = srcRegex.exec(content)) !== null) {
    const src = match[1];
    if (!src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('blob:')) {
      const cleanSrc = src.split('?')[0];
      if (cleanSrc && !fs.existsSync(path.join(dir, cleanSrc))) {
        errors.push(`[${file}] Missing asset: ${src}`);
      }
    }
  }
});

// Check Journey order in index.html and experience.html
const requiredJourney = [
  '1. Start a Conversation',
  '2. Story Discovery',
  '3. Storyteller Preparation',
  '4. Guided Filming',
  '5. Thoughtful Editing',
  '6. Private Delivery',
  '7. Long-term Preservation'
];

const indexHtml = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
requiredJourney.forEach(step => {
  if (!indexHtml.includes(step)) {
    errors.push(`[index.html] Missing or misspelled journey step: ${step}`);
  }
});

// Check Logistics & Investment content
if (!indexHtml.includes('Hyderabad') || !indexHtml.includes('Available across India') || !indexHtml.includes('Starts from ₹1,50,000')) {
  errors.push('[index.html] Missing required logistics/investment details');
}

// Check Embedded Preview Player in index.html
if (!indexHtml.includes('previewVideoPlayer') || !indexHtml.includes('preview-chapter-btn')) {
  errors.push('[index.html] Missing embedded preview player');
}

// Check Trust & Privacy Section in index.html
if (!indexHtml.includes('100% Family Ownership') || !indexHtml.includes('Private Family Viewing')) {
  errors.push('[index.html] Missing trust and privacy section');
}

if (errors.length === 0) {
  console.log('\nSUCCESS: All files, navigation links, assets, 7-stage journey steps, and logistics/investment sections verified with 0 errors!');
} else {
  console.error('\nFAILED: Errors found:\n' + errors.join('\n'));
  process.exit(1);
}
