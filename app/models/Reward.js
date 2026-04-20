const Model = require('./Model');

class Reward extends Model {
  static get table() { return 'rewards'; }

  // ─── Relationships ────────────────────────────────────────────────────────
  static family()      { return this.belongsTo(require('./Family'),     'family_id'); }
  static redemptions() { return this.hasMany(require('./Redemption'),   'reward_id'); }

  // ─── Scopes ───────────────────────────────────────────────────────────────
  static async available(familyId) {
    return this.whereRaw(
      'family_id = $1 AND is_available = true',
      [familyId]
    );
  }
}

module.exports = Reward;
