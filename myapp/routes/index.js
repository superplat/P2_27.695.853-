const express = require('express');
const router = express.Router();
const ContactosController = require('../controllers/ContactosController');

// Definir baseURL para todas las rutas
const baseURL = process.env.BASE_URL || 'http://localhost:3000';

/* GET home page */
router.get('/', function (req, res, next) {
  res.render('index', { 
    title: 'Alquiler de Equipos para Eventos',
    baseURL: baseURL, // Enviar baseURL a la vista
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY, // Pasar la clave pública de reCAPTCHA
  });
});

/* Success página */
router.get('/success', (req, res) => {
  res.render('success', { 
    message: '¡Contacto guardado con éxito!',
    baseURL: baseURL, // Enviar baseURL a la vista
    csrfToken: req.csrfToken(), // Pasar el token CSRF si es necesario
  });
});

module.exports = router;