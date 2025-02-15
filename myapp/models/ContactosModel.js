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

    this.ensureTableAndColumnExist();
  }

  async ensureTableAndColumnExist() {
    try {
      await this.createTable();
      const columns = await this.getColumns();
      const columnNames = columns.map(col => col.name);

      if (!columnNames.includes('country')) {
        console.log('La columna "country" no existe, agregándola...');
        await this.addCountryColumn();
      } else {
        console.log('La columna "country" ya existe.');
      }
    } catch (err) {
      console.error('Error al verificar o crear la tabla/columna:', err);
      throw err;
    }
  }

  // Obtener columnas de la tabla "contactos"
  getColumns() {
    return new Promise((resolve, reject) => {
      this.db.all("PRAGMA table_info(contactos);", (err, columns) => {
        if (err) {
          reject('Error al verificar columnas:', err);
        } else {
          resolve(columns);
        }
      });
    });
  }

  // Agregar la columna "country" a la tabla
  addCountryColumn() {
    return new Promise((resolve, reject) => {
      this.db.run("ALTER TABLE contactos ADD COLUMN country TEXT", (err) => {
        if (err) {
          reject('Error al agregar la columna "country":', err);
        } else {
          resolve();
        }
      });
    });
  }

  // Crear la tabla "contactos"
  createTable() {
    return new Promise((resolve, reject) => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS contactos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          nombre TEXT NOT NULL,
          comentario TEXT NOT NULL,
          ip TEXT,
          country TEXT,
          fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) {
            reject('Error al crear la tabla:', err);
          } else {
            resolve();
          }
        });
    });
  }

  // Añadir contacto
  async addContact(email, nombre, comentario, ip, country = 'Desconocido') { // Valor predeterminado para 'country'
    if (!email || !nombre || !comentario || !ip || !country) {
      throw new Error('Faltan datos necesarios para agregar el contacto');
    }

    try {
      const query = `
        INSERT INTO contactos (email, nombre, comentario, ip, country)
        VALUES (?, ?, ?, ?, ?)`;

      const result = await new Promise((resolve, reject) => {
        this.db.run(query, [email, nombre, comentario, ip, country], function (err) {
          if (err) {
            return reject(err);
          }
          resolve(this.lastID); // Devuelve el ID del contacto
        });
      });

      console.log(`Nuevo contacto agregado con ID ${result}`);
      return result;
    } catch (err) {
      console.error('Error al insertar contacto:', err);
      throw err;
    }
  }

  // Obtener todos los contactos
  async getContacts(limit = 100, offset = 0) {
    try {
      const query = `SELECT * FROM contactos LIMIT ? OFFSET ?`;
      const rows = await new Promise((resolve, reject) => {
        this.db.all(query, [limit, offset], (err, rows) => {
          if (err) {
            return reject(err);
          }
          resolve(rows);
        });
      });
      return rows;
    } catch (err) {
      console.error('Error al obtener contactos:', err);
      throw err;
    }
  }

// Eliminar un contacto por su ID
async deleteContactById(id) {
  return new Promise((resolve, reject) => {
    const query = `DELETE FROM contactos WHERE id = ?`;
    this.db.run(query, [id], function (err) {
      if (err) {
        console.error('Error al ejecutar DELETE:', err);
        return reject(err);  // Rechazamos la promesa si hay error
      }
      console.log(`Filas eliminadas: ${this.changes}`);  // Depuración
      resolve(this.changes);  // Retornamos el número de filas afectadas
    });
  });
}


  // Cerrar la base de datos
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error al cerrar la base de datos:', err);
          reject(err);
        } else {
          console.log('Base de datos cerrada correctamente.');
          resolve();
        }
      });
    });
  }
}

module.exports = ContactosModel;
