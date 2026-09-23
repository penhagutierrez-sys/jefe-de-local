/* ============================================================================
   CIERRE DEL DÍA — la pantalla del Jefe de Local
   ============================================================================
   Una sola pantalla, un solo estado: la sucursal seleccionada. Todo lo demás se
   vuelve a pintar desde ahí. No hay router, no hay pestañas y no hay framework:
   la pantalla cabe en un archivo y se lee de arriba abajo.

   Regla de la casa que gobierna todo lo de abajo: donde no hay dato, se dice
   «sin dato». Nunca se rellena con cero, ni se estima, ni se infiere. Un cero
   inventado en una pantalla de cierre es peor que un vacío: el vacío se nota.
   ========================================================================== */
(function () {
  "use strict";

  var P = window.DATOS_EJEMPLO;
  var SD = '<span class="sd">sin dato</span>';

  /* La sucursal que se está mirando. "" = toda la red. Es el ÚNICO estado de la
     pantalla: los botones de ámbito y las tarjetas de tienda escriben acá, y
     repintan entero. Con dos estados vivos (uno por caja) la tarjeta de arriba y
     la torta de abajo podrían terminar hablando de sucursales distintas. */
  var sucursal = "";

  /* ─────────────────────────── formato ─────────────────────────── */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function num(v, dec) {
    if (v == null || isNaN(v)) return "—";
    return v.toLocaleString("es-CL", {
      minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0
    });
  }
  function money(v) {
    if (v == null || isNaN(v)) return "—";
    return "$" + num(Math.round(v));
  }
  /* Los capitales van en millones: un inventario en pesos exactos ocupa media
     tarjeta y nadie lee los últimos seis dígitos. */
  function moneyC(v) {
    if (v == null || isNaN(v)) return "—";
    if (Math.abs(v) >= 1e6) return "$" + num(v / 1e6, 1) + " M";
    return money(v);
  }
  var DIAS_SEM = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  function tituloDia(iso) {
    if (!iso) return "Cierre del día";
    var d = new Date(iso + "T00:00:00");
    return "El " + DIAS_SEM[d.getDay()] + " " + d.getDate() + " cerraste así";
  }

  /* ──────────────────── medidas → razones ────────────────────
     El payload trae medidas. Todo lo que sigue es derivado, y se deriva acá, una
     sola vez, para que no exista una segunda versión del mismo número. */

  function derivar(t, ventaTotal) {
    var d = Object.create(t);
    d.margen_pct = t.venta ? (100 * t.margen) / t.venta : null;
    d.ticket = t.docs ? t.venta / t.docs : null;
    d.particip = ventaTotal ? (100 * t.venta) / ventaTotal : null;

    d.cumpl = t.ppto_dia ? (100 * t.venta) / t.ppto_dia : null;
    d.falta = t.ppto_dia ? t.ppto_dia - t.venta : null;

    /* El mes se compara contra el presupuesto A LA FECHA, no contra el mes
       completo: a mitad de mes, medirse contra el total siempre da «vas mal». */
    d.ppto_mes_hoy = t.ppto_mes ? (t.ppto_mes * t.dias_corridos) / P.dias_venta_mes : null;
    d.cumpl_mes = d.ppto_mes_hoy ? (100 * t.venta_mes) / d.ppto_mes_hoy : null;
    var deficit = d.ppto_mes_hoy ? d.ppto_mes_hoy - t.venta_mes : 0;

    /* La meta de mañana reparte lo que falta del mes entre los días que quedan,
       pero TOPADA: nadie recupera vendiendo tres veces un día normal. Lo que no
       cabe dentro del tope no se esconde — se nombra como lo que es, una brecha
       que no se cierra vendiendo un día. */
    if (t.ppto_dia) {
      var porDia = deficit > 0 && t.dias_restantes ? deficit / t.dias_restantes : 0;
      var tope = t.ppto_dia;                     // como mucho, el doble de un día normal
      d.meta_manana = t.ppto_dia + Math.min(porDia, tope);
      d.fuera_alcance = Math.max(0, deficit - tope * t.dias_restantes);
      d.recupero_topado = d.fuera_alcance > 0;
    } else {
      d.meta_manana = null;
      d.fuera_alcance = 0;
      d.recupero_topado = false;
    }

    d.dif_monto = t.venta_ant == null ? null : t.venta - t.venta_ant;
    d.dif_pct = t.venta_ant ? (100 * (t.venta - t.venta_ant)) / t.venta_ant : null;

    var cl = t.cliente || {};
    var totCl = (cl.final_v || 0) + (cl.empresa_v || 0);
    d.pct_final = totCl ? (100 * cl.final_v) / totCl : null;

    d.canchas = (t.canchas || []).map(function (c) {
      var fb = (c.factura || 0) + (c.boleta || 0);
      return {
        cancha: c.cancha, venta: c.venta, factura: c.factura, boleta: c.boleta,
        pct: t.venta ? (100 * c.venta) / t.venta : null,
        pct_factura: fb > 0 ? (100 * c.factura) / fb : null
      };
    });
    d.inventario = Object.keys(t.inventario_estados).reduce(function (a, k) {
      return a + t.inventario_estados[k];
    }, 0);
    return d;
  }

  /* El agregado de la red se SUMA de las tiendas; no viaja en el archivo. Si
     viajara, podría dejar de cuadrar con sus propias partes el día que alguien
     toque una. */
  function agregar(ts) {
    if (ts.length === 1) return ts[0];
    var r = {
      tienda: "toda la red", venta: 0, margen: 0, docs: 0, venta_mes: 0,
      ppto_dia: 0, ppto_mes: 0, venta_ant: 0, serie: [], serie_fechas: [],
      dias_corridos: ts[0].dias_corridos, dias_restantes: ts[0].dias_restantes,
      inventario_estados: { liq: 0, ven: 0, inm: 0, proy: 0, reg: 0 },
      cliente: { final_v: 0, final_n: 0, empresa_v: 0, empresa_n: 0 }
    };
    /* Sin meta cargada, una tienda no puede entrar en la comparación de la red:
       sumaría su venta contra un presupuesto que no existe y el cumplimiento de
       toda la red saldría inflado. Entra en la venta; no en la comparación. */
    var conMeta = 0, ventaConMeta = 0, ventaAntDisp = 0, margenAnt = 0;
    r.sin_meta = [];

    ts.forEach(function (t) {
      r.venta += t.venta; r.margen += t.margen; r.docs += t.docs;
      r.venta_mes += t.venta_mes;
      if (t.ppto_dia) {
        conMeta++; ventaConMeta += t.venta;
        r.ppto_dia += t.ppto_dia; r.ppto_mes += t.ppto_mes || 0;
      } else r.sin_meta.push(t.tienda);
      if (t.venta_ant != null) {
        ventaAntDisp += t.venta_ant;
        margenAnt += (t.margen_ant_pct || 0) * t.venta_ant / 100;
      }
      Object.keys(r.inventario_estados).forEach(function (k) {
        r.inventario_estados[k] += t.inventario_estados[k];
      });
      ["final_v", "final_n", "empresa_v", "empresa_n"].forEach(function (k) {
        r.cliente[k] += (t.cliente || {})[k] || 0;
      });
      (t.serie || []).forEach(function (v, i) { r.serie[i] = (r.serie[i] || 0) + v; });
    });

    r.serie_fechas = ts[0].serie_fechas;
    r.venta_ant = ventaAntDisp || null;
    r.margen_ant_pct = ventaAntDisp ? (100 * margenAnt) / ventaAntDisp : null;
    r.venta_comparable = ventaConMeta;
    r.tiendas_con_meta = conMeta;

    /* canchas de la red: se suman por nombre, respetando el orden de aparición */
    var idx = {}, orden = [];
    ts.forEach(function (t) {
      (t.canchas || []).forEach(function (c) {
        if (!idx[c.cancha]) { idx[c.cancha] = { cancha: c.cancha, venta: 0, factura: 0, boleta: 0 }; orden.push(c.cancha); }
        idx[c.cancha].venta += c.venta;
        idx[c.cancha].factura += c.factura || 0;
        idx[c.cancha].boleta += c.boleta || 0;
      });
    });
    r.canchas = orden.map(function (n) { return idx[n]; })
      .sort(function (a, b) { return b.venta - a.venta; });
    return r;
  }

  /* ─────────────────────────── el semáforo ───────────────────────────
     Sin titulares falsos y sin euforia: el nivel sale del cumplimiento y la frase
     dice la cifra. Lo que motiva acá es que el número sea claro y que la próxima
     acción esté a la vista, no un adjetivo. */
  function semaforo(t) {
    var c = t.cumpl;
    if (c == null) return {
      n: "sd", tit: "Sin meta cargada",
      fr: "Vendiste <b>" + money(t.venta) + "</b>. Falta el presupuesto para poder compararlo."
    };
    if (c >= 100) return {
      n: "ok", tit: "Meta cumplida",
      fr: "Cerraste en <b>" + money(t.venta) + "</b> y pasaste la meta por <b>" +
        money(Math.abs(t.falta)) + "</b>. Así se ve un buen día."
    };
    if (c >= 90) return {
      n: "cerca", tit: "Casi",
      fr: "Cerraste en <b>" + money(t.venta) + "</b>. Te faltaron <b>" +
        money(t.falta) + "</b> — una venta mediana y estabas."
    };
    if (c >= 70) return {
      n: "medio", tit: "Se puede más",
      fr: "Cerraste en <b>" + money(t.venta) + "</b> de " + money(t.ppto_dia) +
        ". Te faltaron <b>" + money(t.falta) + "</b>."
    };
    return {
      n: "bajo", tit: "Día flojo",
      fr: "Cerraste en <b>" + money(t.venta) + "</b> de " + money(t.ppto_dia) +
        ". Te faltaron <b>" + money(t.falta) + "</b>."
    };
  }

  /* Qué obra traccionó el día y quién lo pagó, en una frase.
     La frase se daba vuelta en el filo exacto del 50%: con 49% decía una cosa y
     con 51% la contraria, sobre una diferencia que no significa nada. Por eso hay
     banda neutra: entre 40 y 60 el día está MEZCLADO y se dice así. */
  var MIN_DOCS_PCT = 30;
  function lectura(t) {
    var cs = (t.canchas || []).filter(function (c) { return c.venta > 0; })
      .sort(function (a, b) { return b.venta - a.venta; });
    if (!cs.length) return "";
    var c = cs[0], pf = c.pct_factura;
    var docs = (t.cliente.final_n || 0) + (t.cliente.empresa_n || 0);
    var cab = "El día se fue en <b>" + esc(c.cancha.toLowerCase()) + "</b> (" +
      num(c.pct) + "% de la venta)";

    if (pf == null || docs < MIN_DOCS_PCT)
      return cab + ". Con " + num(docs) + " documentos no hay base para decir a " +
        "quién se le vendió: se necesitan al menos " + MIN_DOCS_PCT + ".";
    if (pf >= 40 && pf <= 60)
      return cab + ", <b>repartido</b> entre boleta y factura (" + num(pf) +
        "% factura): día mezclado, sin un tipo de cliente que mande.";
    if (pf > 60)
      return cab + " y <b>" + num(pf) + "% salió con factura</b>: fue día de " +
        "maestro y contratista.";
    return cab + ", y sólo el " + num(pf) + "% salió con factura: lo compró " +
      "público final.";
  }

  /* ─────────────────────── el anillo de cumplimiento ─────────────────────── */
  function anillo(pct, nivel) {
    var p = Math.max(0, Math.min(100, pct || 0));
    var r = 52, c = 2 * Math.PI * r;
    return '<div class="anillo"><svg viewBox="0 0 120 120" aria-hidden="true">' +
      '<circle class="a-bg" cx="60" cy="60" r="' + r + '"/>' +
      '<circle class="a-v n-' + nivel + '" cx="60" cy="60" r="' + r + '" ' +
      'stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - p / 100)).toFixed(1) + '"/>' +
      '</svg><div class="a-tx"><b>' + (pct == null ? "—" : num(p) + "%") +
      '</b><small>de la meta</small></div></div>';
  }

  /* ───────────────────── la torta de estado del inventario ─────────────────────
     Cinco estados EXCLUYENTES y en este orden. Cada peso del inventario cae en uno
     solo, y los cinco suman el total: sin repetir y sin dejar nada afuera. Esa es
     la propiedad que hace que la torta se pueda leer sin notas al pie. */
  var ESTADOS = [
    ["liq", "En liquidación", "decisión tomada: sale a precio de salida"],
    ["ven", "Por vencer", "la vida útil corre contra el stock"],
    ["inm", "Inmovilizado", "sin una sola venta en la ventana"],
    ["proy", "Venta proyecto", "obra gruesa e instalaciones: la tira una obra"],
    ["reg", "Venta regular", "mesón y terminaciones: rota sola"]
  ];

  function torta(est) {
    var tot = ESTADOS.reduce(function (a, e) { return a + est[e[0]]; }, 0);
    if (!tot) return '<p class="vacio">Sin capital en bodega que mostrar.</p>';
    var r = 54, c = 2 * Math.PI * r, acum = 0;
    var arcos = ESTADOS.map(function (e) {
      var v = est[e[0]], frac = v / tot;
      var largo = c * frac;
      /* el arco parte en cero y crece por CSS: sin el data-da y el encendido de
         abajo, la torta aparece dibujada de golpe y no se entiende de dónde sale */
      var a = '<circle class="t-arc e-' + e[0] + '" cx="60" cy="60" r="' + r + '" ' +
        'stroke-dasharray="0 ' + c.toFixed(1) + '" ' +
        'data-da="' + largo.toFixed(1) + " " + c.toFixed(1) + '" ' +
        'transform="rotate(' + (-90 + 360 * acum) + ' 60 60)"><title>' +
        esc(e[1]) + ": " + moneyC(v) + "</title></circle>";
      acum += frac;
      return a;
    }).join("");

    var leyenda = ESTADOS.map(function (e) {
      var v = est[e[0]];
      return '<div class="t-lg"><span class="t-pt e-' + e[0] + '"></span>' +
        '<span class="t-n">' + esc(e[1]) + '<em>' + esc(e[2]) + '</em></span>' +
        '<span class="t-v">' + moneyC(v) + '<em>' + num((100 * v) / tot, 1) + '%</em></span></div>';
    }).join("");

    return '<div class="t-flex">' +
      '<div class="t-don"><svg viewBox="0 0 120 120">' +
      '<circle class="t-bg" cx="60" cy="60" r="' + r + '"/>' + arcos +
      '</svg><div class="t-c"><b>' + moneyC(tot) + '</b><small>capital a costo</small></div></div>' +
      '<div class="t-lgs">' + leyenda + '</div></div>';
  }

  /* ─────────────────────────── las tarjetas ─────────────────────────── */

  function tarjKPI(lb, val, sub, pct, suf, nivel) {
    return '<div class="dkpi' + (nivel ? " " + nivel : "") + '">' +
      '<div class="lb">' + esc(lb) + '</div>' +
      '<div class="vl">' + val + '</div>' +
      '<div class="sb">' + sub + (pct != null ? " · " + num(pct) + "%" + (suf || "") : "") + '</div></div>';
  }

  function tarjetaTienda(t) {
    var s = semaforo(t);
    var maxs = Math.max.apply(null, (t.serie || [0]).concat([1]));
    var spark = (t.serie || []).map(function (v, i) {
      return '<span style="height:' + Math.max(2, Math.round(30 * v / maxs)) + 'px" title="' +
        esc((t.serie_fechas || [])[i] || "") + ": " + money(v) + '"></span>';
    }).join("");

    var canchas = (t.canchas || []).map(function (c) {
      var neg = c.venta < 0;
      return '<div class="dc' + (neg ? " neg" : "") + '"><span class="n">' + esc(c.cancha) + '</span>' +
        '<span class="b"><i style="width:' + Math.max(0, Math.min(100, c.pct || 0)) + '%"></i></span>' +
        '<span class="p">' + (neg ? "devol." : num(c.pct) + "%") + '</span>' +
        '<span class="f">' + (c.pct_factura == null ? "—" : num(c.pct_factura) + "% fact.") + '</span></div>';
    }).join("");

    var aa = t.dif_pct == null
      ? '<span class="sd">sin año anterior</span>'
      : '<span class="' + (t.dif_monto >= 0 ? "up" : "dn") + '">' +
        (t.dif_monto >= 0 ? "+" : "−") + num(Math.abs(t.dif_pct), 1) + "% vs año pasado</span>";

    return '<button class="dia-t sem-' + s.n + '" data-t="' + esc(t.tienda) + '">' +
      '<div class="dt-top"><b>' + esc(t.tienda) + '</b>' +
        '<span class="dt-c ' + s.n + '">' + (t.cumpl == null ? "—" : num(t.cumpl) + "%") +
        '<em>de la meta</em></span></div>' +
      '<div class="dt-v">' + money(t.venta) + '<small>' +
        (t.ppto_dia ? "de " + money(t.ppto_dia) : "sin meta cargada") + '</small></div>' +
      '<div class="dt-f">' + (t.falta == null ? SD
        : t.falta > 0 ? "faltaron " + money(t.falta)
        : "pasó la meta por " + money(Math.abs(t.falta))) + " · " + aa + '</div>' +
      '<div class="dt-part">' + num(t.particip, 1) + "% de la venta del día · inventario " +
        moneyC(t.inventario) + '</div>' +
      '<div class="dt-sp">' + spark + '</div>' +
      '<div class="dt-m"><span>ticket <b>' + money(t.ticket) + '</b></span>' +
        '<span>margen <b>' + num(t.margen_pct, 1) + '%</b></span></div>' +
      '<div class="dt-et">Qué obra traccionó</div>' + canchas +
      '<div class="dt-man">mañana: <b>' + (t.meta_manana == null ? "—" : money(t.meta_manana)) + '</b></div>' +
      '</button>';
  }

  /* ─────────────────────── las dos lecturas del día ───────────────────────
     La demanda se lee por etapa de obra (qué la traccionó) y por tipo de cliente
     (quién la pagó). Es el eje que separa la oferta de la demanda: la oferta se
     ordena por proveedor y bulto; la demanda, por obra y cliente. */
  function bloqueEtapas(t) {
    var maxv = 1;
    (t.canchas || []).forEach(function (c) { maxv = Math.max(maxv, c.venta || 0); });

    var etapas = (t.canchas || []).map(function (c) {
      var neg = (c.venta || 0) < 0;
      return '<div class="et-f' + (neg ? " et-neg" : "") + '">' +
        '<span class="n">' + esc(c.cancha) + '</span>' +
        '<span class="b"><i style="width:' + (neg ? 0 : Math.round(100 * c.venta / maxv)) + '%"></i></span>' +
        '<span class="v">' + money(c.venta) + '</span>' +
        '<span class="p">' + (neg ? "devolución neta" : num(c.pct) + "% del día") + '</span></div>';
    }).join("");

    var cl = t.cliente, tot = cl.final_v + cl.empresa_v;
    var pf = tot ? (100 * cl.final_v) / tot : null;
    var clientes =
      '<div class="cl-b"><i class="cl-final" style="width:' + (pf || 0) + '%"></i>' +
        '<i class="cl-emp" style="width:' + (100 - (pf || 0)) + '%"></i></div>' +
      '<div class="cl-l"><span><b>' + money(cl.final_v) + '</b> boleta · ' +
        num(cl.final_n) + ' documentos<em>cliente final</em></span>' +
      '<span><b>' + money(cl.empresa_v) + '</b> factura · ' +
        num(cl.empresa_n) + ' documentos<em>empresa</em></span></div>';

    return '<div class="dos">' +
      '<div class="caja"><h3>Qué obra traccionó la venta<span class="h3s">etapa de obra</span></h3>' +
        etapas + '<p class="pie">' + lectura(t) + '</p></div>' +
      '<div class="caja"><h3>Quién la pagó<span class="h3s">boleta = cliente final · factura = empresa</span></h3>' +
        clientes + '</div></div>';
  }

  /* ─────────────────────────── render ─────────────────────────── */

  function render() {
    var ts = P.tiendas.map(function (t) { return t; });
    var ventaTotal = ts.reduce(function (a, t) { return a + t.venta; }, 0);
    var todas = ts.map(function (t) { return derivar(t, ventaTotal); });
    var vistas = sucursal ? todas.filter(function (t) { return t.tienda === sucursal; }) : todas;
    var tot = vistas.length === 1 ? vistas[0] : derivar(agregar(ts), ventaTotal);
    var s = semaforo(tot);
    var ambito = sucursal || "toda la red";

    /* ── encabezado ── */
    var sinMeta = (tot.sin_meta || []);
    document.getElementById("phead").innerHTML =
      '<div><div class="ph-tit"><h1>' + esc(tituloDia(P.fecha)) + '</h1>' +
        '<span class="pill n-' + s.n + '">' + esc(s.tit) + '</span></div>' +
      '<div class="sub">' + esc(ambito) +
        '<span class="cif">último día <b>cerrado</b> · la réplica del ERP se sincroniza a las 06:00</span>' +
        (sinMeta.length
          ? '<span class="cif alerta">' + num(sinMeta.length) + ' tienda sin meta cargada (' +
            esc(sinMeta.join(", ")) + ') queda fuera de la comparación</span>'
          : "") +
      '</div></div>';

    /* ── el semáforo, arriba y grande ── */
    var manana = '<div class="sem-man"><span class="et">Lo que hay que vender mañana</span>' +
      '<span class="v">' + (tot.meta_manana == null ? "—" : money(tot.meta_manana)) + '</span>' +
      (tot.meta_manana != null && tot.meta_manana > tot.ppto_dia
        ? '<span class="d">' + money(tot.meta_manana - tot.ppto_dia) +
          ' más que un día normal, para ir recuperando el mes</span>'
        : '<span class="d">el día normal de esta tienda</span>') + '</div>';

    var mes = tot.ppto_mes_hoy
      ? '<div class="sem-mes">En el mes vas <b>' + moneyC(tot.venta_mes) + '</b> de ' +
        moneyC(tot.ppto_mes_hoy) + ' (' + num(tot.cumpl_mes) + '%) en ' + tot.dias_corridos +
        ' días. Quedan <b>' + tot.dias_restantes + '</b> días de venta.' +
        (tot.recupero_topado
          ? ' <span class="hueco">De la brecha del mes, ' + moneyC(tot.fuera_alcance) +
            ' no se cierra vendiendo un día: esa es la brecha del plan, no de la tienda.</span>'
          : "") + '</div>'
      : '<div class="sem-mes">Sin presupuesto de mes cargado: no hay avance que mostrar.</div>';

    var hero = '<div class="hero hero-' + s.n + '">' +
      '<div class="hero-cuerpo">' +
        '<div class="hero-num"><span class="et">Vendiste</span>' +
          '<span class="v">' + money(tot.venta) + '</span>' +
          '<span class="fr">' + s.fr + '</span></div>' +
        anillo(tot.cumpl, s.n) +
      '</div>' +
      '<div class="hero-lec">' + lectura(tot) + '</div>' +
      '<div class="hero-pie">' + manana + '<div class="hero-mes">' + mes + '</div></div></div>';

    /* ── las cinco tarjetas ── */
    var aa = tot.dif_pct != null
      ? tarjKPI("Contra el año pasado",
          (tot.dif_monto >= 0 ? "+" : "−") + num(Math.abs(tot.dif_pct), 1) + "%",
          (tot.dif_monto >= 0 ? "+" : "−") + money(Math.abs(tot.dif_monto)) +
          " · el año pasado " + money(tot.venta_ant), null, "",
          tot.dif_monto >= 0 ? "ok" : "bajo")
      : tarjKPI("Contra el año pasado", SD,
          "sin dato del mismo día hábil del año anterior", null, "");

    var mgAnt = tot.margen_ant_pct != null
      ? "año pasado " + num(tot.margen_ant_pct, 1) + "%"
      : "sin margen del año anterior";

    var kpis = '<div class="dia-kpis">' +
      tarjKPI("Venta del día", money(tot.venta),
        tot.ppto_dia ? "meta " + money(tot.ppto_dia) : "sin meta cargada",
        tot.cumpl, " de la meta") +
      aa +
      tarjKPI("Margen del día", num(tot.margen_pct, 1) + "%", mgAnt,
        P.margen_objetivo ? (100 * tot.margen_pct) / P.margen_objetivo : null,
        " de la meta " + num(P.margen_objetivo, 1) + "%") +
      tarjKPI("Ticket promedio", money(tot.ticket), num(tot.docs) + " transacciones", null, "") +
      tarjKPI("Inventario valorizado", moneyC(tot.inventario),
        sucursal ? "en " + esc(sucursal) : "las " + P.tiendas.length + " tiendas", null, "") +
      '</div>';

    /* ── la torta del inventario ──
       El selector escribe el filtro global, no un ámbito propio: con dos ámbitos
       vivos, la tarjeta de arriba y la torta podrían hablar de tiendas distintas. */
    var est = vistas.length === 1 ? vistas[0].inventario_estados : agregar(ts).inventario_estados;
    var segs = '<div class="segs"><button class="seg' + (sucursal ? "" : " on") + '" data-z="">Toda la red</button>' +
      P.tiendas.map(function (t) {
        return '<button class="seg' + (sucursal === t.tienda ? " on" : "") +
          '" data-z="' + esc(t.tienda) + '">' + esc(t.tienda) + '</button>';
      }).join("") + '</div>';

    var inv = '<div class="caja caja-inv"><h3>En qué estado está el inventario' +
      '<span class="h3s">' + esc(ambito) + ' · capital a costo, sólo con stock en bodega</span></h3>' +
      segs + torta(est) +
      '<p class="pie">Cada peso cae en <b>un solo</b> estado, en este orden: en ' +
      'liquidación → por vencer → inmovilizado → venta proyecto → venta regular. ' +
      'Los cinco suman el capital de la torta, sin repetir ni dejar afuera.</p></div>';

    document.getElementById("cuerpo").innerHTML =
      hero + kpis + inv + bloqueEtapas(tot) +
      '<div class="dia-grid">' + vistas.map(tarjetaTienda).join("") + '</div>';

    /* Elegir tienda mueve TODA la pantalla, no sólo la caja que se tocó. */
    Array.prototype.forEach.call(document.querySelectorAll(".dia-t"), function (b) {
      b.onclick = function () {
        sucursal = sucursal === this.dataset.t ? "" : this.dataset.t;
        render();
      };
    });
    Array.prototype.forEach.call(document.querySelectorAll(".seg"), function (b) {
      b.onclick = function () { sucursal = this.dataset.z || ""; render(); };
    });

    /* el arco parte en cero y transiciona por CSS: sin este encendido sale vacío */
    setTimeout(function () {
      Array.prototype.forEach.call(document.querySelectorAll(".t-arc[data-da]"), function (e) {
        e.setAttribute("stroke-dasharray", e.dataset.da);
      });
    }, 40);
  }

  render();
})();
