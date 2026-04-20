const Controller   = require('../Controller');
const Member       = require('../../models/Member');
const Task         = require('../../models/Task');
const Reward       = require('../../models/Reward');
const Invite       = require('../../models/Invite');
const PointsLedger = require('../../models/PointsLedger');

class DashboardController extends Controller {

  async index(req, res) {
    const family   = this.currentFamily(req);
    const member   = this.currentMember(req);
    const kidsLink = `${req.protocol}://${req.get('host')}/family/${family.slug}/kids`;

    // ── Family members ────────────────────────────────────────────────
    const members  = await Member.activeInFamily(family.id);

    // ── Tasks ─────────────────────────────────────────────────────────
    const tasks    = await Task.forFamily(family.id);

    // ── Rewards ───────────────────────────────────────────────────────
    const rewards  = await Reward.available(family.id);

    // ── Recent points activity ────────────────────────────────────────
    const recentActivity = await PointsLedger.recent(10);

    // ── Pending invites ───────────────────────────────────────────────
    const pendingInvites = await Invite.whereRaw(
      'family_id = $1 AND used_at IS NULL AND expires_at > NOW()',
      [family.id]
    );

    res.render('admin/dashboard', {
      title:          'Dashboard',
      kidsLink,
      stats: {
        totalMembers:   members.length,
        totalTasks:     tasks.length,
        totalRewards:   rewards.length,
        pendingInvites: pendingInvites.length,
      },
      members,
      recentActivity,
    });
  }

}

module.exports = new DashboardController();
