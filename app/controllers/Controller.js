const { route } = require('../../routes/Router');
const crypto     = require('crypto');

/**
 * Controller.js — Base controller class
 *
 * WHAT YOU'RE LEARNING:
 *   The base controller pattern — shared logic that every controller
 *   needs lives here once. Subclasses inherit it automatically.
 *
 *   This is the same pattern as Model.js but for controllers:
 *     Model.js      → shared DB logic
 *     Controller.js → shared HTTP/response logic
 *
 * INHERITED BY ALL CONTROLLERS:
 *   this.success()           → flash success + redirect
 *   this.error()             → flash error + redirect
 *   this.authorize()         → throw 403 if condition fails
 *   this.paginate()          → slice results for pagination
 *   this.json()              → send JSON response
 *   this.notFound()          → throw 404
 *   this.regenerateSession() → rotate session + fresh CSRF token
 */
class Controller {
  constructor() {
    // Auto-bind all methods so `this` works when Express calls them
    const proto = Object.getPrototypeOf(this);
    Object.getOwnPropertyNames(proto)
      .filter(method => method !== 'constructor' && typeof this[method] === 'function')
      .forEach(method => { this[method] = this[method].bind(this); });
  }

  // ─── Flash helpers ────────────────────────────────────────────────────────

  /**
   * Flash a success message and redirect.
   * USAGE: return this.success(req, res, 'Saved!', route('admin.members.index'));
   */
  success(req, res, message, redirectTo) {
    req.flash('success', message);
    return res.redirect(redirectTo);
  }

  /**
   * Flash an error message and redirect.
   * USAGE: return this.error(req, res, 'Invalid PIN.', route('login'));
   */
  error(req, res, message, redirectTo) {
    req.flash('error', message);
    return res.redirect(redirectTo);
  }

  // ─── Authorization ────────────────────────────────────────────────────────

  /**
   * Throw a 403 if the condition is false.
   * USAGE: this.authorize(member.family_id === req.session.family.id);
   */
  authorize(condition, message = 'Unauthorized.') {
    if (!condition) {
      const err  = new Error(message);
      err.status = 403;
      throw err;
    }
  }

  // ─── Not found ────────────────────────────────────────────────────────────

  /**
   * Throw a 404 error.
   * USAGE: if (!member) this.notFound('Member not found.');
   */
  notFound(message = 'Not found.') {
    const err  = new Error(message);
    err.status = 404;
    throw err;
  }

  // ─── JSON responses ───────────────────────────────────────────────────────

  /**
   * Send a JSON success response.
   * USAGE: return this.json(res, { member });
   */
  json(res, data = {}, status = 200) {
    return res.status(status).json({ success: true, data });
  }

  jsonError(res, message, status = 400) {
    return res.status(status).json({ success: false, message });
  }

  // ─── Pagination ───────────────────────────────────────────────────────────

  /**
   * Paginate an array of results.
   * USAGE: const { data, meta } = this.paginate(allTasks, req.query.page, 20);
   */
  paginate(items, page = 1, perPage = 20) {
    const currentPage = Math.max(1, parseInt(page) || 1);
    const total       = items.length;
    const totalPages  = Math.ceil(total / perPage);
    const offset      = (currentPage - 1) * perPage;
    const data        = items.slice(offset, offset + perPage);

    return {
      data,
      meta: {
        total,
        perPage,
        currentPage,
        totalPages,
        hasNext:  currentPage < totalPages,
        hasPrev:  currentPage > 1,
        nextPage: currentPage < totalPages ? currentPage + 1 : null,
        prevPage: currentPage > 1         ? currentPage - 1 : null,
      },
    };
  }

  // ─── Request helpers ──────────────────────────────────────────────────────

  /** Get the current logged-in member from session. */
  currentMember(req) {
    return req.session?.member || null;
  }

  /** Get the current family from session. */
  currentFamily(req) {
    return req.session?.family || null;
  }

  /** Check if request wants JSON (API/AJAX). */
  wantsJson(req) {
    return req.headers.accept?.includes('application/json') || false;
  }

  // ─── Session ──────────────────────────────────────────────────────────────

  /**
   * Regenerate the session and write a fresh CSRF token.
   * Always call this after any login to prevent session fixation attacks.
   *
   * USAGE:
   *   this.regenerateSession(req, (err) => {
   *     if (err) return res.redirect(route('login'));
   *     req.session.member = member;
   *     req.flash('success', 'Welcome!');
   *     res.redirect(route('app.dashboard'));
   *   });
   */
  regenerateSession(req, callback) {
    req.session.regenerate((err) => {
      if (err) return callback(err);
      // Generate a fresh CSRF token immediately so the first
      // POST after login always has a valid token to verify
      req.session.csrfToken = crypto.randomBytes(24).toString('hex');
      callback(null);
    });
  }

  // ─── View helpers ─────────────────────────────────────────────────────────

  /** Inject extra script files into the layout for this response. */
  addScript(res, ...files) {
    if (typeof res.addScript === 'function') {
      res.addScript(...files);
    }
  }

  view(res, template, data = {}) {
  return res.render(template, data);
}

}

module.exports = Controller;