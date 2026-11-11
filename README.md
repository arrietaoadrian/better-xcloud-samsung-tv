# Better xCloud para Samsung TV (Tizen)

Dos formas de tener **Xbox Cloud Gaming + Better xCloud** en una TV Samsung, pensadas
para regiones donde Xbox Cloud está restringido (p. ej. Colombia):

| Forma | Qué obtienes | Cómo se instala |
| --- | --- | --- |
| **Módulo TizenBrew** (recomendado) | Better xCloud inyectado en el origen real + **bypass de región a Estados Unidos** + menú completo (servidor, bitrate, resolución, idioma…) | desde TizenBrew, con la URL de este repo |
| **App `.wgt`** | lanzador que abre Xbox Cloud Gaming a pantalla completa | con Apps2Samsung (firma el paquete) |

> Proyecto no oficial. Sin relación con Microsoft/Xbox. Better xCloud es de
> [redphx](https://github.com/redphx/better-xcloud) (MIT).

---

## 1. Módulo TizenBrew (el que sí arregla la región)

Requisito: TV con [TizenBrew](https://github.com/reisxd/TizenBrew) y modo desarrollador.

1. TizenBrew → **Modules**
2. Añadir módulo con:
   ```
   https://github.com/arrietaoadrian/better-xcloud-samsung-tv
   ```
3. Instalar. Aparece como **Better xCloud (region US)**.
4. Desactiva/elimina el módulo `marcusvitalesilva-dot/tizenbrew-better-xcloud` para evitar conflictos.
5. Abre el módulo, inicia sesión en Microsoft y entra por **Biblioteca → Fortnite**.

Qué hace el módulo:

1. Inyecta el userscript **antes** de cualquier script de Xbox
   (`Page.addScriptToEvaluateOnNewDocument` vía DevTools local del TizenBrew).
2. Fuerza `FORCE_REDIRECT_PRODUCTION_ORIGIN = false` interceptando `window.env`, para que
   la app clásica (la única que Better xCloud puede parchear) no salte a `play.xbox.com`.
3. Bloquea navegaciones a `play.xbox.com` (clics y `location.assign/replace`).
4. Preconfigura `BetterXcloud.server.bypassRestriction = "us"`: las peticiones a xCloud
   salen con `X-Forwarded-For` de un nodo de EE. UU. (`143.244.47.65`), lo que habilita
   el botón **Jugar** aunque la cuenta esté en Colombia.
5. Marca `BX_FLAGS.DeviceInfo.deviceType = "tv"` para la UI con control remoto.

En el menú de Better xCloud (botón flotante / ⚙): **Server → Bypass region restriction**
ya viene en **United States**. Ahí también puedes cambiar servidor, bitrate, resolución e
idioma del stream, igual que en Android.

### Archivos del módulo

```
package.json     manifiesto TizenBrew (main: bx-wrapper.js, serviceFile: service.js)
bx-wrapper.js    prefijo interceptor + better-xcloud.user.js 6.7.13
service.js       servicio DevTools que inyecta el script al inicio de cada documento
```

`service.js` existe porque TizenBrew 2.0.5 no consigue inyectar con
`evaluateScriptOnDocumentStart`; el servicio descubre el puerto de depuración leyendo
`/proc/net/tcp` y usa CDP directamente.

---

## 2. App `.wgt` (lanzador)

1. Descarga el `.wgt` desde [Releases](../../releases/latest).
2. Abre **Apps2Samsung**, conecta la TV (modo desarrollador activo).
3. Instala app propia → elige `Better-xCloud-TV.wgt`. Apps2Samsung lo firma con tu cuenta Samsung.
4. En la TV aparece como **Better xCloud**.

Comportamiento:

- Descarga `https://www.xbox.com/<región>/play` (prueba `es-MX`, `pt-BR`, `en-US`…).
- Si Xbox sirve la **app clásica** → la reescribe en su ventana e inyecta Better xCloud.
- Si sirve la **app nueva** (`play.xbox.com`) → abre directamente
  `https://play.xbox.com/library`.

**Teclas:** ROJO / AZUL / CANAL+ = recargar · EXIT / CANAL− = salir.

### Limitación real del `.wgt`

Un widget Tizen **no puede inyectar código en un origen ajeno**: la única vía es
`fetch` + `document.write`, y la app clásica de Xbox detecta que vive en otro documento y
responde **404** ("No se encontró la página. Código de error…"). Por eso el `.wgt` es solo
un lanzador, y el bypass de región / menú de Better xCloud se consigue con el módulo de
TizenBrew.

---

## Cómo se construye el `.wgt`

Comprimir el contenido de esta carpeta en un ZIP con `config.xml` en la raíz y renombrarlo
a `.wgt` (los archivos del módulo TizenBrew pueden quedarse; el widget ignora lo que no
aparece en `config.xml`).

## Créditos y licencia

- Better xCloud © [redphx](https://github.com/redphx/better-xcloud) — MIT.
- Servicio DevTools adaptado de [marcusvitalesilva-dot/tizenbrew-better-xcloud](https://github.com/marcusvitalesilva-dot/tizenbrew-better-xcloud) — MIT.
- Técnica de carga del `.wgt` adaptada de [no-cover/youtube-dummy](https://github.com/no-cover/youtube-dummy).
- Este proyecto: MIT (ver `LICENSE`).
