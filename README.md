# Cierre del día · Jefe de Local

Pantalla de cierre diario para el jefe de local de una ferretería. Responde cuatro
preguntas que se hacen todos los días a la misma hora: **cómo cerró el día**, **cuánto
hay que vender mañana**, **en qué estado está el capital que hay en bodega** y **qué
obra traccionó la venta**.

> **Demostración con datos inventados.** Los nombres de las tiendas no existen y las
> cifras están escritas a mano. Este repositorio no contiene datos de ninguna empresa.

## Cómo se abre

Abre `index.html` en cualquier navegador. No hay build, no hay dependencias, no hay
servidor: tres archivos y se pinta.

## Qué muestra

**El semáforo del día.** La venta contra la meta, con el veredicto en palabras y la
próxima acción a la vista. Cinco niveles, del "meta cumplida" al "día flojo" — y un
sexto caso que suele faltar en los tableros: **sin meta cargada**, que no se disfraza
de 0%.

**Lo que hay que vender mañana.** Reparte lo que falta del mes entre los días que
quedan, **topado al doble de un día normal**. Lo que no cabe dentro del tope no se
esconde en un promedio: la pantalla dice cuánto de la brecha no se cierra vendiendo
un día, porque eso es un problema del plan, no del local.

**El estado del capital en bodega.** Cinco estados excluyentes y ordenados: en
liquidación → por vencer → inmovilizado → venta proyecto → venta regular. Cada peso
cae en uno solo y los cinco suman el total. Es la diferencia entre saber *cuánto*
inventario hay y saber *qué* inventario hay.

**Qué obra traccionó la venta y quién la pagó.** La demanda leída por etapa de obra y
por tipo de cliente (boleta = cliente final, factura = empresa). Con banda neutra: si
el reparto está entre 40% y 60%, el día se declara mezclado en vez de inclinarse por
un lado sobre una diferencia que no significa nada.

**Una tarjeta por tienda.** Clic en cualquiera y toda la pantalla se mueve con ella
—el semáforo, las tarjetas, la torta— porque con dos ámbitos vivos la caja de arriba
y la de abajo terminan hablando de tiendas distintas.

## Cómo está hecho

JavaScript sin framework, sin build y sin dependencias. Tres archivos:

| | |
|---|---|
| `index.html` | El esqueleto |
| `app.js` | La pantalla completa |
| `estilos.css` | Los estilos |
| `datos-ejemplo.js` | El payload de ejemplo, inventado |
| `CONTRATO.md` | La forma de los datos que la pantalla consume |

**Un solo estado:** la sucursal seleccionada. Todo lo demás se vuelve a pintar desde
ahí. No hay router ni store porque no hacen falta, y su ausencia es lo que hace que
la pantalla quepa en un archivo que se lee de arriba abajo.

**Viajan medidas, no razones.** El archivo de datos trae pesos, unidades y
documentos; todos los porcentajes se derivan al pintar. Una razón precalculada puede
terminar contradiciendo a las cifras que la originan; una derivada no. Las fórmulas
están en [CONTRATO.md](CONTRATO.md).

**Donde no hay dato, se dice "sin dato".** Nunca se rellena con cero, ni se estima,
ni se infiere. Un cero inventado en una pantalla de cierre es peor que un vacío,
porque el vacío se nota y el cero se cree.

## Por qué existe

Nace de un problema concreto: en una cadena chica, el jefe de local cierra el día
mirando un total de venta y nada más. No sabe si estuvo cerca de la meta, no sabe qué
tiene que hacer mañana para recuperar el mes, y no tiene idea de cuánto del capital
que custodia está muerto. Las tres cosas existen en el ERP; ninguna llega a la
persona que puede hacer algo con ellas.

El criterio de diseño que salió de ahí: **el dato va incrustado en el punto de
decisión**. No una vista para contemplar, sino la cifra al lado de la acción que
habilita.

## Licencia

MIT.
