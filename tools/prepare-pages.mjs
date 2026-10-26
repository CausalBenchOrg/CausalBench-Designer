import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

// GitHub Pages serves this entry point for direct visits to Angular routes.
copyFileSync('docs/index.html', 'docs/404.html');
writeFileSync('docs/CNAME', 'designer.causalbench.org\n');
writeFileSync('docs/.nojekyll', '');
// Keep generated notices consistent with the repository's LF line endings.
const licenses = 'docs/3rdpartylicenses.txt';
writeFileSync(licenses, readFileSync(licenses, 'utf8').replace(/\r\n/g, '\n'));
