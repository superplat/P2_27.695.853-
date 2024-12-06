const express = require('express');
const router = express.Router();
const ContactosController = require('../controllers/ContactosController');

/* GET home page */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});


router.post('/add_contact', ContactosController.add);


router.get('/contacts', ContactosController.list);


router.get('/success', (req, res) => {
  res.render('success', { message: '¡Contacto guardado con éxito!' }); 
});

module.exports = router;
