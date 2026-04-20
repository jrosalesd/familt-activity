const fs   = require('fs');
const path = require('path');

const [,, type, ...args] = process.argv;
const name = args[0];

function pascal(str) {
  return str.replace(/(^\w|-\w)/g, c => c.replace('-','').toUpperCase());
}

function camel(str) {
  const p = pascal(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

function plural(str) {
  if (str.endsWith('y')) return str.slice(0,-1) + 'ies';
  if (str.endsWith('s')) return str;
  return str + 's';
}

function snake(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/,'');
}

function write(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(filePath)) {
    console.log(`⚠️  Already exists: ${filePath}`);
    return;
  }
  fs.writeFileSync(filePath, content);
  console.log(`✅ Created: ${filePath}`);
}

// ─── Templates ───────────────────────────────────────────────────────────────

function makeModel(name) {
  const className = pascal(name);
  const tableName = plural(snake(name));
  write(`app/models/${className}.js`, `const Model = require('./Model');

class ${className} extends Model {
  static get table() { return '${tableName}'; }

  // ─── Relationships ──────────────────────────────────────────────────

  // ─── Scopes ─────────────────────────────────────────────────────────

}

module.exports = ${className};
`);
}

function makeController(name, admin = false) {
  const className = pascal(name) + 'Controller';
  const varName   = camel(name);
  const routeBase = admin ? `admin.${plural(snake(name))}` : plural(snake(name));
  const viewBase  = admin ? `admin/${plural(snake(name))}` : plural(snake(name));
  const Model     = pascal(name);
  const dir       = admin ? 'app/controllers/admin' : 'app/controllers';

  write(`${dir}/${className}.js`, `const Controller = require('${admin ? '../' : ''}./Controller');
const ${Model}    = require('${admin ? '../../' : '../'}models/${Model}');
const { route }  = require('${admin ? '../../../' : '../../'}routes/Router');

class ${className} extends Controller {

  async index(req, res) {
    const familyId = this.currentFamily(req).id;
    const ${plural(varName)} = await ${Model}.whereRaw('family_id = $1 AND is_active = true', [familyId]);
    res.render('${viewBase}/index', { title: '${pascal(plural(name))}', ${plural(varName)} });
  }

  async create(req, res) {
    res.render('${viewBase}/create', { title: 'New ${pascal(name)}' });
  }

  async store(req, res) {
    const familyId = this.currentFamily(req).id;
    // TODO: extract fields from req.body
    return this.success(req, res, '${pascal(name)} created.', route('${routeBase}.index'));
  }

  async edit(req, res) {
    const ${varName} = await ${Model}.findOrFail(req.params.id);
    this.authorize(${varName}.family_id === this.currentFamily(req).id);
    res.render('${viewBase}/edit', { title: 'Edit ${pascal(name)}', ${varName} });
  }

  async update(req, res) {
    const ${varName} = await ${Model}.findOrFail(req.params.id);
    this.authorize(${varName}.family_id === this.currentFamily(req).id);
    // TODO: extract fields from req.body
    return this.success(req, res, '${pascal(name)} updated.', route('${routeBase}.index'));
  }

  async destroy(req, res) {
    const ${varName} = await ${Model}.findOrFail(req.params.id);
    this.authorize(${varName}.family_id === this.currentFamily(req).id);
    await ${Model}.update(${varName}.id, { is_active: false });
    return this.success(req, res, '${pascal(name)} removed.', route('${routeBase}.index'));
  }

}

module.exports = new ${className}();
`);
}

function makeViews(name, admin = false) {
  const viewBase = admin ? `views/admin/${plural(snake(name))}` : `views/${plural(snake(name))}`;
  const Model    = pascal(name);
  const varName  = camel(name);
  const routeBase = admin ? `admin.${plural(snake(name))}` : plural(snake(name));

  // index
  write(`${viewBase}/index.ejs`, `<div class="page-header">
  <h2><%= title %></h2>
  <a href="<%= route('${routeBase}.create') %>" class="btn btn-primary">
    <i class="bi bi-plus-lg"></i> New ${pascal(name)}
  </a>
</div>

<%# TODO: render list %>
`);

  // create
  write(`${viewBase}/create.ejs`, `<div class="page-header">
  <h2>New ${pascal(name)}</h2>
  <a href="<%= route('${routeBase}.index') %>" class="btn btn-secondary">
    <i class="bi bi-arrow-left"></i> Back
  </a>
</div>

<form action="<%= route('${routeBase}.store') %>" method="POST" class="edit-form">
  <%- csrf() %>

  <%# TODO: add form fields %>

  <div class="action-bar">
    <button type="submit" class="btn btn-primary">Create ${pascal(name)}</button>
    <a href="<%= route('${routeBase}.index') %>" class="btn btn-secondary">Cancel</a>
  </div>
</form>
`);

  // edit
  write(`${viewBase}/edit.ejs`, `<div class="page-header">
  <h2>Edit ${pascal(name)}</h2>
  <a href="<%= route('${routeBase}.index') %>" class="btn btn-secondary">
    <i class="bi bi-arrow-left"></i> Back
  </a>
</div>

<form action="<%= route('${routeBase}.update', { id: ${varName}.id }) %>" method="POST" class="edit-form">
  <%- csrf('PUT') %>

  <%# TODO: add form fields %>

  <div class="action-bar">
    <button type="submit" class="btn btn-primary">Save Changes</button>
    <a href="<%= route('${routeBase}.index') %>" class="btn btn-secondary">Cancel</a>
  </div>
</form>
`);
}

function makeMigration(name) {
  const timestamp = Date.now();
  const files     = fs.readdirSync('database/migrations').filter(f => f.endsWith('.js'));
  const next      = String(files.length + 1).padStart(3, '0');
  const fileName  = `${next}_${snake(name).replace(/\s+/g,'_')}.js`;
  const tableName = plural(snake(name));

  write(`database/migrations/${fileName}`, `exports.up = async (db) => {
  await db.query(\`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id         SERIAL    PRIMARY KEY,
      family_id  INTEGER   NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      is_active  BOOLEAN   NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  \`);
  console.log('✅ Created: ${tableName}');
};

exports.down = async (db) => {
  await db.query('DROP TABLE IF EXISTS ${tableName}');
  console.log('��� Dropped: ${tableName}');
};
`);
}

function makeMiddleware(name) {
  const fnName = camel(name);
  write(`app/middleware/${fnName}.js`, `/**
 * ${pascal(name)} middleware
 */
const ${fnName} = (req, res, next) => {
  // TODO: implement
  next();
};

module.exports = ${fnName};
`);
}

// ─── Commands ─────────────────────────────────────────────────────────────────

function printUsage() {
  console.log(`
Usage:
  npm run make:model      <Name>
  npm run make:controller <Name> [--admin]
  npm run make:migration  <Name>
  npm run make:middleware  <Name>
  npm run make:all        <Name> [--admin]   ← model + controller + views + migration
`);
}

if (!name) { printUsage(); process.exit(1); }

const isAdmin = args.includes('--admin');

switch (type) {
  case 'model':       makeModel(name); break;
  case 'controller':  makeController(name, isAdmin); break;
  case 'migration':   makeMigration(name); break;
  case 'middleware':  makeMiddleware(name); break;
  case 'views':       makeViews(name, isAdmin); break;
  case 'all':
    makeModel(name);
    makeController(name, isAdmin);
    makeViews(name, isAdmin);
    makeMigration(name);
    break;
  default:
    console.log(`❌ Unknown type: ${type}`);
    printUsage();
}
