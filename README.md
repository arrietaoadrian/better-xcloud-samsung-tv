# Better xCloud para Samsung TV (Tizen)

AplicaciÃ³n **Tizen (`.wgt`)** que abre **Xbox Cloud Gaming** (`xbox.com/<regiÃ³n>/play`) dentro de la TV e inyecta el userscript de [Better xCloud](https://github.com/redphx/better-xcloud) **antes** de que se ejecute cualquier script de Xbox.

Pensada para TVs Samsung que **no** tienen inyecciÃ³n de userscripts nativa (a diferencia de webOS). Se instala con [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung), que firma e instala el paquete.

> Proyecto no oficial. Sin relaciÃ³n con Microsoft/Xbox. Better xCloud es de [redphx](https://github.com/redphx/better-xcloud) (licencia MIT).

---

## Descarga e instalaciÃ³n

1. Descarga el `.wgt` desde [Releases](../../releases/latest).
2. Abre **Apps2Samsung** y conecta la TV (modo desarrollador activo).
3. Selecciona **instalar app propia / archivo `.wgt`** y elige `Better-xCloud-TV.wgt`.
4. Apps2Samsung firma el paquete con tu cuenta Samsung e instala la app.
5. En la TV aparecerÃ¡ como **Better xCloud**.

## Uso

- La app descarga la pÃ¡gina de Xbox, la reescribe en su propia ventana e inyecta Better xCloud en el `<head>`.
- Muestra el aviso **"Better xCloud X.Y.Z activo"** cuando la inyecciÃ³n tuvo Ã©xito.
- Si aparece la pantalla de **inicio de sesiÃ³n de Microsoft**, inicia sesiÃ³n normalmente y, al volver a la biblioteca de juegos, pulsa **ROJO** para recargar con Better xCloud inyectado (la sesiÃ³n queda guardada).
- Si sale el aviso *"Pulsa una tecla del control"*, pulsa **OK**: es el permiso de ventana de Tizen (`window.open` requiere interacciÃ³n).

### Teclas

| Tecla | AcciÃ³n |
| --- | --- |
| ROJO / AZUL / CANAL+ | Recargar (reinyectar Better xCloud) |
| EXIT / CANALâˆ’ | Salir de la app |

## CÃ³mo funciona

```
index.html + app.js          (loader, fullscreen)
        â”‚
        â”œâ”€ XHR  better-xcloud.user.js   (local, con fallback a jsDelivr)
        â”œâ”€ XHR  https://www.xbox.com/<regiÃ³n>/play   (con cookies, sigue redirecciones)
        â”‚        â””â”€ prueba es-MX y luego pt-BR si la regiÃ³n no estÃ¡ soportada
        â”‚
        â””â”€ window.open('about:blank') + document.write(
                <base href="URL final de Xbox">
                <script> preÃ¡mbulo (teclas, toast, historial) </script>
                <script> better-xcloud.user.js </script>
                â€¦HTML originalâ€¦
           )
```

Detalles relevantes del preÃ¡mbulo:

- `<base href>` apunta a la URL real para que los recursos relativos resuelvan a `xbox.com`.
- `history.pushState` / `replaceState` se envuelven para relativizar URLs absolutas de Xbox y evitar `SecurityError` (el documento vive en el origen `tizen://`).
- `window.BX_FLAGS.DeviceInfo.deviceType = "tv"` para activar la UI amigable con control.
- Las teclas se registran con `tizen.tvinputdevice` y se comunican al loader por `postMessage`.

## Limitaciones conocidas

- Es la tÃ©cnica de *fetch + document.write* usada por los `.wgt` del catÃ¡logo de Apps2Samsung (p. ej. TizenTube). Funciona, pero Xbox es una SPA autenticada: el login puede requerir recargar (tecla ROJO) y depende de que Tizen permita cookies de terceros desde el origen de la app.
- Microsoft estÃ¡ desplegando una app nueva ("Play XBOX", Next.js) en algunas regiones; Better xCloud solo parchea la app clÃ¡sica (`gamepass-app-version`). Si la regiÃ³n devuelve la app nueva, Better xCloud no tendrÃ¡ efecto.
- Alternativa mÃ¡s robusta y ya probada en Tizen: **TizenBrew** + mÃ³dulo `tizenbrew-better-xcloud` (inyecciÃ³n por DevTools en el origen real de Xbox).

## Estructura

```
config.xml               manifiesto Tizen (id BxCl0udApp.BetterXcloud)
index.html               pantalla de carga
app.js                   lÃ³gica del loader
better-xcloud.user.js    userscript empaquetado (MIT, redphx)
icon.png                 512Ã—512
```

Para reconstruir el `.wgt`: comprimir el contenido de esta carpeta en un ZIP con `config.xml` en la raÃ­z y renombrarlo a `.wgt`.

## CrÃ©ditos y licencia

- Better xCloud Â© [redphx](https://github.com/redphx/better-xcloud) â€” MIT.
- TÃ©cnica de carga adaptada de [no-cover/youtube-dummy](https://github.com/no-cover/youtube-dummy).
- Este proyecto: MIT (ver `LICENSE`).

