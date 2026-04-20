const Controller = require('./Controller');
const Member     = require('../models/Member');
const Family     = require('../models/Family');
const Invite     = require('../models/Invite');
const Role       = require('../models/Role');
const { route }  = require('../../routes/Router');

class AuthController extends Controller {

  async _redirectToDashboard(res, member) {
    const role = await Role.byValue(member.role);
    return res.redirect(
      Role.usesPin(role) ? route('app.dashboard') : route('app.admin.dashboard')
    );
  }

  // GET /
  async showLanding(req, res) {
    if (req.session?.member) return this._redirectToDashboard(res, req.session.member);
    res.render('auth/landing', { title: 'Family Tasks' });
  }

  // GET /register
  showRegister(req, res) {
    res.render('auth/register', { title: 'Create Your Family' });
  }

  // POST /register
  async register(req, res) {
    const { family_name, name, email, password } = req.body;

    const existing = await Member.first('email', email.toLowerCase().trim());
    if (existing) return this.error(req, res, 'That email is already registered.', route('register'));

    const family = await Family.createFamily(family_name.trim());
    await Family.query('INSERT INTO family_pool (family_id) VALUES ($1)', [family.id]);

    const ownerRole = await Role.queryOne(
      'SELECT * FROM roles WHERE can_manage = true AND is_active = true ORDER BY id ASC LIMIT 1'
    );

    const member = await Member.create({
      family_id:     family.id,
      name:          name.trim(),
      email:         email.toLowerCase().trim(),
      password_hash: await Member.hashPassword(password),
      role:          ownerRole.value,
      avatar_color:  '#1e1b4b',
    });

    req.session.member = member;
    req.session.family = family;
    req.flash('success', `Welcome to Family Tasks, ${name}! Your family "${family_name}" is ready.`);
    return res.redirect(route('app.admin.dashboard'));
  }

  // GET /login
  async showLogin(req, res) {
    if (req.session?.member) return this._redirectToDashboard(res, req.session.member);
    res.render('auth/login', { title: 'Login' });
  }

  // POST /login/pin
  async loginWithPin(req, res) {
    const { family_id, member_id, pin } = req.body;
    const result = await Member.attemptPinLogin(family_id, member_id, pin);

    if (!result.success) {
      const message = result.reason === 'locked'
        ? `Too many wrong PINs. Try again in ${result.minutesLeft} minute${result.minutesLeft !== 1 ? 's' : ''}.`
        : 'Wrong PIN. Try again!';
      return res.status(422).json({ success: false, message });
    }

    const member      = result.member;
    const family      = await Family.find(member.family_id);
    const intendedUrl = req.session.intendedUrl;

    this.regenerateSession(req, (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Session error.' });
      req.session.member    = member;
      req.session.family    = family;
      if (intendedUrl) req.session.intendedUrl = intendedUrl;
      req.flash('success', `Hi ${member.name}! 🎉`);
      return res.json({ success: true, redirect: route('app.dashboard') });
    });
  }

  // POST /login
  async login(req, res) {
    const { email, password } = req.body;
    const result = await Member.attemptPasswordLogin(email, password);

    if (!result.success) {
      const message = result.reason === 'locked'
        ? `Account locked. Try again in ${result.minutesLeft} minute${result.minutesLeft !== 1 ? 's' : ''}.`
        : 'Wrong email or password.';
      return this.error(req, res, message, route('login'));
    }

    const member      = result.member;
    const family      = await Family.find(member.family_id);
    const intendedUrl = req.session.intendedUrl;

    this.regenerateSession(req, (err) => {
      if (err) return res.redirect(route('login'));
      req.session.member    = member;
      req.session.family    = family;
      req.flash('success', `Welcome back, ${member.name}!`);
      const destination = intendedUrl || route('app.admin.dashboard');
      res.redirect(destination);
    });
  }

  // GET /login/kids
  showKidsLogin(req, res) {
    res.render('auth/kids-login', { title: 'Kids Login' });
  }

  // POST /login/kids/family
  async findFamily(req, res) {
    const { email } = req.body;
    const parent = await Member.first('email', email.toLowerCase().trim());

    if (!parent) return this.error(req, res, 'No account found with that email.', route('login.kids'));

    const family   = await Family.find(parent.family_id);
    const children = await Member.children(family.id);

    this.addScript(res, 'kid-login');  // ← add this before render
    res.render('auth/kids-picker', {
      title: `${family.name} — Who are you?`,
      family,
      children,
    });


  }

  // GET /family/:slug/kids
  async showFamilyKidsLogin(req, res) {
    const family = await Family.findBySlug(req.params.slug);
    if (!family) return this.error(req, res, 'Family not found.', route('login'));
    const children = await Member.children(family.id);
    this.addScript(res, 'kid-login');  // ← declare page script
    res.render('auth/kids-picker', {
      title: `${family.name} — Who are you?`,
      family,
      children,
    });
  }

 

  // GET /join/:code
  async showJoin(req, res) {
    const invite = await Invite.findValid(req.params.code);
    if (!invite) return this.error(req, res, 'This invite link is invalid or has expired.', route('login'));
    res.render('auth/join', { title: `Join ${invite.family_name}`, invite });
  }

  // POST /join/:code
  async join(req, res) {
    const invite = await Invite.findValid(req.params.code);
    if (!invite) return this.error(req, res, 'This invite link is invalid or has expired.', route('login'));

    const { name, email, password, pin, avatar_color } = req.body;
    const roleRecord = await Role.byValue(invite.role);

    const data = {
      family_id:    invite.family_id,
      name:         name.trim(),
      role:         invite.role,
      avatar_color: avatar_color || '#5b4fcf',
    };

    if (Role.usesPin(roleRecord)) {
      if (!pin || pin.length !== 4) return this.error(req, res, 'Please enter a 4-digit PIN.', `/join/${req.params.code}`);
      data.pin = pin;
    } else {
      if (!email || !password) return this.error(req, res, 'Email and password are required.', `/join/${req.params.code}`);
      const existing = await Member.first('email', email.toLowerCase().trim());
      if (existing) return this.error(req, res, 'That email is already registered.', `/join/${req.params.code}`);
      data.email         = email.toLowerCase().trim();
      data.password_hash = await Member.hashPassword(password);
    }

    const member = await Member.create(data);
    await Invite.markUsed(req.params.code, member.id);
    const family = await Family.find(invite.family_id);

    req.session.regenerate((err) => {
      if (err) return res.redirect(route('login'));
      req.session.member = member;
      req.session.family = family;
      req.flash('success', `Welcome to ${family.name}, ${member.name}! ���`);
      this._redirectToDashboard(res, member);
    });
  }

  // POST /logout
  logout(req, res) {
    req.session.destroy(() => res.redirect(route('login')));
  }

  // POST /logout/kid
  logoutKid(req, res) {
    const family = req.session?.family;
    const slug   = family?.slug;
    req.session.destroy(() => {
      if (slug) return res.redirect(`/family/${slug}/kids`);
      res.redirect(route('login.kids'));
    });
  }

}

module.exports = new AuthController();
