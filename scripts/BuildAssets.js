/**
 * BuildAssets.js (Automated)
 * Automatically scans the /js folder and bundles all files.
 */
const fs = require('fs');
const path = require('path');
const UglifyJS = require('uglify-js');

const JS_DIR = path.join(__dirname, '../public/js');
const OUTPUT_MIN = path.join(JS_DIR, 'app.min.js');

console.log("\x1b[36m%s\x1b[0m", "🏗️  Starting Automated JS Build...");

try {
    // 1. Read all files from the directory
    let files = fs.readdirSync(JS_DIR).filter(file => {
        // Only include .js files, and IGNORE existing bundles/minified files
        return file.endsWith('.js') && 
               file !== 'app.min.js' && 
               file !== 'app.bundle.js';
    });

    // 2. Custom Sort: Ensure Core.js is ALWAYS first
    files.sort((a, b) => {
        if (a.toLowerCase() === 'core.js') return -1;
        if (b.toLowerCase() === 'core.js') return 1;
        return a.localeCompare(b); // Rest are alphabetical
    });

    console.log(`📂 Found ${files.length} files to bundle: [${files.join(', ')}]`);

    // 3. Combine code
    let combinedCode = "";
    files.forEach(file => {
        const filePath = path.join(JS_DIR, file);
        combinedCode += `\n/* Source: ${file} */\n`;
        combinedCode += fs.readFileSync(filePath, 'utf8');
    });

    // 4. Minify
    const result = UglifyJS.minify(combinedCode);
    if (result.error) throw result.error;

    // 5. Save
    fs.writeFileSync(OUTPUT_MIN, result.code);
    
    console.log("\x1b[32m%s\x1b[0m", `🚀 Successfully built app.min.js from all files in /js`);

} catch (err) {
    console.error("\x1b[31m%s\x1b[0m", "❌ Automated build failed:");
    console.error(err);
}