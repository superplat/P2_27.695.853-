  require('dotenv').config(); // Cargar variables de entorno
  const express = require('express');
  const cors = require('cors');
  const path = require('path');
  const session = require('express-session');
  const passport = require('passport');
  const LocalStrategy = require('passport-local').Strategy;
  const GoogleStrategy = require('passport-google-oauth20').Strategy;
  const bcrypt = require('bcrypt');
  const sqlite3 = require('sqlite3').verbose();
  const axios = require('axios');
  const nodemailer = require('nodemailer');
  const helmet = require('helmet');
  const cookieParser = require('cookie-parser'); // Requerir cookie-parser
  const csrf = require('csurf');
  



  const app = express();

  const baseURL = process.env.BASE_URL || 'http://localhost:3000';


  // Pasar baseURL a todas las vistas
app.use((req, res, next) => {
  res.locals.baseURL = baseURL;  // Aquí estamos asignando baseURL a res.locals
  next();
});


  // Usar CORS con opciones predeterminadas
  app.use(cors());

  // Middleware para procesar solicitudes JSON
  app.use(express.json());


  // Middleware para servir archivos estáticos
  app.use(express.static(path.join(__dirname, 'public')));

  // Configuración de la base de datos
  const db = new sqlite3.Database('./database.sqlite');
  
// Crear un usuario admin manualmente al iniciar el servidor
async function createAdmin() {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, user) => {
      if (err) return reject(err);
      if (user) {
        console.log('El usuario admin ya existe.');
        resolve();
      } else {
        const adminPassword = 'adminpassword'; // Cambia esto por una contraseña segura
        bcrypt.hash(adminPassword, 10, (err, passwordHash) => {
          if (err) return reject(err);
          db.run(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            ['admin', passwordHash],
            (err) => {
              if (err) return reject(err);
              console.log('Usuario admin creado con éxito.');
              resolve();
            }
          );
        });
      }
    });
  });
}

// Llamar a la función para crear el admin
createAdmin().catch((err) => console.error('Error al crear el usuario admin:', err));


  // Crear tablas si no existen
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        googleId TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS contactos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        email TEXT,
        comentario TEXT,
        ip TEXT,
        country TEXT,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  // Middleware de cookie-parser
  app.use(cookieParser());  // Necesario para manejar cookies

  // Seguridad de cabeceras HTTP
  app.use(helmet());


  // Configuración de CSP con Helmet
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"], // Por defecto, solo permitir recursos del mismo origen
        scriptSrc: [
          "'self'",
          'https://www.google.com',
          'https://www.gstatic.com',
          'https://cdn.jsdelivr.net',
          'https://code.jquery.com',
          'https://www.googletagmanager.com',
          'https://maps.googleapis.com', // Permitir Google Maps API
          "'unsafe-inline'",
        ],
        styleSrc: [
          "'self'",
          'https://cdn.jsdelivr.net',
          'https://fonts.googleapis.com', // Permitir hojas de estilo de Google Fonts
          "'unsafe-inline'",
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com', // Permitir fuentes de Google Fonts
        ],
        imgSrc: [
          "'self'",
          'data:',
          'https://www.google.com',
          'https://www.gstatic.com',
          'https://www.google-analytics.com',
          'https://maps.gstatic.com', // Permitir imágenes de Google Maps
          'https://maps.googleapis.com', // Permitir imágenes de Google Maps
        ],
        connectSrc: [
          "'self'",
          'https://www.google.com',
          'https://www.gstatic.com',
          'https://www.google-analytics.com',
          'https://maps.googleapis.com', // Permitir conexiones a Google Maps
        ],
        frameSrc: [
          "'self'",
          'https://www.google.com',
        ],
      },
    })
  );

  // Configuración de sesiones
  app.use(session({
    secret: process.env.SESSION_SECRET || 'secreto_super_seguro',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',  // Solo en producción se usará HTTPS
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    }
  }));





  // Middleware para manejar la inactividad (15 minutos)
  app.use((req, res, next) => {
    const now = Date.now();
    if (req.session.lastActivity && now - req.session.lastActivity > 15 * 60 * 1000) {
      req.session.destroy((err) => {
        if (err) console.error('Error destruyendo sesión:', err);
        return res.redirect('/login');
      });
    } else {
      req.session.lastActivity = now;
    }
    next();
  });



  // Inicializar Passport
  app.use(passport.initialize());
  app.use(passport.session());

 

  // Estrategia de autenticación local
  passport.use(new LocalStrategy(
    (username, password, done) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) return done(err);
        if (!user || !bcrypt.compareSync(password, user.password_hash)) {
          return done(null, false);
        }
        return done(null, user);
      });
    }
  ));

  // Estrategia de autenticación con Google OAuth
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  (accessToken, refreshToken, profile, done) => {
    db.get('SELECT * FROM users WHERE googleId = ?', [profile.id], (err, user) => {
      if (err) return done(err);
      if (!user) {
        const newUser = {
          googleId: profile.id,
          username: profile.emails[0].value,
          password_hash: ''
        };
        db.run('INSERT INTO users (username, password_hash, googleId) VALUES (?, ?, ?)',
          [newUser.username, newUser.password_hash, newUser.googleId], (err) => {
            if (err) return done(err);
            return done(null, newUser);
          });
      } else {
        return done(null, user);
      }
    });
  }));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => done(err, user));
  });

  // Verificación de autenticación
  function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
  }

  // Configuración del motor de vistas
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');




  // Procesar datos del formulario
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Middleware de protección CSRF
  app.use(csrf({ cookie: true }));

  // Pasar token CSRF y baseURL a las vistas
  app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    res.locals.baseURL = baseURL;
    next();
  });

  app.get('/', (req, res) => {
    // Definir metadatos para redes sociales
    res.locals.metaTags = {
      title: 'Alquiler de Equipos para Eventos',
      description: 'Ofrecemos alquiler de equipos de alta calidad para eventos. ¡Reserva ahora y haz que tu evento sea un éxito!',
      image: `${baseURL}/images/logo-evento.jpg`, // Ruta a la imagen de vista previa en redes sociales
      url: baseURL,
      type: 'website', // Para Open Graph
      twitterCard: 'summary_large_image', // Para Twitter Cards
      twitterSite: '@elonmusk', // Tu cuenta de Twitter (si aplica)
    };
  
    // Renderizar la vista pasando los metadatos
    res.render('index', {
      title: 'Alquiler de Equipos para Eventos',
      baseURL: process.env.BASE_URL || 'http://localhost:3000',
      recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY, // Pasa la clave pública de reCAPTCHA
    });
  });
  



  // Ruta de login
  app.get('/login', (req, res) => res.render('login'));


  
  // **Aquí agregas las rutas de registro**
