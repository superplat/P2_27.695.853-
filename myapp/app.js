require('dotenv').config(); // Cargar variables de entorno
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var axios = require('axios');
var nodemailer = require('nodemailer');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var ContactosModel = require('./models/ContactosModel');
var db = new ContactosModel();

var app = express();

// ** Función para obtener la geolocalización **
async function getGeolocation(ip) {
  try {
    const apiKey = process.env.IPAPI_KEY; // Tu clave API de ipapi
    const response = await axios.get(`https://ipapi.co/${ip}/json/?access_key=${apiKey}`);
    return response.data.country_name || 'Desconocido';
  } catch (error) {
    console.error('Error al obtener geolocalización:', error);
    return 'Desconocido'; // En caso de error, devolver valor predeterminado
  }
}

// ** Función para validar el reCAPTCHA **
async function validateRecaptcha(recaptchaResponse) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY; // Clave secreta del reCAPTCHA
  const url = `https://www.google.com/recaptcha/api/siteverify`;

  const response = await axios.post(url, null, {
    params: {
      secret: secretKey,
      response: recaptchaResponse,
    },
  });

  return response.data.success; // Retorna true si la validación fue exitosa
}

// ** Configuración del motor de vistas **
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.post('/add_contact', async (req, res) => {
  const { email, nombre, comentario, 'g-recaptcha-response': recaptchaResponse } = req.body;
  const ip = req.ip; // Dirección IP

  // Verificar si el token está presente
  console.log('Token de reCAPTCHA recibido:', recaptchaResponse);

  if (!email || !nombre || !comentario || !recaptchaResponse) {
    return res.status(400).send('Por favor, completa todos los campos y verifica el captcha.');
  }

  try {
    // Validar reCAPTCHA
    const isRecaptchaValid = await validateRecaptcha(recaptchaResponse);
    console.log('Resultado de la validación de reCAPTCHA:', isRecaptchaValid); // Log del resultado de la validación

    if (!isRecaptchaValid) {
      return res.status(400).send('La validación de reCAPTCHA falló.');
    }

    // Obtener geolocalización del usuario
    const country = await getGeolocation(ip);

    // Guardar datos en la base de datos
    await db.addContact(email, nombre, comentario, ip, country);

    // Enviar notificación por correo electrónico
    await sendNotification({ email, nombre, comentario, ip, country });

    res.redirect('/success'); // Redirigir a la página de confirmación
  } catch (error) {
    console.error('Error al procesar el formulario:', error);
    res.status(500).send('Ocurrió un error al procesar tu solicitud.');
  }
});

// ** Nueva ruta: Mostrar contactos **
app.get('/contactos', async (req, res) => {
  try {
    const contactos = await db.getContacts(); // Obtener contactos desde la base de datos
    res.json(contactos); // Enviar contactos en formato JSON
  } catch (err) {
    console.error('Error al obtener los contactos:', err);
    res.status(500).json({ error: 'Error al obtener los contactos.' });
  }
});



// ** Función para enviar notificación por correo (con Nodemailer) **
async function sendNotification({ email, nombre, comentario, ip, country }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Correo desde el que se enviará
      pass: process.env.EMAIL_PASS, // Contraseña del correo
    },
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
    - Fecha/Hora: ${new Date().toLocaleString()}`,
  };

  await transporter.sendMail(mailOptions); // Enviar correo
}

// ** Página de confirmación **
app.get('/success', (req, res) => {
  res.render('success'); // Renderizar vista de confirmación
});

// ** 404 error catch **
app.use(function (req, res, next) {
  next(createError(404));
});

// ** Error handler **
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error', { message: err.message, stack: err.stack });
});

// ** Puerto del servidor **
var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log(`Servidor en ejecución en el puerto ${port}`);
});

module.exports = app;
