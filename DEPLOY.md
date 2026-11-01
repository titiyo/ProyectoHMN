# Deploy: Neon + Render + Netlify + dominio

Orden: **base (Neon) → API (Render) → front (Netlify) → dominio**. Cada paso se prueba
antes de pasar al siguiente. Todo en planes gratis.

> La base de producción arranca vacía: el seed carga las categorías y variedades,
> pero **sin precios ni stock**. Los datos de prueba de tu compu no se suben.

## Estado (01/11/2026)

| Parte    | Servicio | URL / dato | Estado |
|----------|----------|------------|--------|
| Base     | Neon (Postgres 16, AWS US East 1, con pooling) | — | ⚠️ Confirmar que se vació para la Etapa 8 (ver abajo). Si `/catalogo` en producción no muestra las 5 categorías nuevas, falta ese paso |
| API      | Render (Blueprint `render.yaml`) | https://hermanas-api.onrender.com | ✅ `DATABASE_URL`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET`, `FRONT_URL` cargados |
| Front    | Netlify (proyecto `hermanasemprendedoras`) | https://hermanasemprendedoras.netlify.app | ✅ Tienda nueva con carrito (commit adf5c46). Falta mirarla publicada |
| CORS     | Render → `FRONT_URL` | lista separada por comas (ver paso 6) | ⏳ Cambiar a los 3 dominios del front cuando el deploy esté **Live** |
| Fotos    | Cloudinary → Render `CLOUDINARY_URL` | — | ⏳ Falta crear la cuenta y cargar la variable (ver "Fotos de las variedades") |
| WhatsApp | `whatsapp` en `hermanas-web/src/environments/*.ts` | 5492494382000 | ⏳ Es el número de prueba; cambiar por el del local y hacer push |
| Dominio  | DigitalPlat + Cloudflare | https://hermanasemprendedoras.dpdns.org (primario) | ⏳ Registrado, DNS en Cloudflare y Primary domain en Netlify; falta que propaguen los nameservers (paso 6) |

Los pasos 0 a 5 de abajo ya están hechos; quedan como referencia. Lo que cambia la base
(tablas nuevas, columnas) se aplica solo al arrancar la API (`synchronize`); solo hubo que
vaciar Neon en la Etapa 8. La Etapa 9 (tienda/pedidos web/fotos) solo AGREGA tablas y columnas. Los arreglos del 28/10
también: agregan `encargue.retiro` (puede quedar vacío) y cambian la regla de borrado de
`detalle_pedido_web → variedad` (de CASCADE a bloquear). No hace falta vaciar Neon.

---

## Fotos de las variedades (Cloudinary)

Las fotos se suben desde el panel (Configuración → columna "Foto") y se guardan en
Cloudinary, porque el disco gratis de Render se borra en cada deploy. Una sola vez:

1. Crear cuenta gratis en <https://cloudinary.com> (plan Free alcanza de sobra).
2. En el panel de Cloudinary → **Settings → API Keys** → copiar la
   **API environment variable** (empieza con `cloudinary://`). Es secreta.
3. Render → servicio → **Environment** → agregar `CLOUDINARY_URL` con ese valor → **Save**.
4. Para probar en tu compu: la misma línea en `hermanas-api/.env`.

Sin esa variable todo funciona igual; solo el botón "Subir" responde que falta configurarla.

## Etapa 8: vaciar Neon para el modelo nuevo (presentaciones + menú nuevo)

El modelo cambió (precios por presentación, preparadas en encargues, menú nuevo) y
todavía no hay ventas reales, así que se vacía la base y la API la vuelve a crear sola.
**Se pierden los precios y el stock cargados en producción.**

Orden (así nunca corre código nuevo contra tablas viejas):

1. Neon → proyecto → **SQL Editor** → correr:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```
   (Borra todas las tablas. Mientras tanto la API vieja da error: es solo un rato.)
2. Recién ahí, push a `main`. Render redeploya; al arrancar, `synchronize` crea las
   tablas nuevas y el seed carga las 5 categorías del menú con sus presentaciones.
3. Probar `https://hermanas-api.onrender.com/catalogo` → tienen que aparecer
   "Milanesas de soja rellenas", "Tartas integrales", etc.
4. Panel → **Configuración**: cargar los precios de cada presentación y el stock.

Si el push llegó antes de vaciar la base: vaciarla igual (paso 1) y en Render →
**Manual Deploy → Restart service**, para que vuelva a crear las tablas y el seed.

---

## 0. Subir el código

Desde `Documents\hermanas-emprendedoras`:

```
git add -A
git commit -m "Etapa 7: preparar deploy"
git push
```

## 1. Base de datos en Neon

1. Entrar a <https://neon.tech> → **Sign up** con GitHub.
2. **Create project**: nombre `hermanas`, región **AWS US East (N. Virginia)**
   (la misma zona que Render elige abajo, así API y base están cerca).
3. En el panel del proyecto → **Connect** → copiar la **connection string**
   (empieza con `postgresql://` y termina con `?sslmode=require`).
   Es secreta: no la pegues en el código ni en el chat.

## 2. Contraseña real de la vendedora

En `hermanas-api`:

```
npm run hash -- "la-contraseña-real"
```

Copiá el resultado (empieza con `$2b$10$...`). Usá una contraseña distinta a la de desarrollo.