const registerRouter = require('./routes/register'); // Asegúrate de que la ruta esté correcta
app.use(registerRouter);  // Usar el enrutador de registro



  // Ruta de login con Google
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => res.redirect('/contactos')
  );

// Ruta de login local (admin)
app.post('/login', passport.authenticate('local', {
  successRedirect: '/contactos',  // Redirige a la página de contactos si es admin
  failureRedirect: '/login',      // Si falla la autenticación, vuelve a la página de login
  failureFlash: true
}));



  // Ruta de logout
  app.get('/logout', (req, res) => {
    req.logout((err) => {
      if (err) return next(err);
      res.redirect('/');
    });
  });

  // Mostrar contactos
  app.get('/contactos', isAuthenticated, async (req, res) => {
    try {
      const contactos = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM contactos', (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        });
      });
      
    // Renderizar la vista de contactos y pasar el token CSRF
res.render('contactos', {
  contactos,
  csrfToken: req.csrfToken(), // Incluir el token CSRF
  baseURL: baseURL, // Pasar baseURL a la vista
  user: req.user, // Pasar el objeto user (si está autenticado)
});
} catch (err) {
  console.error('Error al obtener contactos:', err);
  res.status(500).send('Error al obtener contactos');
}

  });


// Agregar contacto
app.post('/contactos/add', async (req, res) => {
  const { email, nombre, comentario, 'g-recaptcha-response': recaptchaResponse } = req.body;

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // Mostrar datos en consola para depuración
  console.log('Formulario recibido:', req.body);
  console.log('IP:', ip);

  if (!email || !nombre || !comentario || !recaptchaResponse) {
    return res.status(400).send('Por favor, completa todos los campos y verifica el captcha.');
  }

  try {
    console.log('Validando reCAPTCHA...');
    const isRecaptchaValid = await validateRecaptcha(recaptchaResponse);
    if (!isRecaptchaValid) {
      console.log('reCAPTCHA falló');
      return res.status(400).send('La validación de reCAPTCHA falló.');
    }

    // Obtener geolocalización (manejando cualquier error)
    let country = await getGeolocation(ip);
    console.log('Geolocalización obtenida:', country);

    // Insertar los datos en la base de datos
    console.log('Insertando datos en la base de datos...');
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO contactos (email, nombre, comentario, ip, country) VALUES (?, ?, ?, ?, ?)',
        [email, nombre, comentario, ip, country], (err) => {
          if (err) {
            console.log('Error al insertar en la base de datos:', err);
            return reject(err);
          }
          resolve();
        });
    });

    // Enviar notificación
    console.log('Enviando notificación...');
    await sendNotification({ email, nombre, comentario, ip, country });

    console.log('Formulario procesado correctamente.');

    // Responder con éxito (json)
    res.status(200).json({
      success: true,
      message: 'Formulario enviado y datos almacenados correctamente.'
    });

    // O redirigir a la página de éxito si prefieres la redirección tradicional
    // res.redirect(`${baseURL}/success`); // Descomentar si prefieres la redirección

  } catch (err) {
    console.error('Error al procesar el formulario:', err);
    res.status(500).send('Ocurrió un error al procesar tu solicitud.');
  }
});

