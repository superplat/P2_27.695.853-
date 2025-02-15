const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

class User {
  constructor() {
    this.db = new sqlite3.Database('./database.sqlite');
    this.createTable();
  }

  createTable() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async createUser(username, password) {
    const passwordHash = await bcrypt.hash(password, 10);
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)',
        [username, passwordHash],
        function (err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  async findUserByUsername(username) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
}

module.exports = User;