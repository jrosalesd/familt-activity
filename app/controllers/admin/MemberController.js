const Controller   = require('../Controller');
const Member       = require('../../models/Member');
const Role         = require('../../models/Role');
const PointsLedger = require('../../models/PointsLedger');
const { route }    = require('../../../routes/Router');

class MemberController extends Controller {

  // GET /admin/members
  async index(req, res) {
    const familyId = this.currentFamily(req).id;
    const members  = await Member.activeInFamily(familyId);

    const adults   = [];
    const children = [];

    for (const m of members) {
      const role = await Role.byValue(m.role);
      Role.usesPin(role) ? children.push(m) : adults.push(m);
    }

    res.render('admin/members/index', { title: 'Family Members', adults, children });
  }

  // GET /admin/members/create
  create(req, res) {
    this.view(res,'admin/members/create',{
      title: 'Add Member'
    });
  }

  // POST /admin/members
  async store(req, res) {
    const familyId = this.currentFamily(req).id;
    const { name, role, email, password, pin, pin_length, avatar_color, is_temporary, expires_at } = req.body;

    const roleRecord = await Role.byValue(role);
    if (!roleRecord) {
      return this.error(req, res, 'Invalid role selected.', route('admin.members.create'));
    }

    // Validate PIN for pin-based roles
    if (Role.usesPin(roleRecord)) {
      if (!pin || pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
        return this.error(req, res, 'PIN must be 4–8 digits.', route('admin.members.create'));
      }
    }

    // Validate email/password for non-pin roles
    if (!Role.usesPin(roleRecord) && (!email || !password)) {
      return this.error(req, res, 'This role requires an email and password.', route('admin.members.create'));
    }

    const data = {
      family_id:    familyId,
      name:         name.trim(),
      role,
      avatar_color: avatar_color || '#5b4fcf',
      is_temporary: is_temporary === 'on',
      expires_at:   is_temporary === 'on' && expires_at ? expires_at : null,
    };

    if (Role.usesPin(roleRecord)) {
      // Hash the PIN before storing — never store raw PIN
      data.pin_hash   = await Member.hashPin(pin);
      data.pin_length = parseInt(pin_length) || pin.length;
    } else {
      data.email         = email.toLowerCase().trim();
      data.password_hash = await Member.hashPassword(password);
    }

    await Member.create(data);
    return this.success(req, res, `${name} has been added to the family!`, route('admin.members.index'));
  }

  // GET /admin/members/:id/edit
  async edit(req, res) {
    const member = await Member.findOrFail(req.params.id);
    this.authorize(member.family_id === this.currentFamily(req).id);
    this.addScript(res, 'kid-login');
    res.render('admin/members/edit', { title: `Edit ${member.name}`, member });
  }

  // PUT /admin/members/:id
  async update(req, res) {
    const { name, email, password, pin, pin_length, avatar_color, is_temporary, expires_at, role } = req.body;
    const member  = await Member.findOrFail(req.params.id);

    this.authorize(member.family_id === this.currentFamily(req).id);

    const oldRole = await Role.byValue(member.role);
    const newRole = await Role.byValue(role);

    if (!newRole) {
      return this.error(req, res, 'Invalid role selected.', route('admin.members.edit', { id: req.params.id }));
    }

    const data = {
      name:         name.trim(),
      role,
      avatar_color: avatar_color || member.avatar_color,
      is_temporary: is_temporary === 'on',
      expires_at:   is_temporary === 'on' && expires_at ? expires_at : null,
    };

    // Update PIN if provided and valid
    if (Role.usesPin(newRole) && pin && pin.length >= 4 && pin.length <= 8 && /^\d+$/.test(pin)) {
      data.pin_hash   = await Member.hashPin(pin);
      data.pin_length = parseInt(pin_length) || pin.length;
    }

    // Update email/password if provided
    if (!Role.usesPin(newRole) && email) data.email         = email.toLowerCase().trim();
    if (!Role.usesPin(newRole) && password) data.password_hash = await Member.hashPassword(password);

    // Role switching — clear credentials that no longer apply
    if (Role.usesPin(oldRole) && !Role.usesPin(newRole)) {
      data.pin_hash        = null;
      data.pin_length      = null;
      data.pin_attempts    = 0;
      data.pin_locked_until = null;
    }
    if (!Role.usesPin(oldRole) && Role.usesPin(newRole)) {
      data.email         = null;
      data.password_hash = null;
    }

    await Member.update(req.params.id, data);
    return this.success(req, res, `${name} updated.`, route('admin.members.index'));
  }
  
  // POST /admin/members/:id/adjust-points
  async adjustPoints(req, res) {
    const { points, reason } = req.body;
    const member = await Member.findOrFail(req.params.id);
    this.authorize(member.family_id === this.currentFamily(req).id);

    const amount = parseInt(points);
    if (isNaN(amount) || amount === 0) {
      return this.error(req, res, 'Enter a valid point amount.', route('admin.members.edit', { id: req.params.id }));
    }

    await PointsLedger.award({
      memberId: member.id,
      points:   amount,
      reason:   reason || (amount > 0 ? 'Bonus points' : 'Points adjusted'),
      type:     'adjusted',
    });

    return this.success(
      req, res,
      `${amount > 0 ? '+' : ''}${amount} points applied to ${member.name}.`,
      route('admin.members.index')
    );
  }

  // GET /admin/members/:id
  async show(req, res) {
    const member = await Member.findOrFail(req.params.id);
    this.authorize(member.family_id === this.currentFamily(req).id);

    const role = await Role.byValue(member.role);
    if (!Role.usesPin(role)) {
      return res.redirect(route('admin.members.edit', { id: member.id }));
    }

    const days        = parseInt(req.query.days) || 30;
    const from        = req.query.from || null;
    const to          = req.query.to   || null;
    const completions = await Member.getCompletions(member.id, days);
    const ledger      = await Member.getLedger(member.id, days);
    const redemptions = await Member.getRedemptions(member.id, days);
    const pointsChart = await Member.getPointsChart(member.id, days);
    const metrics     = Member.getMetrics(member, completions, ledger, redemptions);
    const customRange = !!(from && to);

    return this.view(res, 'admin/members/show',{
      title: `${member.name}'s Activity`,
      member,
      completions,
      ledger,
      redemptions,
      metrics,
      pointsChart: JSON.stringify(pointsChart),
      days,
      to,
      from,
      customRange,

    });

  }

  // DELETE /admin/members/:id
  async destroy(req, res) {
    const member = await Member.findOrFail(req.params.id);
    this.authorize(member.family_id === this.currentFamily(req).id);
    this.authorize(member.id !== this.currentMember(req).id, "You can't remove yourself!");
    await Member.update(req.params.id, { is_active: false });
    return this.success(req, res, `${member.name} has been removed.`, route('admin.members.index'));
  }

}

module.exports = new MemberController();