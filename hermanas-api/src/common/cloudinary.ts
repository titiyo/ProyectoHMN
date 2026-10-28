import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'crypto';

// Subida de fotos a Cloudinary (plan gratis) usando su API REST, sin librerías.
// Configuración: variable CLOUDINARY_URL = cloudinary://<api_key>:<api_secret>@<cloud_name>
// (la copiás tal cual del panel de Cloudinary, "API Keys").
// Las fotos NO se guardan en Render porque su disco gratis se borra en cada deploy.

const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FOTO_BYTES = 5 * 1024 * 1024; // 5 MB

function credenciales() {
  const url = process.env.CLOUDINARY_URL;
  const m = url && /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url);
  if (!m) {
    throw new ServiceUnavailableException(
      'La subida de fotos no está configurada (falta CLOUDINARY_URL).',
    );
  }
  return { apiKey: m[1], apiSecret: m[2], cloud: m[3] };
}

export async function subirFoto(archivo: { buffer: Buffer; mimetype: string; size: number }) {
  if (!TIPOS.includes(archivo.mimetype)) {
    throw new BadRequestException('La foto tiene que ser JPG, PNG o WEBP.');
  }
  if (archivo.size > MAX_FOTO_BYTES) {
    throw new BadRequestException('La foto no puede pesar más de 5 MB.');
  }
  const { apiKey, apiSecret, cloud } = credenciales();

  // Firma: SHA-1 de los parámetros ordenados + el secreto. Así Cloudinary sabe que la
  // subida la autorizamos nosotros, sin mandar nunca el secreto.
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'hermanas';
  const firma = createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex');

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(archivo.buffer)], { type: archivo.mimetype }));
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', firma);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const json = (await res.json()) as { secure_url?: string; error?: { message: string } };
  if (!res.ok || !json.secure_url) {
    throw new ServiceUnavailableException(
      `No se pudo subir la foto: ${json.error?.message ?? res.status}`,
    );
  }
  // Pedimos a Cloudinary una versión recortada a 4:3, 800 px y con formato/calidad
  // automáticos: pesa mucho menos y todas las tarjetas quedan del mismo tamaño.
  return json.secure_url.replace('/upload/', '/upload/c_fill,ar_4:3,w_800,q_auto,f_auto/');
}
