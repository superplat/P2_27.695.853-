// public/js/contactForm.js

$(document).ready(function () {
  const contactForm = $('#contactForm');

  if (contactForm.length) {
    contactForm.submit(function (event) {
      event.preventDefault(); // Evitar el comportamiento por defecto del formulario

      // Obtener el token CSRF desde el meta tag
      const csrfToken = $('meta[name="csrf-token"]').attr('content');

      // Obtener los valores del formulario
      const formData = {
        email: $('#email').val(),
        nombre: $('#nombre').val(),
        comentario: $('#comentario').val(),
      };

      // Verificar que todos los campos estén completos
      if (!formData.email || !formData.nombre || !formData.comentario) {
        alert('Por favor, completa todos los campos.');
        return;
      }

      // Enviar los datos usando AJAX
      $.ajax({
        url: '/add_contact',
        type: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken, // Usar el token CSRF recuperado
        },
        data: formData,
        success: function (response) {
          alert('Contacto enviado exitosamente.');
          window.location.href = '/success'; // Redirige en caso de éxito
        },
        error: function (error) {
          alert('Ocurrió un error al enviar el contacto.');
          console.error('Error:', error);
        },
      });
    });
  }
});