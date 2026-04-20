exports.up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS rewards (
      id                SERIAL PRIMARY KEY,
      family_id         INTEGER      NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      title             VARCHAR(150) NOT NULL,
      description       TEXT,
      type              VARCHAR(20)  NOT NULL DEFAULT 'custom'
                          CHECK (type IN ('screen_time','money','treat','outing','custom')),
      points_cost       INTEGER      NOT NULL DEFAULT 50,
      requires_approval BOOLEAN      NOT NULL DEFAULT true,
      is_available      BOOLEAN      NOT NULL DEFAULT true,
      created_at        TIMESTAMP    NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS redemptions (
      id               SERIAL PRIMARY KEY,
      reward_id        INTEGER   NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
      member_id        INTEGER   NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      points_spent     INTEGER   NOT NULL,
      status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','approved','fulfilled','rejected')),
      approved_by      INTEGER   REFERENCES members(id),
      rejection_reason TEXT,
      redeemed_at      TIMESTAMP NOT NULL DEFAULT NOW(),
      fulfilled_at     TIMESTAMP
    );
  `);

  console.log('âœ… Created: rewards, redemptions');
};

exports.down = async (db) => {
  await db.query('DROP TABLE IF EXISTS redemptions');
  await db.query('DROP TABLE IF EXISTS rewards');
  console.log('í·‘  Dropped: rewards, redemptions');
};
