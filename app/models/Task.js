const Model = require('./Model');

class Task extends Model {
  static get table() { return 'tasks'; }

  // ─── Relationships ────────────────────────────────────────────────────────
  static family()      { return this.belongsTo(require('./Family'),       'family_id'); }
  static creator()     { return this.belongsTo(require('./Member'),       'created_by'); }
  static assignedTo()  { return this.belongsTo(require('./Member'),       'assigned_to'); }
  static completions() { return this.hasMany(require('./TaskCompletion'), 'task_id'); }

  // ─── Scopes ───────────────────────────────────────────────────────────────
  static async forFamily(familyId, type = null) {
    if (type) return this.whereRaw('family_id = $1 AND type = $2 AND is_active = true', [familyId, type]);
    return this.whereRaw('family_id = $1 AND is_active = true ORDER BY created_at DESC', [familyId]);
  }

  static async forMember(familyId, memberId) {
    return this.whereRaw(`
      family_id = $1 AND is_active = true
      AND (
        assignment_type = 'all'
        OR (assignment_type = 'specific' AND id IN (
          SELECT task_id FROM task_assignments WHERE member_id = $2
        ))
        OR (assignment_type = 'rotating' AND id IN (
          SELECT task_id FROM task_assignments
          WHERE member_id = $2
          AND sort_order = (
            SELECT COALESCE(
              (SELECT (rotation_index + 1) % (
                SELECT COUNT(*) FROM task_assignments ta2 WHERE ta2.task_id = task_assignments.task_id
              ) FROM task_completions tc
               WHERE tc.task_id = task_assignments.task_id
               ORDER BY tc.completed_at DESC LIMIT 1
              ), 0
            )
          )
        ))
      )
      ORDER BY created_at DESC
    `, [familyId, memberId]);
  }

  // ─── Assignment helpers ───────────────────────────────────────────────────
  static async getAssignments(taskId) {
    return this.query(`
      SELECT ta.*, m.name, m.avatar_color
      FROM task_assignments ta
      JOIN members m ON m.id = ta.member_id
      WHERE ta.task_id = $1
      ORDER BY ta.sort_order ASC
    `, [taskId]);
  }

  static async setAssignments(taskId, memberIds = []) {
    await this.transaction(async (client) => {
      await client.query('DELETE FROM task_assignments WHERE task_id = $1', [taskId]);
      for (let i = 0; i < memberIds.length; i++) {
        await client.query(
          'INSERT INTO task_assignments (task_id, member_id, sort_order) VALUES ($1, $2, $3)',
          [taskId, memberIds[i], i]
        );
      }
    });
  }

  static async currentRotationMember(taskId) {
    const rows = await this.query(`
      SELECT ta.*, m.name, m.avatar_color
      FROM task_assignments ta
      JOIN members m ON m.id = ta.member_id
      WHERE ta.task_id = $1
      AND ta.sort_order = (
        SELECT COALESCE(
          (SELECT (rotation_index + 1) % (
            SELECT COUNT(*) FROM task_assignments ta2 WHERE ta2.task_id = $1
          ) FROM task_completions
           WHERE task_id = $1
           ORDER BY completed_at DESC LIMIT 1
          ), 0
        )
      )
    `, [taskId]);
    return rows[0] || null;
  }

  // ─── Utils ────────────────────────────────────────────────────────────────
  static nextDueDate(recurrence) {
    const now = new Date();
    switch (recurrence) {
      case 'daily':   return new Date(now.setDate(now.getDate() + 1));
      case 'weekly':  return new Date(now.setDate(now.getDate() + 7));
      case 'monthly': return new Date(now.setMonth(now.getMonth() + 1));
      default:        return null;
    }
  }
}

module.exports = Task;
