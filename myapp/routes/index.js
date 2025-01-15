const express = require('express');
const router = express.Router();
const ContactosController = require('../controllers/ContactosController');

/* GET home page */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Alquiler de Equipos para Eventos' })
});

/* Success pagina */
router.get('/success', (req, res) => {
  res.render('success', { message: '¡Contacto guardado con éxito!' });
});

module.exports = router;
