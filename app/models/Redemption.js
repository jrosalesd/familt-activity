const Model = require('./Model');

class Redemption extends Model {
  static get table() { return 'redemptions'; }

  // ─── Relationships ────────────────────────────────────────────────────────
  static reward()  { return this.belongsTo(require('./Reward'), 'reward_id'); }
  static member()  { return this.belongsTo(require('./Member'), 'member_id'); }

  // ─── Scopes ───────────────────────────────────────────────────────────────
  static async pending(familyId) {
    return this.whereRaw(`
      redemptions.status = 'pending'
      AND rewards.family_id = $1
    `, [familyId]);
  }
}

module.exports = Redemption;
