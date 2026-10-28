# Progreso — ProyectoHMN (Hermanas Emprendedoras)

Estado al **28/10/2026**. Este archivo resume TODO lo hecho para retomar sin el historial
de la conversación. El deploy está en [DEPLOY.md](DEPLOY.md).

## Qué es

Web de stock, ventas y encargues de milanesas para Hermanas Emprendedoras (Tandil),
con tienda pública y carrito que manda el pedido por WhatsApp.

- Repo único: https://github.com/titiyo/ProyectoHMN (rama `main`, cada push redeploya).
- `hermanas-api/` → NestJS 11 + TypeORM 0.3 + PostgreSQL 16 (Render + Neon).
- `hermanas-web/` → Angular 22 standalone, signals, Bootstrap 5 + SCSS (Netlify).
- Producción: front https://hermanasemprendedoras.netlify.app · API https://hermanas-api.onrender.com

## Cómo trabajamos (acordado)

- El estudiante (benja) es el responsable; Claude escribe el código pero **explica cada parte
  nueva y muestra opciones antes de decisiones de diseño**. Respuestas en **castellano**.
- Estilo del TP de Tecnologías Web: validaciones manuales en el controller (400/404/409),
  sin class-validator; comentarios en castellano donde ayudan.
- Probar en local antes de cada push; un push por tanda para no gastar deploys de Netlify.
- **Nunca hacer commit ni push sin preguntar antes.** Se deja el código listo y se le pregunta
  a benja si quiere que se commitee/pushee.
- Antes de empezar: `git pull` (a veces se edita el README desde GitHub).

## Correr en local

