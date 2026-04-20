const Model = require('./Model');

class TaskCompletion extends Model {
  static get table() { return 'task_completions'; }

  // ─── Relationships ────────────────────────────────────────────────────────
  static task()       { return this.belongsTo(require('./Task'),   'task_id');   }
  static member()     { return this.belongsTo(require('./Member'), 'member_id'); }
  static approvedBy() { return this.belongsTo(require('./Member'), 'approved_by'); }

  // ─── Scopes ───────────────────────────────────────────────────────────────
  static async pending(familyId) {
    return this.whereRaw(`
      task_completions.status = 'pending'
      AND tasks.family_id = $1
    `, [familyId]);
  }

  static async forMember(memberId, limit = 20) {
    return this.whereRaw(
      'member_id = $1 ORDER BY completed_at DESC',
      [memberId],
      { limit }
    );
  }
}

module.exports = TaskCompletion;
