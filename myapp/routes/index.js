var express = require('express');
var router = express.Router();


router.get('/', function(req, res, next) {
  res.render('index', { title: 'Alquiler de Equipos para Eventos' });
});

module.exports = router;