// Confirmación de éxito (solo para redirección tradicional)
app.get('/success', (req, res) => {
  res.render('success', {
    baseURL: baseURL, // Pasar baseURL a la vista
    csrfToken: req.csrfToken(), // Pasar el token CSRF si es necesario
  });
});


  // Manejo de errores 404
  app.use((req, res) => res.status(404).render('error', {
    message: 'Página no encontrada',
    error: { status: 404, stack: 'La página que buscas no existe.' }
  }));

  // Manejo de errores 500 (al final de todo)
  app.use((err, req, res, next) => {
    console.error(err.stack);

    if (process.env.NODE_ENV !== 'development') {
      err.stack = null; // En producción no mostramos el stack
    }

    res.status(500).render('error', {
      message: 'Error interno del servidor',
      error: { status: 500, stack: err.stack },
      csrfToken: req.csrfToken ? req.csrfToken() : null
    });
  });


  // Función para validar reCAPTCHA
  async function validateRecaptcha(recaptchaResponse) {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const url = 'https://www.google.com/recaptcha/api/siteverify';

    try {
      // Enviar solicitud a Google para verificar el token
      const response = await axios.post(url, null, {
        params: {
          secret: secretKey,
          response: recaptchaResponse,
        },
      });

      const { success, score, action, hostname, 'error-codes': errors } = response.data;

      // Registrar la respuesta completa para diagnóstico
      console.log('Respuesta de reCAPTCHA:', response.data);

      // Validar respuesta, score y acción esperada
      if (!success) {
        console.error('Falló la validación reCAPTCHA:', errors);
        return false;
      }

      if (score < 0.5) {
        console.warn(`Score bajo: ${score}. Posible bot.`);
        return false;
      }

      if (action !== 'submit') {
        console.warn(`Acción inesperada: ${action}.`);
        return false;
      }

      if (hostname !== 'localhost') {
        console.warn(`Hostname inesperado: ${hostname}.`);
        return false;
      }

      console.log('✅ reCAPTCHA validado con éxito.');
      return true;

    } catch (error) {
      console.error('❌ Error al validar reCAPTCHA:', error.message);
      return false;
    }
  }

  // Función para obtener la geolocalización desde ipstack
async function getGeolocation(ip) {
  const apiKey = process.env.IPSTACK_API_KEY; // Usa la nueva API key para ipstack

  try {
    const response = await axios.get(`http://api.ipstack.com/${ip}?access_key=${apiKey}`);
    return response.data.country_name || 'Desconocido';
  } catch (error) {
    console.error('Error al obtener geolocalización desde ipstack:', error);
    return 'Desconocido';
  }
}

  // Notificación por correo
  async function sendNotification({ email, nombre, comentario, ip, country }) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'programacion2ais@dispostable.com',
      subject: 'Nuevo Formulario de Contacto',
      text: `Se ha recibido un nuevo formulario:
      - Nombre: ${nombre}
      - Correo: ${email}
      - Comentario: ${comentario}
      - IP: ${ip}
      - País: ${country}
      - Fecha/Hora: ${new Date().toLocaleString()}`
    };

    await transporter.sendMail(mailOptions);
  }

  // Iniciar el servidor
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Servidor en ejecución en http://localhost:${port}`));
