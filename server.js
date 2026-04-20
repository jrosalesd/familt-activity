require('dotenv').config();

const express         = require('express');
const session         = require('express-session');
const methodOverride  = require('method-override');
const path            = require('path');

// ─── Core Logic & Config ──────────────────────────────────────────────────────
const { router, route, safeRoute, csrf } = require('./routes/Router');
const { logger, flashHelper, shareViewData, csrfGenerate, csrfVerify } = require('./app/middleware');
const viewHelpers     = require('./app/middleware/viewHelpers'); 
const PgSession       = require('connect-pg-simple')(session);
const { pool }        = require('./config/database');

const app = express();

// ─── View Engine ──────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Layout System (Refactored with Error Logging) ────────────────────────────
app.use((req, res, next) => {
  const originalRender = res.render.bind(res);

  res.render = function(viewPath, locals = {}) {
    const allLocals = Object.assign({}, res.locals, locals);
    const layout = viewPath.startsWith('admin/') ? 'layouts/admin' : 'layouts/main';

    // Step 1: Render the inner view
    originalRender(viewPath, allLocals, (err, body) => {
      if (err) {
        console.error(`❌ View Render Error [${viewPath}]:`, err.message);
        return next(err); 
      }

      // Step 2: Render the layout and inject the body
      originalRender(layout, Object.assign({}, allLocals, { body }), (err2, html) => {
        if (err2) {
          console.error(`❌ Layout Render Error [${layout}]:`, err2.message);
          return next(err2);
        }
        res.send(html);
      });
    });
  };
  next();
});

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Support _method override for PUT/DELETE
app.use(methodOverride(function(req, res) {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    const method = req.body._method;
    delete req.body._method;
    return method;
  }
}));

// ─── Session Management ───────────────────────────────────────────────────────
app.use(session({
  store: new PgSession({
    pool,
    tableName: 'sessions',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 60,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
}));

// ─── App Middleware ───────────────────────────────────────────────────────────
app.use(logger);
app.use(flashHelper);
app.use(csrfGenerate);

// Asset Helper (getAssets) - must be before routes
app.use(viewHelpers); 

app.use((req, res, next) => {
  res.locals.csrf = (method = null) => csrf(req.session.csrfToken, method);
  next();
});

app.use(shareViewData);
app.use(csrfVerify);

// ─── Template Globals ─────────────────────────────────────────────────────────
app.locals.route     = route;
app.locals.safeRoute = safeRoute;

// ─── Routes ───────────────────────────────────────────────────────────────────
require('./routes/web');
router.mount(app);
router.list();

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'Page Not Found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err.stack);
  res.status(err.status || 500).render('errors/500', {
    title: 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🏠 Family Tasks running at http://localhost:${PORT}\n`);
});