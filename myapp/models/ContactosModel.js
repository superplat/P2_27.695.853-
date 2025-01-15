const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class ContactosModel {
  constructor() {
    const dbDir = path.join(__dirname, '../database');
    const dbPath = path.join(dbDir, 'contactos.db');

    // Crear el directorio de la base de datos si no existe
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

    // Verificar si la columna "country" existe
    this.db.all("PRAGMA table_info(contactos);", (err, columns) => {
      if (err) {
        console.error('Error al verificar columnas:', err);
      } else {
        const columnNames = columns.map(col => col.name);
        if (!columnNames.includes('country')) {
          console.log('La columna "country" no existe, agregándola...');
          this.db.run(`ALTER TABLE contactos ADD COLUMN country TEXT`, (err) => {
            if (err) {
              console.error('Error al agregar la columna "country":', err);
            } else {
              console.log('Columna "country" agregada correctamente.');
            }
          });
        } else {
          console.log('La columna "country" ya existe.');
        }
      }
    });

    // Crear la tabla "contactos" si no existe
    this.db.run(`
      CREATE TABLE IF NOT EXISTS contactos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        nombre TEXT NOT NULL,
        comentario TEXT NOT NULL,
        ip TEXT,
        country TEXT,
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

  
  addContact(email, nombre, comentario, ip, country) {
    return new Promise((resolve, reject) => {
      console.log('Datos a insertar:', { email, nombre, comentario, ip, country });

      const query = `
        INSERT INTO contactos (email, nombre, comentario, ip, country)
        VALUES (?, ?, ?, ?, ?)
      `;

      this.db.run(query, [email, nombre, comentario, ip, country], function (err) {
        if (err) {
          console.error('Error al insertar contacto:', err);
          return reject(err)
        }
        console.log(`Nuevo contacto agregado con ID ${this.lastID}`);
        resolve(this.lastID); // Devuelve el ID del contacto
      });
    });
  }

  // Recuperar todos los contactos
  getContacts() {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM contactos`;

      this.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Error al obtener contactos:', err);
          return reject(err); // Rechazar en caso de error
        }
        resolve(rows);
      });
    });
  }

  // Cerrar la base de datos cuando ya no sea necesario
  close() {
    this.db.close((err) => {
      if (err) {
        console.error('Error al cerrar la base de datos:', err);
      } else {
        console.log('Base de datos cerrada correctamente.');
      }
    });
  }
}

module.exports = ContactosModel;
