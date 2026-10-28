// Producción (ng build, lo que corre Netlify).
// Paso 1 del deploy: la URL que da Render. Si Render te asignó otra
// (ej. hermanas-api-x1y2.onrender.com), cambiala acá.
// Paso final: cuando el dominio funcione, pasar a 'https://api.hermanas.dpdns.org'.
export const environment = {
  apiUrl: 'https://hermanas-api.onrender.com',
  // WhatsApp que recibe los pedidos del carrito (549 + característica sin 0 + número sin 15).
  // Por ahora el de prueba; después va el del local.
  whatsapp: '5492494382000',
};
