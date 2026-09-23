/* ============================================================================
   DATOS DE EJEMPLO — INVENTADOS
   ============================================================================
   Nada de esto es real. Los nombres de las tiendas no existen y las cifras están
   escritas a mano para que la pantalla muestre sus cuatro casos interesantes:

     Puerto Aliste  → pasó la meta
     Valle Norte    → quedó cerca
     Cerro Alto     → día flojo
     Las Lomas      → SIN meta cargada (la pantalla tiene que decir «sin dato»,
                      no inventar un cumplimiento)

   El payload trae MEDIDAS, no razones: venta, margen, documentos, presupuesto,
   capital. Todos los porcentajes, el ticket, la meta de mañana y la participación
   los calcula la página a partir de estas medidas. Está hecho así a propósito:
   una cifra derivada que viaja en el archivo es una cifra que puede contradecir a
   las que la originan. Ver CONTRATO.md.

   Montos en pesos chilenos. Capital de inventario a costo.
   ========================================================================== */

window.DATOS_EJEMPLO = {
  fecha: "2026-09-19",          // el último día CERRADO, no el día en curso
  margen_objetivo: 29.5,        // % — la vara de margen del negocio
  dias_venta_mes: 26,           // días hábiles del mes
  hay_ano_anterior: true,

  tiendas: [
    {
      tienda: "Puerto Aliste",
      venta: 8420000,
      margen: 2604000,
      docs: 214,
      ppto_dia: 7500000,
      venta_mes: 118400000,
      ppto_mes: 195000000,
      dias_corridos: 15,
      dias_restantes: 11,
      venta_ant: 7610000,        // el mismo día de la semana, 52 semanas atrás
      margen_ant_pct: 30.1,

      // los cinco estados del capital en bodega. Excluyentes y en este orden:
      // un SKU cae en uno solo, y los cinco suman el capital de la tienda.
      inventario_estados: { liq: 4100000, ven: 2300000, inm: 18700000, proy: 41200000, reg: 62400000 },

      // qué obra traccionó la venta, con su reparto entre factura y boleta
      canchas: [
        { cancha: "Obra gruesa",   venta: 4180000, factura: 3010000, boleta: 1170000 },
        { cancha: "Terminaciones", venta: 2640000, factura:  740000, boleta: 1900000 },
        { cancha: "Mesón",         venta: 1600000, factura:  430000, boleta: 1170000 }
      ],
      cliente: { final_v: 4240000, final_n: 168, empresa_v: 4180000, empresa_n: 46 },
      serie: [6900000, 7250000, 6480000, 8010000, 7340000, 6920000, 8420000],
      serie_fechas: ["2026-09-13","2026-09-14","2026-09-15","2026-09-16",
                     "2026-09-17","2026-09-18","2026-09-19"]
    },
    {
      tienda: "Valle Norte",
      venta: 5180000,
      margen: 1512000,
      docs: 163,
      ppto_dia: 5600000,
      venta_mes: 79200000,
      ppto_mes: 145600000,
      dias_corridos: 15,
      dias_restantes: 11,
      venta_ant: 5490000,
      margen_ant_pct: 30.4,
      inventario_estados: { liq: 2800000, ven: 1400000, inm: 14100000, proy: 22600000, reg: 48300000 },
      canchas: [
        { cancha: "Terminaciones", venta: 2470000, factura:  610000, boleta: 1860000 },
        { cancha: "Mesón",         venta: 1580000, factura:  390000, boleta: 1190000 },
        { cancha: "Obra gruesa",   venta: 1130000, factura:  820000, boleta:  310000 }
      ],
      cliente: { final_v: 3360000, final_n: 139, empresa_v: 1820000, empresa_n: 24 },
      serie: [5020000, 5340000, 4870000, 5610000, 5180000, 4960000, 5180000],
      serie_fechas: ["2026-09-13","2026-09-14","2026-09-15","2026-09-16",
                     "2026-09-17","2026-09-18","2026-09-19"]
    },
    {
      tienda: "Cerro Alto",
      venta: 2940000,
      margen: 764000,
      docs: 118,
      ppto_dia: 4300000,
      venta_mes: 48600000,
      ppto_mes: 111800000,
      dias_corridos: 15,
      dias_restantes: 11,
      venta_ant: 3720000,
      margen_ant_pct: 28.8,
      inventario_estados: { liq: 6900000, ven: 900000, inm: 24800000, proy: 15300000, reg: 31100000 },
      canchas: [
        { cancha: "Mesón",         venta: 1340000, factura:  280000, boleta: 1060000 },
        { cancha: "Terminaciones", venta: 1080000, factura:  240000, boleta:  840000 },
        // devolución neta: la nota de crédito superó la venta de la etapa.
        // Se marca; no se dibuja en cero como si no hubiera pasado nada.
        { cancha: "Obra gruesa",   venta:  -80000, factura:  -80000, boleta:       0 }
      ],
      cliente: { final_v: 2280000, final_n: 104, empresa_v: 660000, empresa_n: 14 },
      serie: [3410000, 3180000, 2890000, 3520000, 3060000, 2740000, 2940000],
      serie_fechas: ["2026-09-13","2026-09-14","2026-09-15","2026-09-16",
                     "2026-09-17","2026-09-18","2026-09-19"]
    },
    {
      tienda: "Las Lomas",
      venta: 1760000,
      margen: 543000,
      docs: 81,
      ppto_dia: null,            // sin presupuesto cargado — caso «sin dato»
      venta_mes: 26900000,
      ppto_mes: null,
      dias_corridos: 15,
      dias_restantes: 11,
      venta_ant: null,           // tienda nueva: no hay mismo día del año anterior
      margen_ant_pct: null,
      inventario_estados: { liq: 1100000, ven: 300000, inm: 5200000, proy: 7400000, reg: 16800000 },
      canchas: [
        { cancha: "Mesón",         venta:  880000, factura: 190000, boleta: 690000 },
        { cancha: "Terminaciones", venta:  610000, factura: 140000, boleta: 470000 },
        { cancha: "Obra gruesa",   venta:  270000, factura: 180000, boleta:  90000 }
      ],
      cliente: { final_v: 1250000, final_n: 70, empresa_v: 510000, empresa_n: 11 },
      serie: [1540000, 1680000, 1420000, 1810000, 1590000, 1630000, 1760000],
      serie_fechas: ["2026-09-13","2026-09-14","2026-09-15","2026-09-16",
                     "2026-09-17","2026-09-18","2026-09-19"]
    }
  ]
};
