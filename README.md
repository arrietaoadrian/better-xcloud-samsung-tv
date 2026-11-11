# Better xCloud para Samsung TV (Tizen)

Aplicación **Tizen (`.wgt`)** que abre **Xbox Cloud Gaming** (`xbox.com/<región>/play`) dentro de la TV e inyecta el userscript de [Better xCloud](https://github.com/redphx/better-xcloud) **antes** de que se ejecute cualquier script de Xbox.

Pensada para TVs Samsung que **no** tienen inyección de userscripts nativa (a diferencia de webOS). Se instala con [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung), que firma e instala el paquete.

> Proyecto no oficial. Sin relación con Microsoft/Xbox. Better xCloud es de [redphx](https://github.com/redphx/better-xcloud) (licencia MIT).

---

## Descarga e instalación

1. Descarga el `.wgt` desde [Releases](../../releases/latest).
2. Abre **Apps2Samsung** y conecta la TV (modo desarrollador activo).
3. Selecciona **instalar app propia / archivo `.wgt`** y elige `Better-xCloud-TV.wgt`.
4. Apps2Samsung firma el paquete con tu cuenta Samsung e instala la app.
5. En la TV aparecerá como **Better xCloud**.

## Uso

- La app descarga la página de Xbox, la reescribe en su propia ventana e inyecta Better xCloud en el `<head>`.
- Muestra el aviso **"Better xCloud X.Y.Z activo"** cuando la inyección tuvo éxito.
- Si aparece la pantalla de **inicio de sesión de Microsoft**, inicia sesión normalmente y, al volver a la biblioteca de juegos, pulsa **ROJO** para recargar con Better xCloud inyectado (la sesión queda guardada).
- Si sale el aviso *"Pulsa una tecla del control"*, pulsa **OK**: es el permiso de ventana de Tizen (`window.open` requiere interacción).

### Teclas

| Tecla | Acción |
| --- | --- |
| ROJO / AZUL / CANAL+ | Recargar (reinyectar Better xCloud) |
| EXIT / CANAL− | Salir de la app |

## Cómo funciona

```
index.html + app.js          (loader, fullscreen)
        │
        ├─ XHR  better-xcloud.user.js   (local, con fallback a jsDelivr)
        ├─ XHR  https://www.xbox.com/<región>/play   (con cookies, sigue redirecciones)
        │        └─ prueba es-MX y luego pt-BR si la región no está soportada
        │
        └─ window.open('about:blank') + document.write(
                <base href="URL final de Xbox">
                <script> preámbulo (teclas, toast, historial) </script>
                <script> better-xcloud.user.js </script>
                …HTML original…
           )
```

Detalles relevantes del preámbulo:

- `<base href>` apunta a la URL real para que los recursos relativos resuelvan a `xbox.com`.
- `history.pushState` / `replaceState` se envuelven para relativizar URLs absolutas de Xbox y evitar `SecurityError` (el documento vive en el origen `tizen://`).
- `window.BX_FLAGS.DeviceInfo.deviceType = "tv"` para activar la UI amigable con control.
- Las teclas se registran con `tizen.tvinputdevice` y se comunican al loader por `postMessage`.

## Limitaciones conocidas

- Es la técnica de *fetch + document.write* usada por los `.wgt` del catálogo de Apps2Samsung (p. ej. TizenTube). Funciona, pero Xbox es una SPA autenticada: el login puede requerir recargar (tecla ROJO) y depende de que Tizen permita cookies de terceros desde el origen de la app.
- Microsoft está desplegando una app nueva ("Play XBOX", Next.js) en algunas regiones; Better xCloud solo parchea la app clásica (`gamepass-app-version`). Si la región devuelve la app nueva, Better xCloud no tendrá efecto.
- Alternativa más robusta y ya probada en Tizen: **TizenBrew** + módulo `tizenbrew-better-xcloud` (inyección por DevTools en el origen real de Xbox).

## Estructura

```
config.xml               manifiesto Tizen (id BxCl0udApp.BetterXcloud)
index.html               pantalla de carga
app.js                   lógica del loader
better-xcloud.user.js    userscript empaquetado (MIT, redphx)
icon.png                 512×512
```

Para reconstruir el `.wgt`: comprimir el contenido de esta carpeta en un ZIP con `config.xml` en la raíz y renombrarlo a `.wgt`.

## Créditos y licencia

- Better xCloud © [redphx](https://github.com/redphx/better-xcloud) — MIT.
- Técnica de carga adaptada de [no-cover/youtube-dummy](https://github.com/no-cover/youtube-dummy).
- Este proyecto: MIT (ver `LICENSE`).
