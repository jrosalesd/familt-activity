const Controller = require('../Controller');
const Invite     = require('../../models/Invite');
const { route }  = require('../../../routes/Router');

class InviteController extends Controller {

  async index(req, res) {
    const invites = await Invite.forFamily(this.currentFamily(req).id);
    res.render('admin/invites/index', { title: 'Invites', invites });
  }

  create(req, res) {
    res.render('admin/invites/create', { title: 'Send Invite' });
  }

  async store(req, res) {
    const { role, days_valid } = req.body;
    const invite = await Invite.createInvite({
      familyId:  this.currentFamily(req).id,
      role,
      createdBy: this.currentMember(req).id,
      daysValid: parseInt(days_valid) || 7,
    });

    const link = `${req.protocol}://${req.get('host')}/join/${invite.code}`;
    return this.success(req, res, `Invite created! Link: ${link}`, route('admin.invites.index'));
  }

  async destroy(req, res) {
    await Invite.delete(req.params.id);
    return this.success(req, res, 'Invite deleted.', route('admin.invites.index'));
  }
}

module.exports = new InviteController();
