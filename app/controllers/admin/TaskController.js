const Controller = require('../Controller');
const Task       = require('../../models/Task');
const Member     = require('../../models/Member');
const { route }  = require('../../../routes/Router');

class TaskController extends Controller {

  // GET /admin/tasks
  async index(req, res) {
    const familyId = this.currentFamily(req).id;
    const tasks    = await Task.forFamily(familyId);

    for (const task of tasks) {
      task.assignments = await Task.getAssignments(task.id);
    }

    res.render('admin/tasks/index', { title: 'Tasks', tasks });
  }

  // GET /admin/tasks/create
  async create(req, res) {
    const familyId = this.currentFamily(req).id;
    const children = await Member.children(familyId);
    res.render('admin/tasks/create', { title: 'New Task', children });
  }

  // POST /admin/tasks
  async store(req, res) {
    const familyId = this.currentFamily(req).id;
    const memberId = this.currentMember(req).id;
    const {
      title, description, type, points_value,
      requires_approval, is_recurring, recurrence,
      assignment_type, assigned_members,
    } = req.body;

    if (!title?.trim()) {
      return this.error(req, res, 'Task title is required.', route('admin.tasks.create'));
    }

    const task = await Task.create({
      family_id:         familyId,
      created_by:        memberId,
      title:             title.trim(),
      description:       description?.trim() || null,
      type:              type || 'chore',
      points_value:      parseInt(points_value) || 10,
      requires_approval: requires_approval === 'on',
      is_recurring:      is_recurring === 'on',
      recurrence:        is_recurring === 'on' ? recurrence : null,
      assignment_type:   assignment_type || 'all',
      is_active:         true,
    });

    if (assignment_type !== 'all' && assigned_members) {
      const memberIds = Array.isArray(assigned_members)
        ? assigned_members.map(Number)
        : [Number(assigned_members)];
      await Task.setAssignments(task.id, memberIds);
    }

    return this.success(req, res, `"${task.title}" has been created!`, route('admin.tasks.index'));
  }

  // GET /admin/tasks/:id/edit
  async edit(req, res) {
    const familyId   = this.currentFamily(req).id;
    const task       = await Task.findOrFail(req.params.id);
    this.authorize(task.family_id === familyId);
    const children    = await Member.children(familyId);
    const assignments = await Task.getAssignments(task.id);
    res.render('admin/tasks/edit', { title: 'Edit Task', task, children, assignments });
  }

  // PUT /admin/tasks/:id
  async update(req, res) {
    const familyId = this.currentFamily(req).id;
    const task     = await Task.findOrFail(req.params.id);
    this.authorize(task.family_id === familyId);

    const {
      title, description, type, points_value,
      requires_approval, is_recurring, recurrence,
      assignment_type, assigned_members,
    } = req.body;

    await Task.update(task.id, {
      title:             title.trim(),
      description:       description?.trim() || null,
      type:              type || 'chore',
      points_value:      parseInt(points_value) || 10,
      requires_approval: requires_approval === 'on',
      is_recurring:      is_recurring === 'on',
      recurrence:        is_recurring === 'on' ? recurrence : null,
      assignment_type:   assignment_type || 'all',
    });

    const memberIds = assigned_members
      ? (Array.isArray(assigned_members) ? assigned_members.map(Number) : [Number(assigned_members)])
      : [];
    await Task.setAssignments(task.id, assignment_type !== 'all' ? memberIds : []);

    return this.success(req, res, `"${title}" updated.`, route('admin.tasks.index'));
  }

  // DELETE /admin/tasks/:id
  async destroy(req, res) {
    const familyId = this.currentFamily(req).id;
    const task     = await Task.findOrFail(req.params.id);
    this.authorize(task.family_id === familyId);
    await Task.update(task.id, { is_active: false });
    return this.success(req, res, `"${task.title}" removed.`, route('admin.tasks.index'));
  }

}

module.exports = new TaskController();
