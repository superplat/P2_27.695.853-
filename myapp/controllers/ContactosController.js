require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');
const ContactosModel = require('../models/ContactosModel');
const db = new ContactosModel();

class ContactosController {
  // Validar reCAPTCHA
  static async validateRecaptcha(token) {
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    const recaptchaURL = `https://www.google.com/recaptcha/api/siteverify`;

    try {
      const response = await axios.post(recaptchaURL, null, {
        params: { secret: recaptchaSecret, response: token },
      });
      return response.data.success;
    } catch (error) {
      console.error('Error al validar reCAPTCHA:', error);
      return false
    }
  }

  // geolocalización  ipapi
  static async getGeolocation(ip) {
    const apiKey = process.env.IPAPI_KEY
    try {
      const geoURL = `https://api.ipapi.com/${ip}?access_key=${apiKey}&format=1`;
      const geoResponse = await axios.get(geoURL);
      return geoResponse.data.country_name || 'Desconocido';
    } catch (error) {
      console.error('Error al obtener geolocalización:', error);
      return 'Desconocido'
    }
  }

  // Enviar notificación por correo
  static async sendNotification({ email, nombre, comentario, ip, country }) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Usuario de correo desde .env
        pass: process.env.EMAIL_PASS,  // Contraseña de correo desde .env
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

    try {
      await transporter.sendMail(mailOptions);
      console.log('Correo enviado correctamente');
    } catch (error) {
      console.error('Error al enviar el correo:', error);
    }
  }

  // Agregar contacto con validaciones
  static async add(req, res) {
    const { email, nombre, comentario, 'g-recaptcha-response': recaptchaResponse } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!email || !nombre || !comentario || !recaptchaResponse) {
      return res.status(400).send('Por favor, completa todos los campos y verifica el captcha.');
    }

    try {
      // Validar reCAPTCHA
      const isRecaptchaValid = await ContactosController.validateRecaptcha(recaptchaResponse);
      if (!isRecaptchaValid) {
        return res.status(400).send('La validación de reCAPTCHA falló.');
      }

      // Obtener geolocalización (país)
      const country = await ContactosController.getGeolocation(ip);

      // Guardar datos en la base de datos
      await db.addContact(email, nombre, comentario, ip, country);

      // Enviar notificación por correo
      await ContactosController.sendNotification({ email, nombre, comentario, ip, country });

      res.redirect('/success'); // Redirigir al éxito
    } catch (error) {
      console.error('Error al procesar el formulario:', error);
      res.status(500).send('Ocurrió un error al procesar tu solicitud.');
    }
  }

  // Recuperar todos los contactos
  static async list(req, res) {
    try {
      const contacts = await db.getContacts();
      res.json(contacts);
    } catch (error) {
      console.error('Error al recuperar los datos:', error);
      res.status(500).send('Error al recuperar los datos.');
    }
  }
}

module.exports = ContactosController;