## 3. API en Render

1. Entrar a <https://render.com> → **Sign up** con GitHub.
2. **New → Blueprint** → elegir el repo `ProyectoHMN`. Render lee `render.yaml`.
3. Te pide las variables secretas:
   - `DATABASE_URL` → la connection string de Neon.
   - `ADMIN_PASSWORD_HASH` → el hash del paso 2.
   - `FRONT_URL` → `https://hermanasemprendedoras.netlify.app` (se puede cargar después, paso 5).
   - `JWT_SECRET` lo genera Render solo.
4. **Apply**. El primer build tarda unos minutos (ver **Logs**).
5. Copiá la URL del servicio (arriba a la izquierda), ej. `https://hermanas-api.onrender.com`.
6. Probala en el navegador: `https://TU-URL/catalogo` → tiene que mostrar las variedades.

**Si la URL no es exactamente `https://hermanas-api.onrender.com`**: cambiala en
`hermanas-web/src/environments/environment.ts`, y commit + push.

## 4. Front en Netlify

1. Entrar a <https://netlify.com> → **Sign up** con GitHub.
2. **Add new site → Import an existing project → GitHub** → `ProyectoHMN`.
3. Netlify lee `netlify.toml` (carpeta, comando y publicación ya están): **Deploy**.
4. **Site configuration → Change site name** → `hermanasemprendedoras`
   → queda `https://hermanasemprendedoras.netlify.app`.

## 5. Conectar front y API

1. Render → servicio → **Environment** → `FRONT_URL` =
   `https://hermanasemprendedoras.netlify.app` (sin barra final) → **Save** (la API se reinicia).
2. Probar en `https://hermanasemprendedoras.netlify.app`:
   - El catálogo carga.
   - El link **Acceso** del pie del catálogo (o `/login`) con usuario `hermanas` y la contraseña real → entra al panel.
   - **Configuración**: cargar los precios. **Stock**: cargar las cantidades.
3. Postman: cambiar la variable `baseUrl` a la URL de Render.

## 6. Dominio (DigitalPlat + Cloudflare)

Dominio: **`hermanasemprendedoras.dpdns.org`** (DigitalPlat, gratis).

Dominios del front:

- https://hermanasemprendedoras.dpdns.org → **primario** (Primary domain en Netlify)
- https://www.hermanasemprendedoras.dpdns.org → redirige al primario
- https://hermanasemprendedoras.netlify.app → Netlify lo redirige al primario cuando el dominio esté activo

Pasos (1 a 4 ya hechos el 01/11; falta que propaguen los nameservers):

1. DigitalPlat (digitalplat.org) → registrar `hermanasemprendedoras.dpdns.org`.
2. <https://dash.cloudflare.com> → **Add a domain** → plan **Free** → Cloudflare da **dos
   nameservers** → pegarlos en DigitalPlat. Puede tardar hasta que Cloudflare diga **Active**.
3. Cloudflare → **DNS → Records**, todos con **Proxy status: DNS only** (nube gris; si queda
   naranja, Netlify y Render no pueden emitir el certificado HTTPS):

   | Tipo  | Nombre | Destino                             |
   |-------|--------|-------------------------------------|
   | CNAME | `@`    | `hermanasemprendedoras.netlify.app` |
   | CNAME | `www`  | `hermanasemprendedoras.netlify.app` |
   | CNAME | `api`  | `hermanas-api.onrender.com`         |

4. Netlify → **Domain management** → `hermanasemprendedoras.dpdns.org` como **Primary domain**
   (Netlify suma `www` solo y lo redirige). Esperar el certificado HTTPS.
5. **CORS**: cuando el deploy de la API esté **Live**, Render → **Environment** → `FRONT_URL` =

   ```
   https://hermanasemprendedoras.netlify.app,https://hermanasemprendedoras.dpdns.org,https://www.hermanasemprendedoras.dpdns.org
   ```

   Formato de `FRONT_URL`: lista separada por comas. A cada valor se le hace trim y se le
   saca la barra final; los vacíos se ignoran. Si está vacía, la API acepta cualquier origen
   (solo para desarrollo). Un dominio que no está en la lista queda bloqueado por el navegador.
6. Opcional, más adelante: API en `api.hermanasemprendedoras.dpdns.org`. Render → **Settings →
   Custom Domains** → agregarlo y esperar el certificado; después cambiar `apiUrl` en
   `hermanas-web/src/environments/environment.ts` y hacer push. Mientras tanto el front sigue
   usando `https://hermanas-api.onrender.com`, que funciona igual.

---

## A tener en cuenta

- **Render gratis se duerme** a los 15 minutos sin uso: el primer pedido tarda 30–60 s.
  El front lo avisa ("esperá un minuto y probá de nuevo").
- **Cada push a `main` redeploya** la API y el front automáticamente.
- **`synchronize: true`** crea/ajusta las tablas al arrancar. Antes de **renombrar o borrar**
  un campo de una entidad, pensalo: TypeORM puede borrar esa columna y sus datos en Neon.
- **Cambiar la contraseña**: `npm run hash -- "nueva"` → Render → `ADMIN_PASSWORD_HASH` → Save.
- El subdominio de DigitalPlat es gratis y sirve para la web; no sirve para mail.
