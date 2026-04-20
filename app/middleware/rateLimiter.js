/**
 * rateLimiter.js
 *
 * Tracks failed login attempts per IP address.
 * After MAX_ATTEMPTS failures, blocks that IP for WINDOW_MS milliseconds.
 *
 * WHAT YOU'RE LEARNING:
 *   - In-memory stores (Map) — fast but resets on server restart
 *   - Why production apps use Redis instead (persistent across restarts)
 *   - The sliding window pattern for rate limiting
 *
 * HOW IT WORKS:
 *   attempts = {
 *     '192.168.1.1': { count: 3, firstAttempt: 1709123456789 },
 *     '10.0.0.2':    { count: 1, firstAttempt: 1709123456000 },
 *   }
 *   On each request:
 *     1. Is this IP in the map? No → allow, count = 1
 *     2. Is the window expired? Yes → reset, allow
 *     3. Is count >= MAX? Yes → block with 429
 *     4. Otherwise → allow, increment count
 */

const MAX_ATTEMPTS = 5;          // attempts before lockout
const WINDOW_MS    = 15 * 60 * 1000; // 15 minute window
const BLOCK_MS     = 15 * 60 * 1000; // 15 minute block

// In-memory store — Map is better than plain object for this
// because it has O(1) get/set and doesn't inherit prototype keys
const attempts = new Map();

/**
 * Clean up old entries every 10 minutes
 * so the Map doesn't grow forever
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of attempts.entries()) {
    if (now - data.firstAttempt > BLOCK_MS * 2) {
      attempts.delete(ip);
    }
  }
}, 10 * 60 * 1000);

/**
 * Record a failed attempt for an IP.
 * Called from AuthController when login fails.
 */
function recordFailure(ip) {
  const now  = Date.now();
  const data = attempts.get(ip);

  if (!data || (now - data.firstAttempt > WINDOW_MS)) {
    // First attempt or window expired — start fresh
    attempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    // Within window — increment
    attempts.set(ip, { count: data.count + 1, firstAttempt: data.firstAttempt });
  }
}

/**
 * Clear attempts for an IP after successful login.
 * No point keeping failed attempts after they got in legitimately.
 */
function clearFailures(ip) {
  attempts.delete(ip);
}

/**
 * Check if an IP is currently blocked.
 */
function isBlocked(ip) {
  const data = attempts.get(ip);
  if (!data) return false;

  const now     = Date.now();
  const elapsed = now - data.firstAttempt;

  // Window expired — no longer blocked
  if (elapsed > BLOCK_MS) {
    attempts.delete(ip);
    return false;
  }

  return data.count >= MAX_ATTEMPTS;
}

/**
 * How many minutes until the block expires.
 */
function minutesUntilUnblock(ip) {
  const data = attempts.get(ip);
  if (!data) return 0;
  const remaining = BLOCK_MS - (Date.now() - data.firstAttempt);
  return Math.ceil(remaining / 60000);
}

/**
 * Express middleware — attach to login routes.
 * Blocks the request before it hits the controller.
 */
function rateLimitLogin(req, res, next) {
  // req.ip gives us the client IP
  // X-Forwarded-For header is used when behind a proxy/load balancer
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;

  if (isBlocked(ip)) {
    const mins = minutesUntilUnblock(ip);
    req.flash('error', `Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`);

    // Figure out where to redirect back to
    const familyId = req.body?.family_id;
    if (familyId) return res.redirect(`/family/${familyId}`);
    return res.redirect('/');
  }

  next();
}

module.exports = { rateLimitLogin, recordFailure, clearFailures, isBlocked };
