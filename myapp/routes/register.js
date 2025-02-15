const express = require('express');
const bcrypt = require('bcrypt');
const csrf = require('csurf'); 
const sqlite3 = require('sqlite3').verbose(); // Importar sqlite3
const path = require('path');
const router = express.Router();

// Middleware para verificar si el usuario está autenticado como admin
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated() && req.user.username === 'admin') {
    return next();
  }
  res.redirect('/login');
}

// Ruta a la base de datos contactos.db
const dbPath = path.join(__dirname, '../database/contactos.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err);
  } else {
    console.log('Conectado a la base de datos SQLite.');
  }
});

// Middleware de CSRF
const csrfProtection = csrf({ cookie: true });

// Mostrar formulario de registro (solo accesible para administradores)
router.get('/register', isAuthenticated, csrfProtection, (req, res) => {
  res.render('register', { csrfToken: req.csrfToken() });
});

// Procesar el registro
router.post('/register', isAuthenticated, csrfProtection, async (req, res) => {
  console.log('Datos recibidos:', req.body);  // Muestra los datos recibidos por el servidor

  const { username, password, confirmPassword } = req.body;

  // Validar que las contraseñas coincidan
  if (password !== confirmPassword) {
    return res.render('register', { error: 'Las contraseñas no coinciden', csrfToken: req.csrfToken() });
  }

  // Validar la longitud de la contraseña (mínimo 6 caracteres)
  if (password.length < 6) {
    return res.render('register', { error: 'La contraseña debe tener al menos 6 caracteres', csrfToken: req.csrfToken() });
  }

  // Verificar si el usuario ya existe
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.render('register', { error: 'Error al consultar la base de datos', csrfToken: req.csrfToken() });
    }

    if (user) {
      return res.render('register', { error: 'El usuario ya existe', csrfToken: req.csrfToken() });
    }

    // Encriptar la contraseña
    bcrypt.hash(password, 10, (err, passwordHash) => {
      if (err) {
        return res.render('register', { error: 'Error al registrar el usuario', csrfToken: req.csrfToken() });
      }

      // Guardar el nuevo usuario en la base de datos
      db.run(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)',
        [username, passwordHash],
        (err) => {
          if (err) {
            return res.render('register', { error: 'Error al registrar el usuario', csrfToken: req.csrfToken() });
          }

          res.redirect('/contactos'); // Redirigir a la vista de contactos
        }
      );
    });
  });
});

module.exports = router;

