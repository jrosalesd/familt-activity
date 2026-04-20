const db = require('../../config/database');
const { slugify } = require('../utils/slugify');

class Model {
  static get table()      { throw new Error('Model must define a static table getter'); }
  static get primaryKey() { return 'id'; }

  static hasMany(RelatedModel, foreignKey)  { return { type: 'hasMany',    RelatedModel, foreignKey }; }
  static belongsTo(RelatedModel, foreignKey){ return { type: 'belongsTo',  RelatedModel, foreignKey }; }
  static hasOne(RelatedModel, foreignKey)   { return { type: 'hasOne',     RelatedModel, foreignKey }; }


  

  static async all(orderBy = null) {
    let sql = `SELECT * FROM ${this.table}`;
    if (orderBy) sql += ` ORDER BY ${orderBy}`;
    const { rows } = await db.query(sql);
    return rows;
  }

  static async find(id) {
    const { rows } = await db.query(
      `SELECT * FROM ${this.table} WHERE ${this.primaryKey} = $1 LIMIT 1`, [id]
    );
    return rows[0] || null;
  }

  static async findOrFail(id) {
    const record = await this.find(id);
    if (!record) { const err = new Error(`${this.table} #${id} not found`); err.status = 404; throw err; }
    return record;
  }

  static async where(column, value, options = {}) {
    let sql = `SELECT * FROM ${this.table} WHERE ${column} = $1`;
    if (options.orderBy) sql += ` ORDER BY ${options.orderBy}`;
    if (options.limit)   sql += ` LIMIT ${parseInt(options.limit)}`;
    const { rows } = await db.query(sql, [value]);
    return rows;
  }

  static async whereRaw(condition, params = [], options = {}) {
    let sql = `SELECT * FROM ${this.table} WHERE ${condition}`;
    if (options.orderBy) sql += ` ORDER BY ${options.orderBy}`;
    if (options.limit)   sql += ` LIMIT ${parseInt(options.limit)}`;
    const { rows } = await db.query(sql, params);
    return rows;
  }

  static async first(column = null, value = null) {
    if (!column) {
      const { rows } = await db.query(`SELECT * FROM ${this.table} LIMIT 1`);
      return rows[0] || null;
    }
    const { rows } = await db.query(
      `SELECT * FROM ${this.table} WHERE ${column} = $1 LIMIT 1`, [value]
    );
    return rows[0] || null;
  }

  static async count(column = null, value = null) {
    let sql = `SELECT COUNT(*) FROM ${this.table}`;
    const params = [];
    if (column) { sql += ` WHERE ${column} = $1`; params.push(value); }
    const { rows } = await db.query(sql, params);
    return parseInt(rows[0].count);
  }

