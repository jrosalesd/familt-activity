const { router } = require('./Router');
const { auth, adminAuth, guest } = require('../app/middleware');

// ─── Controllers ──────────────────────────────────────────────────────────────
const AuthController = require('../app/controllers/AuthController');
const DashboardController = require('../app/controllers/admin/DashboardController');
const MemberController = require('../app/controllers/admin/MemberController');
const InviteController = require('../app/controllers/admin/InviteController');
const TaskController = require('../app/controllers/admin/TaskController');

class WebRoutes {

  /**
   * Register all application routes.
   * Called once from server.js via router.mount(app).
   *
   * WHAT YOU'RE LEARNING:
   *   Grouping routes into a class makes the file self-documenting.
   *   Each method represents a logical section of the app.
   *   Adding new sections means adding a new method and calling it here.
   */
  register() {
    this.public();
    this.authRoutes();
  }

  // ─── Public routes ────────────────────────────────────────────────────────
  public() {
    router.get('/', guest, AuthController.showLanding).name('home');
    router.get('/register', guest, AuthController.showRegister).name('register');
    router.post('/register', AuthController.register).name('register.post');
    router.get('/login', guest, AuthController.showLogin).name('login');
    router.post('/login', AuthController.login).name('login.post');
    router.get('/login/kids', AuthController.showKidsLogin).name('login.kids');
    router.post('/login/kids/family', AuthController.findFamily).name('login.kids.family');
    router.post('/login/pin', AuthController.loginWithPin).name('login.pin');
    router.get('/join/:code', AuthController.showJoin).name('join');
    router.post('/join/:code', AuthController.join).name('join.post');
    router.post('/logout', AuthController.logout).name('logout');
    router.get('/family/:slug/kids', AuthController.showFamilyKidsLogin).name('family.kids.login');
    router.get('/coming-soon', (req, res) => res.render('errors/coming-soon', { title: 'Coming Soon' })).name('coming.soon');
    router.post('/logout/kid', AuthController.logoutKid).name('logout.kid');

    // ← ADD THIS: returns the current session's CSRF token for JS fetch
    router.get('/csrf-token', (req, res) => {
      const origin = req.get('Origin') || '';
      const referer = req.get('Referer') || '';
      const host = req.get('Host') || '';
      const isLocal = origin.includes(host) || referer.includes(host) || (!origin && !referer);

      if (!isLocal) return res.status(403).json({ error: 'Forbidden' });
      if (!req.session.csrfToken) return res.status(403).json({ error: 'No session' });

      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.json({ token: req.session.csrfToken });
    }).name('csrf.token');

  }

  // ─── Auth-protected app routes ────────────────────────────────────────────
  authRoutes() {

    router.group({ prefix: '/app', middleware: [auth] }, (r) => {

      // Child dashboard
      r.get('/dashboard', (req, res) => {
        const title = req.session.pageTitle || `Hi ${req.session.member.name}!`;
        delete req.session.pageTitle; // ← consume it so it doesn't persist
        res.render('app/dashboard', { title });
      }).name('app.dashboard');

      this.admin(r);
    });
  }

  // ─── Admin routes ─────────────────────────────────────────────────────────
  admin(r) {
    r.group({ prefix: '/admin', middleware: [adminAuth] }, (r) => {

      r.get('/dashboard', DashboardController.index).name('app.admin.dashboard');

      this.members(r);
      this.tasks(r);
      this.invites(r);
      this.placeholders(r);
    });
  }

  // ─── Members ──────────────────────────────────────────────────────────────
  members(r) {
    r.group({ prefix: '/members' }, (r) => {
      r.get('/', MemberController.index).name('admin.members.index');
      r.get('/create', MemberController.create).name('admin.members.create');
      r.get('/:id', MemberController.show)  .name('admin.members.show');
      r.get('/:id/edit', MemberController.edit).name('admin.members.edit');
      r.post('/', MemberController.store).name('admin.members.store');
      r.put('/:id', MemberController.update).name('admin.members.update');
      r.delete('/:id', MemberController.destroy).name('admin.members.destroy');
      r.post('/:id/adjust-points', MemberController.adjustPoints).name('admin.members.adjust-points');
    });
  }

  // ─── Invites ──────────────────────────────────────────────────────────────
  invites(r) {
    r.group({ prefix: '/invites' }, (r) => {
      r.get('/', InviteController.index).name('admin.invites.index');
      r.get('/create', InviteController.create).name('admin.invites.create');
      r.post('/', InviteController.store).name('admin.invites.store');
      r.delete('/:id', InviteController.destroy).name('admin.invites.destroy');
    });
  }

  // ─── Tasks ──────────────────────────────────────────────────────────────
  tasks(r) {
    r.group({ prefix: '/tasks' }, (r) => {
      r.get('/', TaskController.index).name('admin.tasks.index');
      r.get('/create', TaskController.create).name('admin.tasks.create');
      r.post('/', TaskController.store).name('admin.tasks.store');
      r.get('/:id/edit', TaskController.edit).name('admin.tasks.edit');
      r.put('/:id', TaskController.update).name('admin.tasks.update');
      r.delete('/:id', TaskController.destroy).name('admin.tasks.destroy');
    });
  }

  // ─── Placeholders — replaced as we build each section ────────────────────
  placeholders(r) {
    //r.get('/tasks',     (req, res) => res.render('admin/coming-soon', { title: 'Tasks'     })).name('admin.tasks.index');
    r.get('/rewards', (req, res) => res.render('admin/coming-soon', { title: 'Rewards' })).name('admin.rewards.index');
    r.get('/approvals', (req, res) => res.render('admin/coming-soon', { title: 'Approvals' })).name('admin.approvals.index');
  }



}

// Register all routes
new WebRoutes().register();

module.exports = router;
