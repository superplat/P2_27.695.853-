var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');


var ContactosModel = require('./models/ContactosModel');
var db = new ContactosModel(); 

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// nueva ruta para manejar el formulario de contacto
app.post('/add_contact', async (req, res) => {
  const { email, nombre, comentario } = req.body;
  const ip = req.ip; // Dirección ip
  if (!email || !nombre || !comentario) {
    return res.status(400).send('Por favor, completa todos los campos.');
  }

  try {
    await db.addContact(email, nombre, comentario, ip); // Guardar datos en la base de datos
    res.redirect('/success'); // Redirigir a la página de confirmación
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al guardar los datos.');
  }
});

// ágina de confirmación
app.get('/success', (req, res) => {
  res.render('success'); // Renderizar vista de confirmación
});

// 404 error catch
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log(`Servidor en ejecución en el puerto ${port}`);
});

module.exports = app;
