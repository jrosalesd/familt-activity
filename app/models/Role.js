const Model = require('./Model');

/**
 * Role.js
 *
 * WHAT YOU'RE LEARNING:
 *   This model is intentionally thin — most of what it needs
 *   is inherited from Model.js.
 *
 * INHERITED FROM Model.js:
 *   Role.find(id)           → find by id
 *   Role.first(col, val)    → find by any column
 *   Role.all()              → wait — we override this below
 *   Role.create(data)       → insert new role
 *   Role.update(id, data)   → update role
 *   Role.delete(id)         → delete role
 *   Role.active()           → all where is_active = true
 *   Role.recent(limit)      → most recent roles
 *
 * ROLE-SPECIFIC:
 *   Role.byValue(value)     → find by 'parent', 'child' etc
 *   Role.canApprove(role)   → check permission from role object
 *   Role.canManage(role)    → check permission from role object
 */
class Role extends Model {
  static get table() { return 'roles'; }

  /**
   * Find a role by its value string.
   * Most common lookup — members store role as a string value.
   *
   * USAGE:
   *   const role = await Role.byValue('parent');
   *   role.can_approve // true
   */
  static async byValue(value) {
    return this.first('value', value);
  }


  /**
   * Permission checks — work on a role object returned from DB.
   * These replace the hardcoded checks in Member.js.
   *
   * USAGE:
   *   const role = await Role.byValue(member.role);
   *   if (Role.canApprove(role)) { ... }
   *
   * NOTE: kept as sync methods because the role object
   * is already loaded — no need for another DB call.
   */
  static canApprove(role) { return role?.can_approve || false; }
  static canManage(role)  { return role?.can_manage  || false; }
  static usesPin(role)    { return role?.uses_pin    || false; }
}

module.exports = Role;
