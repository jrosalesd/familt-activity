const Model  = require('./Model');
const bcrypt = require('bcryptjs');
const Role   = require('./Role');

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

class Member extends Model {
  static get table() { return 'members'; }

  // ─── Relationships ────────────────────────────────────────────────────────
  static family()          { return this.belongsTo(require('./Family'),      'family_id'); }
  static role()            { return this.belongsTo(require('./Role'),         'role');      }
  static taskCompletions() { return this.hasMany(require('./TaskCompletion'), 'member_id'); }
  static redemptions()     { return this.hasMany(require('./Redemption'),     'member_id'); }

  // ─── Scopes ───────────────────────────────────────────────────────────────
  static async children(familyId) {
    const childRoles = await Role.whereRaw('uses_pin = true AND is_active = true', []);
    const roleValues = childRoles.map(r => `'${r.value}'`).join(',');
    return this.whereRaw(
      `family_id = $1 AND role IN (${roleValues}) AND is_active = true`,
      [familyId]
    );
  }

  static async adults(familyId) {
    const adultRoles = await Role.whereRaw('can_approve = true AND is_active = true', []);
    const roleValues = adultRoles.map(r => `'${r.value}'`).join(',');
    return this.whereRaw(
      `family_id = $1 AND role IN (${roleValues}) AND is_active = true`,
      [familyId]
    );
  }

  static async activeInFamily(familyId) {
    return this.whereRaw(
      'family_id = $1 AND is_active = true AND (is_temporary = false OR expires_at > NOW())',
      [familyId]
    );
  }

  // ─── Role helpers ─────────────────────────────────────────────────────────
  static async canApprove(member) {
    const role = await Role.byValue(member.role);
    return Role.canApprove(role);
  }

  static async canManage(member) {
    const role = await Role.byValue(member.role);
    return Role.canManage(role);
  }

  static async isChild(member) {
    const role = await Role.byValue(member.role);
    return Role.usesPin(role);
  }

  // ─── Password auth ────────────────────────────────────────────────────────
  static async hashPassword(plainText)         { return bcrypt.hash(plainText, 12); }
  static async verifyPassword(plainText, hash) { return bcrypt.compare(plainText, hash); }

  // ─── PIN auth ─────────────────────────────────────────────────────────────
  static async hashPin(plainPin)             { return bcrypt.hash(plainPin, 12); }
  static async verifyPin(plainPin, hash)     { return bcrypt.compare(plainPin, hash); }

  static async attemptPasswordLogin(email, password) {
    const member = await this.first('email', email.toLowerCase().trim());
    if (!member) return { success: false, reason: 'invalid' };

    if (member.locked_until && new Date(member.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(member.locked_until) - new Date()) / 60000);
      return { success: false, reason: 'locked', minutesLeft };
    }

    const valid = await this.verifyPassword(password, member.password_hash);
    if (!valid) {
      const attempts = (member.login_attempts || 0) + 1;
      const updates  = { login_attempts: attempts };
      if (attempts >= MAX_ATTEMPTS) {
        updates.locked_until   = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        updates.login_attempts = 0;
      }
      await this.update(member.id, updates);
      return { success: false, reason: 'invalid' };
    }

