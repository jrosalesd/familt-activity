const Model  = require('./Model');
const crypto = require('crypto');

class Family extends Model {
  static get table() { return 'families'; }

  // ─── Relationships ────────────────────────────────────────────────────────
  static members() { return this.hasMany(require('./Member'), 'family_id'); }
  static tasks()   { return this.hasMany(require('./Task'),   'family_id'); }
  static rewards() { return this.hasMany(require('./Reward'), 'family_id'); }
  static invites() { return this.hasMany(require('./Invite'), 'family_id'); }

  // ─── Methods ──────────────────────────────────────────────────────────────
  static generateInviteCode() {
    return crypto.randomBytes(9).toString('base64url').slice(0, 12);
  }

  static async createFamily(name) {
    const slug = await this.uniqueSlug(name);
    return this.create({
      name,
      slug,
      invite_code: this.generateInviteCode(),
    });
  }

  static async findBySlug(slug) {
    return this.first('slug', slug);
  }

  static async getPool(familyId) {
    const existing = await this.queryOne(
      'SELECT * FROM family_pool WHERE family_id = $1', [familyId]
    );
    if (existing) return existing;
    return this.queryOne(
      'INSERT INTO family_pool (family_id) VALUES ($1) RETURNING *', [familyId]
    );
  }
}

module.exports = Family;
