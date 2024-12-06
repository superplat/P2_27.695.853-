const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class ContactosModel {
  constructor() {
    const dbDir = path.join(__dirname, '../database');
    const dbPath = path.join(dbDir, 'contactos.db');

   
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir);
      console.log('Carpeta "database" creada.');
    }

    // Conectar a la base de datos SQLite 
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error al conectar con la base de datos:', err);
      } else {
        console.log('Conectado a la base de datos SQLite.');
      }
    });

    // Crear la tabla si no existe
    this.db.run(`
      CREATE TABLE IF NOT EXISTS contactos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        nombre TEXT NOT NULL,
        comentario TEXT NOT NULL,
        ip TEXT,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error al crear la tabla:', err);
      } else {
        console.log('Tabla "contactos" asegurada.');
      }
    });
  }

  // agregar un contacto
  addContact(email, nombre, comentario, ip) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO contactos (email, nombre, comentario, ip)
        VALUES (?, ?, ?, ?)
      `;
      this.db.run(query, [email, nombre, comentario, ip], function (err) {
        if (err) {
          console.error('Error al insertar contacto:', err);
          reject(err);
        } else {
          console.log(`Nuevo contacto agregado con ID ${this.lastID}`);
          resolve(this.lastID);  // Devuelve el ID del contacto
        }
      });
    });
  }

  // recuperar todos los contactos
  getContacts() {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM contactos`;
      this.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Error al obtener contactos:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = ContactosModel;
