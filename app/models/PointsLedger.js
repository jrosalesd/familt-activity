const Model = require('./Model');

class PointsLedger extends Model {
  static get table() { return 'points_ledger'; }

  /**
   * Award points to a member.
   * Uses inherited transaction() to keep ledger + balance in sync.
   * If either query fails, both are rolled back.
   */
  static async award({ memberId, points, reason, type = 'earned', referenceId = null, referenceType = null }) {
    const expiresAt = (type === 'earned' || type === 'bonus')
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : null;

    await this.transaction(async (client) => {
      await client.query(`
        INSERT INTO points_ledger
          (member_id, points, reason, type, reference_id, reference_type, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [memberId, points, reason, type, referenceId, referenceType, expiresAt]);

      await client.query(
        'UPDATE members SET points_balance = points_balance + $1 WHERE id = $2',
        [points, memberId]
      );
    });
  }

  /**
   * Deduct points from a member.
   * Delegates to award() with a negative value.
   */
  static async deduct({ memberId, points, reason, referenceId = null }) {
    return this.award({
      memberId,
      points:        -Math.abs(points),
      reason,
      type:          'spent',
      referenceId,
      referenceType: 'redemption',
    });
  }

  /**
   * Get points history for a member.
   * Uses inherited whereRaw() — no direct db access needed.
   */
  static async historyFor(memberId, limit = 30) {
    return this.whereRaw(
      'member_id = $1 ORDER BY created_at DESC',
      [memberId],
      { limit }
    );
  }

}

module.exports = PointsLedger;
