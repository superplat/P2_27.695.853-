const express = require('express');
const axios = require('axios');
const ContactosModel = require('../models/ContactosModel');
const csrf = require('csurf');

const router = express.Router();
const csrfProtection = csrf({ cookie: true });

// ✅ Ruta para mostrar contactos
router.get('/', csrfProtection, async (req, res) => {
  try {
    const contactos = await ContactosModel.getContacts();
    res.render('contactos', {
      contactos,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error('Error al obtener contactos:', err);
    res.status(500).send('Error al obtener contactos');
  }
});

// Ruta para eliminar un contacto
router.post('/contactos/delete/:id', async (req, res) => {
  const { id } = req.params;  // Capturar el ID desde los parámetros de la URL
  console.log(`Eliminando contacto con ID: ${id}`);  // Para depurar

  try {
    // Llamar al método para eliminar el contacto
    const result = await ContactosModel.deleteContactById(id);
    console.log(`Resultado de la eliminación: ${result}`);  // Verificar si se eliminó correctamente

    // Verificar si se eliminó un contacto
    if (result === 0) {
      // Si no se eliminó ningún contacto (ningún contacto con ese ID)
      return res.status(404).json({ success: false, message: 'Contacto no encontrado' });
    }

    // Si la eliminación es exitosa
    res.json({ success: true, message: 'Contacto eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar contacto:', err);  // Registrar el error en consola
    res.status(500).json({ success: false, message: 'Error al eliminar contacto' });
  }
});



// ✅ Función para verificar reCAPTCHA
async function verifyRecaptcha(token, ip) {
  const secretKey = process.env.RECAPTCHA_SECRET;
  if (!secretKey) {
    console.error('⚠️ FALTA LA CLAVE SECRETA DE reCAPTCHA.');
    return false;
  }

  const url = 'https://www.google.com/recaptcha/api/siteverify';
  try {
    const response = await axios.post(url, null, {
      params: {
        secret: secretKey,
        response: token,
        remoteip: ip,
      },
    });

    console.log('Respuesta completa reCAPTCHA:', response.data);
    return response.data.success;
  } catch (err) {
    console.error('❌ Error al verificar reCAPTCHA:', err.message);
    return false;
  }
}

// ✅ Ruta para agregar un contacto
router.post('/contactos/add', csrfProtection, async (req, res) => {
  const { nombre, email, comentario, 'g-recaptcha-response': recaptchaToken } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  console.log('Datos recibidos:', { nombre, email, comentario, recaptchaToken });
  console.log('IP del cliente:', ip);

  if (!nombre || !email || !comentario || !recaptchaToken) {
    return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
  }

  try {
    const captchaValido = await verifyRecaptcha(recaptchaToken, ip);
    if (!captchaValido) {
      return res.status(400).json({ success: false, message: 'Error de verificación de CAPTCHA.' });
    }

    await ContactosModel.addContact({ nombre, email, comentario, ip });
    res.json({ success: true, message: 'Contacto añadido correctamente' });

    // Redirigir a la página de éxito
    res.redirect('/success'); // Cambiado a '/success' en lugar de '/contactos'


  } catch (err) {
    console.error('Error al agregar contacto:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// ✅ Ruta para mostrar la página de éxito (confirmación)
router.get('/success', (req, res) => {
  res.render('success', {
    csrfToken: req.csrfToken(),
  });
});

module.exports = router;
