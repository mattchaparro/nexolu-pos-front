# block-editor

Editor genérico de **listas de bloques**: reordenar, agregar, quitar,
encender/apagar y editar los campos de cada uno, con el formulario generado
desde un esquema.

No sabe nada de Nexolú, del POS ni de tiendas online. El primer consumidor
es el home de la tienda (`src/modules/online-store`), pero está pensado para
reusarse en otros productos del ecosistema.

## Regla dura: este paquete no importa nada de fuera

Salvo `vue`. Nada de `@/ui`, `@/services`, PrimeVue, el cliente HTTP ni
tipos del POS. Es lo único que hace que extraerlo a un repo propio sea un
`git mv` y no una reescritura.

Todo lo específico del anfitrión entra por props, slots o callbacks:

| Necesidad | Cómo entra |
|---|---|
| Qué bloques existen y qué campos tienen | prop `catalog` |
| Elegir una imagen | slot `image-picker` |
| Elegir entidades (productos, servicios…) | slot `entity-picker` |
| Estética | variables CSS `--bke-*` (ver `styles.css`) |

Si algún día hace falta importar algo de fuera, es señal de que ese algo
debería entrar por el borde, no de que la regla esté mal.

## Uso

```vue
<BlockEditor v-model="blocks" :catalog="catalog">
  <template #image-picker="{ value, onSelect }">
    <MiSelectorDeImagenes :value="value" @select="onSelect" />
  </template>
</BlockEditor>
```

## Accesibilidad del reordenamiento

Arrastrar con el ratón usa HTML5 drag & drop, que **no funciona en táctil**.
Por eso cada bloque tiene además botones de subir/bajar, que sirven con
dedo y con teclado. No son un extra: en un POS sobre tablet son el camino
principal.
