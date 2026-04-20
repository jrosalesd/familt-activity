/**
 * BuildStyles.js
 * Automatically scans the /css folder and bundles/minifies all files.
 */
const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');

const CSS_DIR = path.join(__dirname, '../public/css');
const OUTPUT_MIN = path.join(CSS_DIR, 'app.min.css');

console.log("\x1b[36m%s\x1b[0m", "🎨 Starting Automated CSS Build...");

try {
    // 1. Read all files from the directory
    let files = fs.readdirSync(CSS_DIR).filter(file => {
        return file.endsWith('.css') && 
               file !== 'app.min.css' && 
               file !== 'app.bundle.css';
    });

    // 2. Custom Sort: Priority files first (variables, core, etc.)
    files.sort((a, b) => {
        const priority = ['variables.css', 'core.css', 'style.css'];
        const aIndex = priority.indexOf(a.toLowerCase());
        const bIndex = priority.indexOf(b.toLowerCase());

        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
    });

    console.log(`📂 Found ${files.length} files to bundle: [${files.join(', ')}]`);

    // 3. Combine CSS content
    let combinedCSS = "";
    files.forEach(file => {
        const filePath = path.join(CSS_DIR, file);
        combinedCSS += `\n/* Source: ${file} */\n`;
        combinedCSS += fs.readFileSync(filePath, 'utf8');
    });

    // 4. Minify using CleanCSS
    const minified = new CleanCSS({
        level: 2, // Advanced optimizations (merging selectors, etc.)
        rebase: false // Don't mess with image paths
    }).minify(combinedCSS);

    if (minified.errors.length > 0) throw minified.errors;

    // 5. Save the output
    fs.writeFileSync(OUTPUT_MIN, minified.styles);
    
    console.log("\x1b[32m%s\x1b[0m", `🚀 Successfully built app.min.css from all files in /css`);

} catch (err) {
    console.error("\x1b[31m%s\x1b[0m", "❌ CSS Build failed:");
    console.error(err);
}