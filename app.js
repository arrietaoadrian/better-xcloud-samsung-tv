/* Better xCloud para Samsung TV (Tizen)
 * Carga xbox.com/<region>/play dentro de esta app e inyecta el userscript
 * de Better xCloud antes que cualquier script de la pagina.
 */
(function () {
  'use strict';

  var WIN_NAME = 'bxcloud';
  var WIN_FEATURES = 'scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no';
  var LOCAL_SCRIPT = 'better-xcloud.user.js';
  var REMOTE_SCRIPT = 'https://cdn.jsdelivr.net/gh/redphx/better-xcloud@latest/dist/better-xcloud.user.js';
  var REGIONS = ['es-MX', 'pt-BR'];
  var LS_REGION = 'bxtv.region';

  var elStatus = document.getElementById('status');
  var elSub = document.getElementById('sub');
  var elSpin = document.getElementById('spinner');
  var elHint = document.getElementById('hint');

  var child = null;
  var bxSrc = null;
  var bxVersion = '';
  var pageInfo = null;
  var pendingDoc = null;
  var busy = false;
  var closing = false;

  var DEV = /[?&]dev=1/.test(location.search);
  var PLAY_URL = 'https://play.xbox.com/library';

  function setStatus(a, b) {
    if (elStatus) elStatus.textContent = a || '';
    if (elSub) elSub.textContent = b || '';
  }

  function showSpinner(v) {
    if (elSpin) elSpin.style.display = v ? 'block' : 'none';
  }

  function fail(a, b) {
    showSpinner(false);
    setStatus(a, b || 'Pulsa ROJO en el control para reintentar.');
  }

  function log(m) {
    try { console.log('[bx-tv] ' + m); } catch (e) { /* noop */ }
  }

  /* ------------------------------- red ------------------------------- */

  function request(url, opts) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var x = new XMLHttpRequest();

      function ok(v) { if (!done) { done = true; resolve(v); } }
      function no(e) { if (!done) { done = true; reject(e instanceof Error ? e : new Error(String(e))); } }

      try {
        x.open('GET', url, true);
      } catch (e) {
        return no(e);
      }
      if (opts && opts.credentials) x.withCredentials = true;
      if (opts && opts.headers) {
        Object.keys(opts.headers).forEach(function (k) {
          try { x.setRequestHeader(k, opts.headers[k]); } catch (e) { /* noop */ }
        });
      }
      x.onload = function () {
        if (x.status === 200 || x.status === 0) ok({ text: x.responseText, url: x.responseURL || url });
        else no(new Error('HTTP ' + x.status));
      };
      x.onerror = function () { no(new Error('Error de red')); };
      x.ontimeout = function () { no(new Error('Tiempo agotado')); };
      try {
        x.send();
      } catch (e) {
        no(e);
      }
    });
  }

  function loadScriptSource() {
    return request(LOCAL_SCRIPT).then(function (r) {
      var t = r.text || '';
      if (t.length < 5000) throw new Error('script local vacio');
      return t;
    }).catch(function (e) {
      log('script local no disponible (' + e.message + '), usando CDN');
      setStatus('Descargando Better xCloud', 'desde Internet...');
      return request(REMOTE_SCRIPT).then(function (r) {
        if (!r.text || r.text.length < 5000) throw new Error('script remoto vacio');
        return r.text;
      });
    });
  }

  function versionOf(t) {
    var m = /@version\s+([0-9][0-9.]*)/.exec(t || '');
    return m ? m[1] : '';
  }

  /* La app clasica de xbox.com (parcheable por Better xCloud) lleva este meta.
     Si no aparece, es la app nueva "Play XBOX" (play.xbox.com): no se puede
     parchear, asi que se abre la URL real y listo. */
  function isClassicApp(html) {
    return /gamepass-app-version/.test(html || '');
  }

  /* ----------------------------- pagina ------------------------------ */

  function looksUnsupported(html) {
    return /UnsupportedMarketPage|determinadas regiones|not available in your region|isn.t available in your region/i.test(html);
  }

  function fetchRegion(url) {
    var headers = { 'Accept': 'text/html,application/xhtml+xml' };
    function ok(r) {
      if (!r || !r.text || r.text.length < 5000) throw new Error('respuesta vacia');
      return { html: r.text, url: r.url || url };
    }
    return request(url, { credentials: true, headers: headers }).then(function (r) {
      if (isClassicApp(r.text)) return ok(r);
      /* Con cookies, xbox.com suele devolver la app nueva. Sin cookies sirve
         la app clasica (la que Better xCloud puede parchear). */
      return request(url, { headers: headers }).then(function (r2) {
        if (isClassicApp(r2.text)) return ok(r2);
        return ok(r);
      }, function () { return ok(r); });
    });
  }

  function fetchPage() {
    if (DEV) {
      return request('page-dev.html').then(function (r) {
        return { html: r.text, url: 'https://www.xbox.com/es-MX/play' };
      });
    }

    var saved = null;
    try { saved = localStorage.getItem(LS_REGION); } catch (e) { /* noop */ }

    var list = [];
    if (saved) list.push(saved);
    REGIONS.forEach(function (r) { if (list.indexOf(r) < 0) list.push(r); });

    var i = 0;
    var fallback = null;

    function remember(region) {
      try { localStorage.setItem(LS_REGION, region); } catch (e) { /* noop */ }
    }

    function next() {
      if (i >= list.length) {
        return Promise.resolve(fallback || { html: '', url: 'https://play.xbox.com/library' });
      }
      var region = list[i++];
      var url = 'https://www.xbox.com/' + region + '/play';
      setStatus('Conectando con Xbox Cloud Gaming', url);
      return fetchRegion(url).then(function (p) {
        if (isClassicApp(p.html)) {
          remember(region);
          return p;
        }
        if (looksUnsupported(p.html)) {
          log('region no soportada: ' + region);
          return next();
        }
        if (!fallback) fallback = p;
        return next();
      }, function (e) {
        log('fallo ' + region + ': ' + e.message);
        return next();
      });
    }

    return next();
  }

  /* ---------------------------- documento ---------------------------- */

  function preamble(baseUrl) {
    return [
      '(function () {',
      '  "use strict";',
      '  var BASE = ' + JSON.stringify(baseUrl) + ';',
      '  var OP = window.opener;',
      '  try { var u0 = new URL(BASE); history.replaceState(null, "", u0.pathname || "/"); } catch (e) {}',
      '  function send(action) { try { if (OP && OP.postMessage) OP.postMessage({ action: action }, "*"); } catch (e) {} }',
      '',
      '  try {',
      '    if (window.tizen && tizen.tvinputdevice) {',
      '      var keys = ["ColorF0Red", "ColorF1Green", "ColorF2Yellow", "ColorF3Blue", "Exit", "ChannelUp", "ChannelDown"];',
      '      if (tizen.tvinputdevice.registerKeyBatch) {',
      '        tizen.tvinputdevice.registerKeyBatch(keys);',
      '      } else {',
      '        for (var i = 0; i < keys.length; i++) { try { tizen.tvinputdevice.registerKey(keys[i]); } catch (e) {} }',
      '      }',
      '    }',
      '  } catch (e) {}',
      '',
      '  document.addEventListener("keydown", function (ev) {',
      '    var k = ev.keyCode;',
      '    if (k === 403 || k === 405 || k === 427) send("reload");',
      '    else if (k === 10182 || k === 428) send("exit");',
      '  }, true);',
      '',
      '  function toast(msg, color) {',
      '    try {',
      '      var d = document.getElementById("__bxtoast");',
      '      if (!d) {',
      '        d = document.createElement("div");',
      '        d.id = "__bxtoast";',
      '        d.style.cssText = "position:fixed;left:32px;bottom:32px;z-index:2147483647;padding:16px 26px;border-radius:12px;"',
      '          + "background:rgba(8,10,12,.9);color:" + (color || "#8ee06a") + ";font:600 24px/1.4 sans-serif;"',
      '          + "pointer-events:none;opacity:1;transition:opacity 1s";',
      '        (document.body || document.documentElement).appendChild(d);',
      '      }',
      '      d.textContent = msg;',
      '      clearTimeout(window.__bxtoastTimer);',
      '      window.__bxtoastTimer = setTimeout(function () { d.style.opacity = "0"; }, 8000);',
      '    } catch (e) {}',
      '  }',
      '  window.__bxToast = toast;',
      '',
      '  window.__bxFail = function (e) {',
      '    var msg = "Error de Better xCloud: " + (e && e.message ? e.message : e);',
      '    try { console.error("[bx-tv]", e); } catch (_) {}',
      '    try {',
      '      var d = document.createElement("div");',
      '      d.style.cssText = "position:fixed;left:32px;top:32px;right:32px;z-index:2147483647;padding:18px 24px;border-radius:12px;"',
      '        + "background:#5a1010;color:#ffdada;font:500 20px/1.5 sans-serif;white-space:pre-wrap";',
      '      d.textContent = msg;',
      '      (document.body || document.documentElement).appendChild(d);',
      '    } catch (_) {}',
      '  };',
      '',
      '  var b = document.createElement("a");',
      '  b.href = BASE;',
      '  var baseHost = b.host;',
      '',
      '  function relativizeUrl(u) {',
      '    if (typeof u !== "string" || !u) return u;',
      '    try {',
      '      var a = document.createElement("a");',
      '      a.href = u;',
      '      if (a.host === baseHost) return a.pathname + a.search + a.hash;',
      '    } catch (e) {}',
      '    return u;',
      '  }',
      '',
      '  function wrapHistory(fn) {',
      '    return function (state, title, url) {',
      '      try { return fn.call(history, state, title, relativizeUrl(url)); }',
      '      catch (e) { try { return fn.call(history, state, title); } catch (e2) {} }',
      '    };',
      '  }',
      '  try {',
      '    history.pushState = wrapHistory(history.pushState);',
      '    history.replaceState = wrapHistory(history.replaceState);',
      '  } catch (e) {}',
      '})();'
    ].join('\n');
  }

  function wrapBetterXcloud(code) {
    return 'try {\n' + code + '\n; if (window.__bxToast) window.__bxToast("Better xCloud' +
      (bxVersion ? ' ' + bxVersion : '') + ' activo", "#8ee06a");\n} catch (e) { if (window.__bxFail) window.__bxFail(e); }';
  }

  function buildDoc(info) {
    /* La app clasica de xbox.com se auto-redirige a la app nueva (play.xbox.com)
       cuando esta bandera viene en window.env. La apagamos para quedarnos con la
       version que Better xCloud si puede parchear (incluye bypass de region). */
    var html = String(info.html || '')
      .replace(/"FORCE_REDIRECT_PRODUCTION_ORIGIN"\s*:\s*"true"/g, '"FORCE_REDIRECT_PRODUCTION_ORIGIN":"false"')
      .replace(/"FORCE_REDIRECT_PRODUCTION_ORIGIN"\s*:\s*true/g, '"FORCE_REDIRECT_PRODUCTION_ORIGIN":false');

    var doc = new DOMParser().parseFromString(html, 'text/html');
    var head = doc.head || doc.getElementsByTagName('head')[0];
    var nodes, i;

    if (!head) throw new Error('La pagina no tiene <head>');

    nodes = doc.querySelectorAll('base');
    for (i = 0; i < nodes.length; i++) nodes[i].parentNode.removeChild(nodes[i]);

    nodes = doc.querySelectorAll('meta[http-equiv]');
    for (i = 0; i < nodes.length; i++) {
      var eq = (nodes[i].getAttribute('http-equiv') || '').toLowerCase();
      if (eq.indexOf('content-security-policy') === 0) nodes[i].parentNode.removeChild(nodes[i]);
    }

    var base = doc.createElement('base');
    base.setAttribute('href', info.url);
    head.insertBefore(base, head.firstChild);

    var pre = doc.createElement('script');
    pre.textContent =
      'window.BX_FLAGS = Object.assign(window.BX_FLAGS || {}, { DeviceInfo: { deviceType: "tv" } });\n' +
      preamble(info.url);
    head.insertBefore(pre, base.nextSibling);

    if (bxSrc) {
      var s = doc.createElement('script');
      s.textContent = wrapBetterXcloud(bxSrc);
      head.insertBefore(s, pre.nextSibling);
    }

    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  }

  /* ----------------------------- ventana ----------------------------- */

  function ensureChild() {
    if (child && !child.closed) return true;
    try {
      child = window.open('about:blank', WIN_NAME, WIN_FEATURES);
      dbgChild(child);
    } catch (e) {
      log('window.open fallo: ' + e.message);
      child = null;
    }
    return !!(child && !child.closed);
  }

  function dbgChild(c) {
    try { window.__bxChild = c; } catch (e) { /* noop */ }
  }

  function writeDoc(html) {
    if (!child) return false;
    try {
      child.document.open();
      child.document.write(html);
      child.document.close();
      return true;
    } catch (e) {
      log('document.write fallo: ' + e.message);
      try { child.close(); } catch (e2) { /* noop */ }
      child = null;
      return false;
    }
  }

  function openAndWrite(doc) {
    if (!ensureChild()) {
      pendingDoc = function () { openAndWrite(doc); };
      setStatus('Pulsa una tecla del control', 'Se necesita permiso para abrir la ventana de Xbox');
      return;
    }
    pendingDoc = null;
    setStatus('Cargando Xbox Cloud Gaming', pageInfo ? pageInfo.url : '');
    if (!writeDoc(doc)) {
      fail('No se pudo abrir la pagina de Xbox', 'Pulsa ROJO en el control para reintentar.');
      return;
    }
    showSpinner(false);
    setStatus('Better xCloud activo' + (bxVersion ? ' (' + bxVersion + ')' : ''),
      'ROJO = recargar  ·  EXIT = salir');
    try { child.focus(); } catch (e) { /* noop */ }
  }

  /* ------------------------------ flujo ------------------------------ */

  function openDirect(url) {
    if (!ensureChild()) {
      pendingDoc = function () { openDirect(url); };
      setStatus('Pulsa una tecla del control', 'Se necesita permiso para abrir la ventana de Xbox');
      return;
    }
    pendingDoc = null;
    setStatus('Abriendo Xbox...', url);
    try {
      child.location.replace(url);
    } catch (e) {
      try { child.close(); } catch (e2) { /* noop */ }
      child = null;
      try { child = window.open(url, WIN_NAME, WIN_FEATURES); } catch (e3) { child = null; }
    }
    if (!child || child.closed) {
      fail('No se pudo abrir Xbox', 'Pulsa ROJO en el control para reintentar.');
      return;
    }
    showSpinner(false);
    setStatus('Xbox abierto', 'ROJO = recargar  ·  EXIT = salir');
    try { child.focus(); } catch (e4) { /* noop */ }
  }

  function openTarget() {
    if (pageInfo && !isClassicApp(pageInfo.html)) {
      var url = pageInfo.url || 'https://play.xbox.com/library';
      try {
        var a = document.createElement('a');
        a.href = url;
        if (a.host === 'play.xbox.com' && (a.pathname === '/' || a.pathname === '')) {
          url = 'https://play.xbox.com/library';
        }
      } catch (e) { /* noop */ }
      openDirect(url);
    } else {
      openAndWrite(buildDoc(pageInfo));
    }
  }

  function start() {
    if (busy) return;
    busy = true;
    showSpinner(true);
    /* La app clasica de xbox.com ya no se puede parchear desde un widget:
       si se reescribe en otro documento, responde 404. Se abre directo la
       app nueva de Xbox, que si funciona a pantalla completa. */
    setStatus('Abriendo Xbox Cloud Gaming', PLAY_URL);
    busy = false;
    openDirect(PLAY_URL);
  }

  function startLegacy() {
    var pageTask = pageInfo ? Promise.resolve(pageInfo) : fetchPage();

    pageTask.then(function (p) {
      pageInfo = p;
      if (!isClassicApp(p.html)) return null;
      if (bxSrc) return null;
      setStatus('Descargando Better xCloud', '');
      return loadScriptSource().then(function (t) {
        bxSrc = t;
        bxVersion = versionOf(t);
      });
    }).then(function () {
      busy = false;
      openTarget();
    }).catch(function (e) {
      busy = false;
      fail('No se pudo iniciar Better xCloud', (e && e.message ? e.message : String(e)) + ' · ROJO = reintentar');
    });
  }

  function reloadApp() {
    if (busy) return;
    closing = true;
    try { if (child && !child.closed) child.close(); } catch (e) { /* noop */ }
    child = null;
    closing = false;
    showSpinner(true);
    if (pageInfo) openTarget();
    else start();
  }

  function exitApp() {
    closing = true;
    try { if (child && !child.closed) child.close(); } catch (e) { /* noop */ }
    try {
      tizen.application.getCurrentApplication().exit();
    } catch (e) {
      setStatus('Sesion finalizada', 'Cierra esta ventana con el boton Atras.');
    }
  }

  window.addEventListener('message', function (ev) {
    var action = ev && ev.data && ev.data.action;
    if (action === 'exit') exitApp();
    else if (action === 'reload') reloadApp();
  });

  function onKey(ev) {
    var k = ev.keyCode;
    if (pendingDoc && k !== 10182) {
      var pending = pendingDoc;
      pendingDoc = null;
      pending();
      return;
    }
    if (k === 403 || k === 405 || k === 427) reloadApp();
    else if (k === 10182 || k === 428) exitApp();
  }

  document.addEventListener('keydown', onKey, true);
  document.addEventListener('click', function () {
    if (pendingDoc) {
      var pending = pendingDoc;
      pendingDoc = null;
      pending();
    }
  });

  setInterval(function () {
    if (closing) return;
    if (child && child.closed) exitApp();
  }, 2000);

  try {
    if (window.tizen && tizen.tvinputdevice) {
      var keys = ['ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue', 'Exit', 'ChannelUp', 'ChannelDown'];
      if (tizen.tvinputdevice.registerKeyBatch) tizen.tvinputdevice.registerKeyBatch(keys);
      else keys.forEach(function (k) { try { tizen.tvinputdevice.registerKey(k); } catch (e) { /* noop */ } });
    }
  } catch (e) { /* noop */ }

  if (elHint) elHint.textContent = 'ROJO: recargar   ·   EXIT: salir';

  start();
})();
