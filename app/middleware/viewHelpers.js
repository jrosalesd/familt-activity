const fs   = require('fs');
const path = require('path');

module.exports = (req, res, next) => {

  // ─── Page-specific scripts queue ──────────────────────────────────────────
  // Controllers call res.addScript('kid-login') to load scripts only on that page
  res.locals.pageScripts = [];
  res.addScript = (...files) => {
    res.locals.pageScripts.push(...files);
  };

  // ─── Auto-load all assets from public folder ──────────────────────────────
  res.locals.getAssets = (type) => {
    const ext = `.${type}`;
    const dir = path.join(process.cwd(), 'public', type);

    try {
      if (!fs.existsSync(dir)) {
        console.error(`⚠️  Asset Helper: Directory not found → ${dir}`);
        return [];
      }

      // Page-specific scripts are loaded separately — exclude them here
      const pageScriptNames = res.locals.pageScripts.map(s => `${s}${ext}`);

      const files = fs.readdirSync(dir)
        .filter(file =>
          file.endsWith(ext)        &&
          !file.includes('.min.')   &&
          !file.includes('.bundle.') &&
          !pageScriptNames.includes(file)  // ← skip page-specific scripts
        );

      const priority = ['variables', 'core', 'main', 'admin', 'style'];
      return files.sort((a, b) => {
        const ai = priority.findIndex(p => a.toLowerCase().includes(p));
        const bi = priority.findIndex(p => b.toLowerCase().includes(p));
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return  1;
        return a.toLowerCase().localeCompare(b.toLowerCase());
      });

    } catch (err) {
      console.error('❌ Asset Helper Error:', err.message);
      return [];
    }
  };

  next();
};