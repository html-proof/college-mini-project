const path = require('path');
const fs = require('fs');

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tutor_db';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

let db;
let pool;

if (isPostgres) {
  const { Pool } = require('pg');
  const poolConfig = {
    connectionString: dbUrl
  };
  if (dbUrl.includes('rds.amazonaws.com') || process.env.NODE_ENV === 'production') {
    poolConfig.ssl = {
      rejectUnauthorized: false
    };
  }
  pool = new Pool(poolConfig);
  console.log('Database Service: Using PostgreSQL connection.');
} else {
  const sqlite3 = require('sqlite3').verbose();
  let dbPath = dbUrl;
  if (dbPath.startsWith('sqlite:///')) {
    dbPath = dbPath.substring(10);
  }
  if (!path.isAbsolute(dbPath)) {
    dbPath = path.join(__dirname, '..', dbPath);
  }
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Could not connect to SQLite database:', err);
    } else {
      console.log('Connected to SQLite database at:', dbPath);
    }
  });
}

// Convert ? placeholders to $1, $2, etc. for PG
function convertSql(sql) {
  if (!isPostgres) return sql;
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// Convert PostgreSQL schema SQL to SQLite compatible syntax
function convertSchemaSqlToSqlite(sql) {
  return sql
    .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/\s+TIMESTAMP\b/g, ' DATETIME');
}


async function run(sql, params = []) {
  if (isPostgres) {
    try {
      let sqlToRun = convertSql(sql);
      // Append RETURNING * for inserts so we can capture the auto-generated primary key
      if (/^\s*insert\s+/i.test(sqlToRun) && !/returning/i.test(sqlToRun)) {
        sqlToRun += ' RETURNING *';
      }
      const res = await pool.query(sqlToRun, params);
      const resultObj = {
        changes: res.rowCount,
        lastID: null
      };
      if (res.rows && res.rows.length > 0) {
        const row = res.rows[0];
        resultObj.lastID = row.id || row.student_id || row.course_id || row.lesson_id || row.quiz_id || row.question_id || row.progress_id || row.chat_id || row.path_id || row.badge_id || row.user_id || null;
      }
      return resultObj;
    } catch (err) {
      throw err;
    }
  } else {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }
}

async function get(sql, params = []) {
  if (isPostgres) {
    const sqlToRun = convertSql(sql);
    const res = await pool.query(sqlToRun, params);
    return res.rows[0];
  } else {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
}

async function all(sql, params = []) {
  if (isPostgres) {
    const sqlToRun = convertSql(sql);
    const res = await pool.query(sqlToRun, params);
    return res.rows;
  } else {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

// Database startup initialization (Schema & Seed)
async function initDb() {
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
  const seedPath = path.join(__dirname, '..', '..', 'database', 'seed.sql');

  if (!fs.existsSync(schemaPath)) {
    console.error('Database Service error: schema.sql file not found at:', schemaPath);
    return;
  }

  let schemaSql = fs.readFileSync(schemaPath, 'utf8');
  if (!isPostgres) {
    schemaSql = convertSchemaSqlToSqlite(schemaSql);
  }

  // Enable foreign keys in SQLite
  if (!isPostgres) {
    await new Promise((resolve, reject) => {
      db.run('PRAGMA foreign_keys = ON;', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Execute schema
  if (isPostgres) {
    await pool.query(schemaSql);
  } else {
    await new Promise((resolve, reject) => {
      db.exec(schemaSql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  console.log('Database schema successfully initialized.');

  // Check if seeding is required (e.g., if courses table is empty)
  const coursesCount = await get('SELECT COUNT(*) as count FROM courses');
  const count = coursesCount
    ? (coursesCount.count !== undefined ? coursesCount.count : (coursesCount.COUNT !== undefined ? coursesCount.COUNT : coursesCount['COUNT(*)']))
    : null;
  if (coursesCount && parseInt(count) === 0) {
    console.log('Database is empty. Seeding initial data...');
    if (fs.existsSync(seedPath)) {
      let seedSql = fs.readFileSync(seedPath, 'utf8');

      
      if (isPostgres) {
        await pool.query(seedSql);
      } else {
        await new Promise((resolve, reject) => {
          db.exec(seedSql, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      console.log('Initial database data seeded successfully.');
    } else {
      console.warn('Database Service warning: seed.sql file not found at:', seedPath);
    }
  } else {
    console.log('Database already initialized. Seeding skipped.');
  }
}

module.exports = {
  run,
  get,
  all,
  initDb,
  isPostgres
};