  static async create(data) {
    const keys         = Object.keys(data);
    const values       = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const { rows }     = await db.query(
      `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return rows[0];
  }

  static async update(id, data) {
    const keys      = Object.keys(data);
    const values    = Object.values(data);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const { rows }  = await db.query(
      `UPDATE ${this.table} SET ${setClause} WHERE ${this.primaryKey} = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    return rows[0];
  }

  static async delete(id) {
    const { rows } = await db.query(
      `DELETE FROM ${this.table} WHERE ${this.primaryKey} = $1 RETURNING *`, [id]
    );
    return rows[0];
  }

  static with(...relations) {
    const ModelClass = this;
    return {
      async find(id) {
        const record = await ModelClass.find(id);
        if (!record) return null;
        return ModelClass._loadRelations(record, relations);
      },
      async all() {
        const records = await ModelClass.all();
        return Promise.all(records.map(r => ModelClass._loadRelations(r, relations)));
      },
      async where(column, value, options) {
        const records = await ModelClass.where(column, value, options);
        return Promise.all(records.map(r => ModelClass._loadRelations(r, relations)));
      },
    };
  }

  static async _loadRelations(record, relations) {
    for (const rel of relations) {
      if (typeof this[rel] !== 'function') continue;
      const def = this[rel]();
      if (def.type === 'hasMany') {
        record[rel] = await def.RelatedModel.where(def.foreignKey, record[this.primaryKey]);
      } else if (def.type === 'hasOne') {
        const rows = await def.RelatedModel.where(def.foreignKey, record[this.primaryKey]);
        record[rel] = rows[0] || null;
      } else if (def.type === 'belongsTo') {
        record[rel] = await def.RelatedModel.find(record[def.foreignKey]);
      }
    }
    return record;
  }

  /**
   * Generate a unique slug for this model's table.
   * Inherited by all models — any model with a slug column can use this.
   *
   * EXAMPLE:
   *   const slug = await Family.uniqueSlug('Rosales Guzman');
   *   const slug = await Task.uniqueSlug('Wash the Dishes');
   */
  static async uniqueSlug(text, column = 'slug', maxLength = 50) {
    const base    = slugify(text, maxLength);
    let   current = base;
    let   counter = 1;

    while (true) {
      const existing = await this.first(column, current);
      if (!existing) break;
      current = `${base}-${++counter}`;
    }

    return current;
  }

  /**
   * Scope: active records only.
   * Requires the model's table to have an is_active BOOLEAN column.
   *
   * WHAT YOU'RE LEARNING:
   *   This is the "scope" pattern — pre-packaged WHERE clauses
   *   that make controller code more readable.
   *
   *   Instead of:
   *     Member.where('is_active', true)
   *   You write:
   *     Member.active()
   *
   *   Both do the same thing, but active() communicates INTENT.
   *   Six months from now you'll know exactly what it means.
   *
   * USAGE:
   *   const tasks    = await Task.active();
   *   const members  = await Member.active();
   *   const rewards  = await Reward.active();
   */
  static async active(orderBy = null) {
    let sql    = `SELECT * FROM ${this.table} WHERE is_active = true`;
    const params = [];
    if (orderBy) sql += ` ORDER BY ${orderBy}`;
    const { rows } = await db.query(sql, params);
    return rows;
  }

  /**
   * Scope: most recent N records.
   * Requires the model's table to have a created_at TIMESTAMP column.
   *
   * USAGE:
   *   const latest = await Task.recent(5);      // last 5 tasks
   *   const latest = await Redemption.recent(); // last 10 (default)
   */
  static async recent(limit = 10) {
    const { rows } = await db.query(
      `SELECT * FROM ${this.table} ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return rows;
  }

  // ─── Raw query helpers ────────────────────────────────────────────────────────
  /**
   * Run a raw query returning all rows.
   * Use when no other Model method fits.
   * Always use $1, $2 params — never string interpolate user input.
   */
  static async query(sql, params = []) {
    const { rows } = await db.query(sql, params);
    return rows;
  }

  /**
   * Run a raw query returning only the first row.
   */
  static async queryOne(sql, params = []) {
    const { rows } = await db.query(sql, params);
    return rows[0] || null;
  }

  /**
   * Run multiple queries in a single transaction.
   * If any query throws, ALL are rolled back automatically.
   *
   * WHAT YOU'RE LEARNING:
   *   A transaction is an "all or nothing" operation.
   *   Either every query succeeds, or none of them do.
   *   This prevents your DB getting into an inconsistent state —
   *   e.g. points added to ledger but balance never updated.
   *
   * USAGE:
   *   await Model.transaction(async (client) => {
   *     await client.query('UPDATE members SET points_balance...', [50, 1]);
   *     await client.query('INSERT INTO points_ledger...', [...]);
   *   });
   */
  static async transaction(callback) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await callback(client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      // Always release — even if COMMIT fails
      client.release();
    }
  }

  // Model.js — add this static helper
  static dateRangeCondition(column, days, from, to, paramOffset = 1) {
    if (from && to) {
      return {
        condition: `${column} >= $${paramOffset + 1} AND ${column} <= $${paramOffset + 2}`,
        params:    [from, to],
      };
    }
    return {
      condition: `${column} >= NOW() - ($${paramOffset + 1} || ' days')::INTERVAL`,
      params:    [days],
    };
  }

}

module.exports = Model;
