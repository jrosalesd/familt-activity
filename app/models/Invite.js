const Model  = require('./Model');
const crypto = require('crypto');

class Invite extends Model {
  static get table() { return 'invites'; }

  // ─── Relationships ────────────────────────────────────────────────────────
  static family()    { return this.belongsTo(require('./Family'), 'family_id'); }
  static createdBy() { return this.belongsTo(require('./Member'), 'created_by'); }
  static usedBy()    { return this.belongsTo(require('./Member'), 'used_by');    }

  // ─── Methods ──────────────────────────────────────────────────────────────
  static generateCode() {
    return crypto.randomBytes(9).toString('base64url').slice(0, 12);
  }

  static async createInvite({ familyId, role, createdBy, daysValid = 7 }) {
    const code      = this.generateCode();
    const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000);
    return this.create({ family_id: familyId, code, role, created_by: createdBy, expires_at: expiresAt });
  }

  static async findValid(code) {
    return this.queryOne(`
      SELECT i.*, f.name as family_name, f.id as family_id
      FROM invites i
      JOIN families f ON f.id = i.family_id
      WHERE i.code    = $1
        AND i.used_at  IS NULL
        AND i.expires_at > NOW()
    `, [code]);
  }

  static async markUsed(code, memberId) {
    await this.query(
      'UPDATE invites SET used_by = $1, used_at = NOW() WHERE code = $2',
      [memberId, code]
    );
  }

  static async forFamily(familyId) {
    return this.query(`
      SELECT i.*, m.name as created_by_name, u.name as used_by_name
      FROM invites i
      JOIN members m ON m.id = i.created_by
      LEFT JOIN members u ON u.id = i.used_by
      WHERE i.family_id = $1
      ORDER BY i.created_at DESC
    `, [familyId]);
  }
}

module.exports = Invite;