1. Docker Desktop abierto (está en `%LOCALAPPDATA%\Programs\DockerDesktop`).
2. `cd hermanas-api` → `docker compose up -d` (Postgres en **5435**, Adminer en **8085**).
3. `npm run start:dev` (API en 3000). Lee `hermanas-api/.env` (no se sube a GitHub).
4. `cd hermanas-web` → `npx ng serve` (http://localhost:4200).
5. Login del panel: usuario `hermanas`, contraseña de desarrollo anotada en un comentario de
   `hermanas-api/.env`. Cambiarla: `npm run hash -- "nueva"` y pegar en `ADMIN_PASSWORD_HASH`.
6. Base local limpia: `docker exec hermanas-postgres psql -U postgres -d hermanas -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"` y reiniciar la API (crea tablas + seed).

## Etapas hechas (commits en `main`)

| # | Qué | Commit |
|---|-----|--------|
| 1 | Backend base: Categoría/Variedad, CRUD, ajuste de stock con delta, seed, Postman | ebef92e |
| 2 | Ventas con transacción, precio efectivo, historial por fecha, anular | 1c71320 |
| 3 | Encargues (pendiente ⇄ listo → entregado), "Por hacer" (GROUP BY), faltantes | 837e990 |
| 4 | Panel Angular (tablero, stock, nueva venta, ventas, encargues, por hacer, config) | 748dc70 |
| 5 | Catálogo público (`GET /catalogo`, nunca expone stock) | 1137b3f |
| 6 | Login JWT 7 días, guard global con `@Public()`, interceptor | d106c96 |
| 7 | Deploy: render.yaml, netlify.toml, CORS por `FRONT_URL`, DEPLOY.md | 234d3d8 / fad0dc1 |
| 8 | Presentaciones (unidad/docena/entera/porción…), por encargue configurable, reservar o mandar a hacer, menú nuevo | 2365f63 |
| — | Arreglos de la revisión: anular/cancelar atómicos (FOR UPDATE + filas borradas), filtro 409 por UNIQUE, seed en transacción, precio > 0 | f4da08a |
| 9 | Tienda nueva + carrito por WhatsApp + Pedidos web + fotos (Cloudinary) + rediseño del panel | adf5c46 |
| — | Configuración más compacta; PROGRESO.md; estado en DEPLOY.md | **sin commitear** (pedir permiso antes) |
| — | Bugs de la prueba 28/10: (1) el carrito registraba productos viejos del navegador y la API rechazaba el pedido; (2) el encargue guarda `retiro` (día y horario); (3) no se puede borrar una variedad que está en un pedido web (antes lo vaciaba); (4) "Pasar a encargue" frena si el pedido quedó vacío o la variedad cambió de categoría | **sin commitear** |

## Modelo de datos (resumen)

- `Categoria` (nombre, porEncargue, nota) 1─N `Presentacion` (nombre, unidades, precio?, orden).
- `Variedad` (nombre, categoría, stock en la unidad más chica, porEncargue? = hereda si null,
  visible, foto?) 1─N `PrecioVariedad` (precio propio por presentación).
- `Venta` / `DetalleVenta` (copia de presentación, unidades y precio; `encargueId` si salió de un encargue).
- `Encargue` (cliente, teléfono, `retiro?` texto libre) / `DetalleEncargue` (cantidad en unidades, `cantidadPreparada` = reservadas del stock,
  copia de unidades por presentación).
- `PedidoWeb` / `DetallePedidoWeb` (estado nuevo/encargue/descartado) y `Ajuste` (clave/valor,
  `recibirPedidosWeb`).
- Precio efectivo = propio de la variedad ?? el de la presentación. Por encargue = variedad ?? categoría.

## Reglas importantes

- Venta: si todo alcanza → venta normal. Si algo no alcanza o es por encargue → TODO el pedido
  pasa a encargue y hay que elegir `faltante: "reservar"` (descuenta lo que hay como preparado)
  o `"hacer"` (no toca stock). Sin elegir → 409.
- "listo" = todo preparado. Cancelar devuelve al stock: pendiente → las reservadas; listo → todo.
- Entregar genera la venta con precios del momento, sin tocar stock.
- Stock: todo con transacción y bloqueo de filas (`FOR UPDATE`, en orden de id).
- Pedidos web: endpoint público con anti-spam (5 cada 10 min por IP, campo trampa `web`);
  nombres/precios siempre desde la base; "Pasar a encargue" con bloqueo (no duplica).

## Tienda (hermanas-web/src/app/tienda)

- `/` portada (logo, cómo funciona, franja por categoría con "Ver más", disponibles primero).
- `/:slug` página de categoría (ej. `/tartas-integrales`), filtro "Disponibles hoy".
- Carrito en `localStorage` (`hermanas_carrito`); pide nombre, día, horario (sábado solo mañana),
  teléfono opcional; abre `wa.me/<environment.whatsapp>` y registra el pedido en el panel.
- Agotadas se pueden pedir como "a preguntar". Link "Acceso" al panel en el pie.

## Pendiente / próximos pasos

- [ ] Ver la tienda y el panel publicados después del deploy de adf5c46.
- [ ] Confirmar que Neon se vació para la Etapa 8 (ver DEPLOY.md).
- [ ] Cloudinary: crear cuenta y cargar `CLOUDINARY_URL` en Render (y en `.env` local) → subir fotos.
- [ ] Cambiar el WhatsApp de prueba (5492494382000) por el del local.
- [ ] Cargar precios y stock reales desde Configuración.
- [ ] Dominio DigitalPlat + Cloudflare (DEPLOY.md, paso 6).
- [ ] Bugs de la revisión dejados para después: #5 migraciones en vez de `synchronize`,
      #7 cambiar de categoría una variedad con encargues pendientes, #11 tartas "Disponible"
      con menos de una entera, #13 paginar el historial de ventas.
- [ ] Menores (prueba 28/10): un pedido web rechazado igual cuenta para el límite de 5;
      "Hoy" en el carrito ofrece horarios que ya pasaron.
- [ ] Más adelante: envíos a domicilio (el pedido web ya tiene campo `entrega`).

## Referencias

- Plan original: `Plan App de stock y ventas – Hermanas Emprendedoras.pdf` (Descargas).
- Maqueta aprobada de la tienda: https://claude.ai/artifact/CuDLFiUKwU6xWnX3K3WwhL
- Postman: `hermanas-api/postman/hermanas-api.postman_collection.json` (Auth > Login primero).
