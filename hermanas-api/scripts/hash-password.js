// Genera el hash bcrypt de una contraseña para ponerlo en ADMIN_PASSWORD_HASH.
// Uso:  npm run hash -- "la-contraseña"
const { hashSync } = require('bcryptjs');

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('Uso: npm run hash -- "contraseña" (mínimo 8 caracteres)');
  process.exit(1);
}
// 10 = "costo": cuántas vueltas hace bcrypt. Más alto = más lento de adivinar por fuerza bruta.
console.log(hashSync(password, 10));
