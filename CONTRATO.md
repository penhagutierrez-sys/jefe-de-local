# El contrato de datos

La pantalla es un renderizador sobre una forma de datos documentada. Quien tenga un
ERP distinto sólo necesita producir este objeto.

## Principio: viajan medidas, no razones

El archivo de datos trae **lo que se midió**: pesos, unidades, documentos. Todos los
porcentajes, el ticket, la meta de mañana y la participación se calculan en la
página, a partir de esas medidas.

Está hecho así a propósito. Una razón que viaja precalculada es una razón que puede
terminar contradiciendo a las cifras que la originan — basta que alguien corrija la
venta y olvide recalcular el cumplimiento. Si el porcentaje se deriva en el momento
de pintarlo, esa contradicción no tiene dónde ocurrir.

## La raíz

```js
window.DATOS_EJEMPLO = {
  fecha: "2026-09-19",     // el último día CERRADO (ISO). No el día en curso
  margen_objetivo: 29.5,   // % — la vara de margen contra la que se compara
  dias_venta_mes: 26,      // días hábiles del mes, para prorratear el presupuesto
  hay_ano_anterior: true,
  tiendas: [ /* ... */ ]
}
```

## Cada tienda

| Campo | Tipo | Qué es |
|---|---|---|
| `tienda` | texto | Nombre. Es la clave: el filtro compara por este valor |
| `venta` | número | Venta neta del día |
| `margen` | número | Margen del día, en pesos |
| `docs` | entero | Transacciones del día |
| `ppto_dia` | número \| `null` | Meta del día. **`null` = sin meta cargada** |
| `venta_mes` | número | Venta acumulada del mes |
| `ppto_mes` | número \| `null` | Meta del mes completo |
| `dias_corridos` | entero | Días de venta transcurridos |
| `dias_restantes` | entero | Días de venta que quedan |
| `venta_ant` | número \| `null` | El mismo día de la semana, 52 semanas atrás |
| `margen_ant_pct` | número \| `null` | Margen % de ese mismo día |
| `inventario_estados` | objeto | `{liq, ven, inm, proy, reg}` en pesos, a costo |
| `canchas` | lista | `{cancha, venta, factura, boleta}` por etapa de obra |
| `cliente` | objeto | `{final_v, final_n, empresa_v, empresa_n}` |
| `serie` | lista | Venta de los últimos días, para la barra chica |
| `serie_fechas` | lista | Las fechas de esa serie, en el mismo orden |

`null` significa **sin dato** y la pantalla lo dice con esas palabras. Nunca se
sustituye por cero: un cero es una medición que dice "no hubo", y eso es distinto de
"no se sabe".

## Los cinco estados del inventario

Son **excluyentes y ordenados**. Cada peso de capital cae en uno solo, y en este
orden de prioridad:

1. `liq` — **en liquidación**: decisión tomada, sale a precio de salida
2. `ven` — **por vencer**: la vida útil corre contra el stock
3. `inm` — **inmovilizado**: sin una sola venta en la ventana
4. `proy` — **venta proyecto**: obra gruesa e instalaciones, la tira una obra
5. `reg` — **venta regular**: mesón y terminaciones, rota sola

Que sean excluyentes es lo que permite leer la torta sin notas al pie: los cinco
suman el capital total, sin repetir y sin dejar nada afuera.

## Lo que la página deriva

| Derivada | Fórmula |
|---|---|
| `margen_pct` | `100 × margen / venta` |
| `ticket` | `venta / docs` |
| `particip` | `100 × venta / venta de todas las tiendas` |
| `cumpl` | `100 × venta / ppto_dia` — `null` si no hay meta |
| `falta` | `ppto_dia − venta` |
| `ppto_mes_hoy` | `ppto_mes × dias_corridos / dias_venta_mes` |
| `cumpl_mes` | `100 × venta_mes / ppto_mes_hoy` |
| `déficit` | `ppto_mes_hoy − venta_mes` |
| `meta_manana` | `ppto_dia + min(déficit / dias_restantes, ppto_dia)` |
| `fuera_alcance` | `max(0, déficit − ppto_dia × dias_restantes)` |
| `dif_pct` | `100 × (venta − venta_ant) / venta_ant` |
| `pct` de cada cancha | `100 × venta de la cancha / venta de la tienda` |
| `pct_factura` | `100 × factura / (factura + boleta)` |

**La meta de mañana va topada.** Reparte lo que falta del mes entre los días que
quedan, pero nunca pide más del doble de un día normal: nadie recupera vendiendo
tres veces lo habitual, y una meta imposible deja de ser una meta. Lo que no cabe
dentro del tope es `fuera_alcance`, y la pantalla lo nombra por lo que es: una
brecha que no se cierra vendiendo un día.

## El agregado de la red

No viaja en el archivo: **se suma de las tiendas** cada vez que se pinta. Si viajara,
podría dejar de cuadrar con sus propias partes el día que alguien toque una.

Una tienda sin `ppto_dia` entra en la venta de la red pero **queda fuera de su
comparación**: sumar su venta contra un presupuesto que no existe inflaría el
cumplimiento de todas las demás. La pantalla dice cuál tienda quedó fuera y por qué.

## Umbral declarado

La frase que dice quién compró se calla cuando hay **menos de 30 documentos**: bajo
ese número, el reparto entre boleta y factura es ruido. Y entre 40% y 60% de factura
la frase declara el día como **mezclado**, en vez de inclinarse por un tipo de
cliente — sin esa banda neutra, 49% y 51% dirían cosas contrarias sobre una
diferencia que no significa nada.
