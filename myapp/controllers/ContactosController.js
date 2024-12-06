const ContactosModel = require('../models/ContactosModel');
const db = new ContactosModel();

class ContactosController {
  // Método para agregar un nuevo contacto
  static async add(req, res) {
    const { email, nombre, comentario } = req.body;
    const ip = req.ip; // Dirección IP del usuario

    // Validar los datos del formulario
    if (!email || !nombre || !comentario) {
      return res.status(400).send('Por favor, completa todos los campos.');
    }

    try {
      await db.addContact(email, nombre, comentario, ip);
      res.redirect('/success'); // Redirigir a la página de confirmación
    } catch (error) {
      console.error(error);
      res.status(500).send('Error al guardar los datos.');
    }
  }

  // Método para recuperar todos los contactos
  static async list(req, res) {
    try {
      const contacts = await db.getContacts();
      res.json(contacts); // Devolver los datos en formato JSON
    } catch (error) {
      console.error(error);
      res.status(500).send('Error al recuperar los datos.');
    }
  }
}

module.exports = ContactosController;