    await this.update(member.id, {
      login_attempts: 0,
      locked_until:   null,
      last_login_at:  new Date(),
    });
    return { success: true, member };
  }

  static async attemptPinLogin(familyId, memberId, pin) {
    const member = await this.find(memberId);
    if (!member)                                 return { success: false, reason: 'invalid' };
    if (member.family_id !== parseInt(familyId)) return { success: false, reason: 'invalid' };

    const isChildRole = await this.isChild(member);
    if (!isChildRole) return { success: false, reason: 'invalid' };

    // Check if account has expired
    if (member.is_temporary && member.expires_at && new Date(member.expires_at) < new Date()) {
      return { success: false, reason: 'expired' };
    }

    // Check PIN-specific lockout (separate from password lockout)
    if (member.pin_locked_until && new Date(member.pin_locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(member.pin_locked_until) - new Date()) / 60000);
      return { success: false, reason: 'locked', minutesLeft };
    }

    // No PIN set yet
    if (!member.pin_hash) {
      return { success: false, reason: 'invalid' };
    }

    // Verify PIN using bcrypt
    const valid = await this.verifyPin(pin, member.pin_hash);
    if (!valid) {
      const attempts = (member.pin_attempts || 0) + 1;
      const updates  = { pin_attempts: attempts };
      if (attempts >= MAX_ATTEMPTS) {
        updates.pin_locked_until = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        updates.pin_attempts     = 0;
      }
      await this.update(member.id, updates);
      return { success: false, reason: 'invalid' };
    }

    // Success — reset PIN lockout counters
    await this.update(member.id, {
      pin_attempts:     0,
      pin_locked_until: null,
      last_login_at:    new Date(),
    });
    return { success: true, member };
  }

  // ─── Show page data ───────────────────────────────────────────────────────

  static async getCompletions(memberId, days, from = null, to = null) {
    const { condition, params } = Member.dateRangeCondition('tc.completed_at', days, from, to);

    return this.query(`
      SELECT
        tc.id, tc.status, tc.points_awarded, tc.completed_at,
        tc.approved_at, tc.note, tc.rejection_reason,
        t.title        AS task_title,
        t.points_value AS task_points,
        a.name         AS approved_by_name
      FROM   task_completions tc
      JOIN   tasks      t  ON tc.task_id    = t.id
      LEFT JOIN members a  ON tc.approved_by = a.id
      WHERE  tc.member_id = $1 AND ${condition}
      ORDER BY tc.completed_at DESC
    `, [memberId, ...params]);
  }

  static async getLedger(memberId, days, from = null, to = null) {
    const { condition, params } = Member.dateRangeCondition('created_at', days, from, to);
    return this.query(`
      SELECT * FROM points_ledger
      WHERE member_id = $1 AND ${condition}
      ORDER BY created_at DESC
    `, [memberId, ...params]);
  }

  static async getRedemptions(memberId, days, from = null, to = null) {
    const { condition, params } = Member.dateRangeCondition('r.redeemed_at', days, from, to);
    return this.query(`
      SELECT
        r.id, r.status, r.points_spent, r.redeemed_at,
        r.fulfilled_at, r.rejection_reason,
        rw.title AS reward_title,
        a.name   AS approved_by_name
      FROM   redemptions r
      JOIN   rewards    rw ON r.reward_id   = rw.id
      LEFT JOIN members  a ON r.approved_by  = a.id
      WHERE  r.member_id = $1 AND ${condition}
      ORDER BY r.redeemed_at DESC
    `, [memberId, ...params]);
  }

  static async getPointsChart(memberId, days, from = null, to = null) {
    const { condition, params } = Member.dateRangeCondition('created_at', days, from, to);
    return this.query(`
      SELECT
        DATE(created_at)                                          AS date,
        SUM(CASE WHEN points > 0 THEN points      ELSE 0 END)    AS earned,
        SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END)    AS spent
      FROM   points_ledger
      WHERE  member_id = $1 AND ${condition}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [memberId, ...params]);
  }

  static getMetrics(member, completions, ledger, redemptions) {
    return {
      tasksCompleted: completions.filter(c => c.status === 'approved').length,
      tasksPending:   completions.filter(c => c.status === 'pending').length,
      tasksRejected:  completions.filter(c => c.status === 'rejected').length,
      pointsEarned:   ledger.filter(l => l.points > 0).reduce((s, l) => s + l.points, 0),
      pointsSpent:    ledger.filter(l => l.points < 0).reduce((s, l) => s + Math.abs(l.points), 0),
      redemptions:    redemptions.length,
      currentBalance: member.points_balance,
    };
  }

}

module.exports = Member;