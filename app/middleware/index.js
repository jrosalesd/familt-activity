const { route }  = require('../../routes/Router');
const fs         = require('fs');
const path       = require('path');
const crypto     = require('crypto');
const Role       = require('../models/Role');

// ─── Log file setup ───────────────────────────────────────────────────────────
const logDir  = path.join(process.cwd(), 'logs');
const logFile = path.join(logDir, 'app.log');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
function writeToFile(line) {
  fs.appendFile(logFile, line + '\n', (err) => { if (err) console.error('Log write error:', err); });
}

// ─── Logger ───────────────────────────────────────────────────────────────────
const logger = (req, res, next) => {
  const start     = Date.now();
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  res.on('finish', () => {
    const ms     = Date.now() - start;
    const status = res.statusCode;
    const color  = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : status >= 300 ? '\x1b[36m' : '\x1b[32m';
    const line   = `[${timestamp}] ${req.method.padEnd(6)} ${status} ${req.originalUrl.padEnd(45)} ${ms}ms`;
    console.log(`${color}${line}\x1b[0m`);
    writeToFile(line);
  });
  next();
};

// ─── Flash helper ─────────────────────────────────────────────────────────────
const flashHelper = (req, res, next) => {
  req.flash = (type, message) => {
    if (!req.session) return type ? undefined : {};

    // SET: req.flash('success', 'saved!') or req.flash('error', 'oops')
    if (type !== undefined && message !== undefined) {
      if (!req.session.flash) req.session.flash = {};
      req.session.flash[type] = message;
      return;
    }

    // GET one: req.flash('success') → returns value and clears it
    if (type !== undefined) {
      const val = req.session.flash?.[type];
      if (req.session.flash) delete req.session.flash[type];
      return val;
    }

    // GET all: req.flash() → returns all flash messages and clears them
    const all = req.session.flash || {};
    delete req.session.flash;
    return all;
  };
  next();
};

// ─── Share view data ──────────────────────────────────────────────────────────
const shareViewData = async (req, res, next) => {
  try {
    res.locals.member      = req.session?.member      || null;
    res.locals.family      = req.session?.family      || null;
    res.locals.flash       = req.flash()              || {};
    res.locals.currentPath = req.path;
    res.locals.roles       = await Role.active();
  } catch (err) {
    // TEMP DEBUG — what is actually throwing?
    // console.error('shareViewData CATCH:', err.message);
    // console.error('shareViewData CATCH stack:', err.stack);
    // console.error('req.flash type:', typeof req.flash);
    // console.error('req.session exists:', !!req.session);
    // console.error('req.session.flash:', req.session?.flash);

    res.locals.member      = null;
    res.locals.family      = null;
    res.locals.flash       = {};
    res.locals.currentPath = req.path;
    res.locals.roles       = [];
  }
  next();
};

// ─── Auth middleware ──────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  if (!req.session?.member) {
    req.session.intendedUrl = req.originalUrl;
    return res.redirect(route('login'));
  }
  next();
};

// ─── Admin auth ───────────────────────────────────────────────────────────────
const adminAuth = async (req, res, next) => {
  if (!req.session?.member) {
    req.session.intendedUrl = req.originalUrl;
    return res.redirect(route('login'));
  }
  try {
    const role = await Role.byValue(req.session.member.role);
    if (Role.canApprove(role)) return next();
    return res.redirect(route('app.dashboard'));
  } catch {
    return res.redirect(route('login'));
  }
};

// ─── Parent only ──────────────────────────────────────────────────────────────
const parentOnly = async (req, res, next) => {
  if (!req.session?.member) return res.redirect(route('login'));
  try {
    const role = await Role.byValue(req.session.member.role);
    if (Role.canManage(role)) return next();
    return res.redirect(route('app.admin.dashboard'));
  } catch {
    return res.redirect(route('login'));
  }
};

// ─── Guest only ───────────────────────────────────────────────────────────────
const guest = async (req, res, next) => {
  if (!req.session?.member) return next();
  try {
    const role = await Role.byValue(req.session.member.role);
    if (Role.usesPin(role)) return res.redirect(route('app.dashboard'));
    return res.redirect(route('app.admin.dashboard'));
  } catch {
    return next();
  }
};

// ─── CSRF ─────────────────────────────────────────────────────────────────────
const csrfGenerate = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
};

const csrfVerify = (req, res, next) => {
  if (!['POST','PUT','PATCH','DELETE'].includes(req.method)) return next();
  if (req.path === '/logout') return next();

  const tokenFromSession = req.session?.csrfToken;
  const tokenFromRequest = req.body?._csrf;

  //console.log('CSRF DEBUG session:', tokenFromSession?.slice(0,8), 'body:', tokenFromRequest?.slice(0,8), 'path:', req.path);

  if (!tokenFromSession || !tokenFromRequest) {
    const err = new Error('Invalid CSRF token.');
    err.status = 403;
    return next(err);
  }

  try {
    const a = Buffer.from(tokenFromSession);
    const b = Buffer.from(tokenFromRequest);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      const err = new Error('Invalid CSRF token.');
      err.status = 403;
      return next(err);
    }
  } catch {
    const err = new Error('Invalid CSRF token.');
    err.status = 403;
    return next(err);
  }

  next();
};

module.exports = {
  logger,
  flashHelper,
  shareViewData,
  auth,
  adminAuth,
  parentOnly,
  guest,
  csrfGenerate,
  csrfVerify,
};