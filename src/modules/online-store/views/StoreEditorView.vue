<script setup lang="ts">
// El editor de la tienda, a pantalla completa.
//
// Vive fuera del layout del POS a proposito: es una pantalla de trabajo
// continuo -- se entra, se arma la pagina, se sale -- no una seccion que se
// consulta. El menu lateral y la navbar del POS solo le quitarian espacio a
// lo unico que importa aqui, que es ver la tienda mientras se edita.
//
// Tres columnas, como cualquier editor visual: secciones a la izquierda,
// la tienda en vivo al centro, y el formulario de la seccion activa a la
// derecha.
import { useMediaQuery } from '@vueuse/core'
import { computed, onUnmounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

import { BlockEditor, type Block } from '@/packages/block-editor'
import {
  NxButton,
  NxColorPicker,
  NxInput,
  NxInputNumber,
  NxModal,
  NxSwitch,
  NxTextarea,
} from '@/ui'
import GuidedTour from '@/components/GuidedTour.vue'
import { useBusiness } from '@/composables/useBusiness'
import { useGuidedTour } from '@/composables/useGuidedTour'
import { STORE_EDITOR_TOUR } from '@/tours/storeEditor'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import HomePresetPicker from '../components/HomePresetPicker.vue'
import { useEditorHistory, useUndoShortcuts } from '../composables/useEditorHistory'
import { useStoreDraft, type StoreDraft } from '../composables/useStoreDraft'
import { usePublishChecklist } from '../composables/usePublishChecklist'
import PublishChecklist from '../components/PublishChecklist.vue'
import StoreCategoryPicker from '../components/StoreCategoryPicker.vue'
import StoreFontPicker from '../components/StoreFontPicker.vue'
import StoreHomePreview from '../components/StoreHomePreview.vue'
import StoreImageField from '../components/StoreImageField.vue'
import StoreImagePicker from '../components/StoreImagePicker.vue'
import StoreProductPicker from '../components/StoreProductPicker.vue'
import { useStoreImageLibrary } from '../composables/useStoreImageLibrary'
import { useStoreSettings } from '../composables/useStoreSettings'
import { HOME_BLOCK_CATALOG } from '../homeBlockCatalog'
import type { HomePreset } from '../homePresets'

const router = useRouter()
const { settingsQuery, updateMutation } = useStoreSettings()
const { imagesQuery } = useStoreImageLibrary()

const settings = computed(() => settingsQuery.data.value)

// Todo lo editable vive en el borrador (ver useStoreDraft): son ~18 campos y
// dentro de esta vista el <script setup> se volvia ilegible.
const draft = useStoreDraft()
const {
  blocks: homeBlocks,
  primary: primaryColor,
  surface: surfaceColor,
  accent: accentColor,
  font: fontPreset,
} = draft

const errorMessage = ref<string | null>(null)
const saved = ref(false)

/**
 * Colores sugeridos. No son "los que quedan bien" sino un punto de partida:
 * un comerciante frente a una rueda de color infinita casi siempre elige algo
 * peor que cualquiera de estos.
 */
const BRAND_SWATCHES = [
  '#4f46e5',
  '#0f172a',
  '#b91c1c',
  '#c2410c',
  '#15803d',
  '#0e7490',
  '#7e22ce',
  '#be185d',
]

// Fondos: claros de verdad u oscuros de verdad. Los grises intermedios son
// los que arruinan el contraste que deriva useTheme.
const SURFACE_SWATCHES = ['#ffffff', '#faf9f6', '#f5f5f4', '#f8fafc', '#111827', '#1c1917']

// El riel. El orden es el de armar una tienda: primero qué se ve, luego cómo
// se ve, luego los datos del negocio y por último lo que se negocia con el
// comprador. Identidad, envío y buscadores vivían en OTRA pantalla: armar una
// tienda obligaba a salir del editor y volver.
const EDITOR_SECTIONS = [
  { value: 'bloques', label: 'Bloques', icon: 'pi-th-large' },
  { value: 'plantillas', label: 'Plantillas', icon: 'pi-clone' },
  { value: 'colores', label: 'Colores', icon: 'pi-palette' },
  { value: 'tipografia', label: 'Letra', icon: 'pi-pencil' },
  { value: 'marca', label: 'Marca', icon: 'pi-image' },
  { value: 'identidad', label: 'Datos', icon: 'pi-id-card' },
  { value: 'envio', label: 'Envío', icon: 'pi-truck' },
  { value: 'buscadores', label: 'Google', icon: 'pi-search' },
] as const

const editorSection = ref<(typeof EDITOR_SECTIONS)[number]['value']>('bloques')

/**
 * Qué bloque está abierto en el riel. Vive acá y no dentro de BlockEditor
 * porque tocar un bloque en la vista previa tiene que abrirlo: el editor lo
 * expone como v-model justamente para eso.
 */
const expandedBlock = ref<string | null>(null)

/** Ocupar toda la pantalla con la tienda, sin riel ni formulario. */
const maximized = ref(false)

/**
 * La columna derecha se puede plegar para darle el ancho al preview. Se
 * pliega sola al maximizar y vuelve al salir, que es lo esperable.
 */
const panelOpen = ref(true)

// Salir con cambios sin guardar perdia el trabajo en silencio. Ahora se
// pregunta -- y tambien al cerrar la pestana, donde el navegador pone su
// propio aviso porque una confirmacion nuestra ahi no se puede mostrar.
const leaving = ref(false)
let confirmedLeave = false

function onBeforeUnload(event: BeforeUnloadEvent): void {
  if (dirty.value) {
    event.preventDefault()
  }
}

window.addEventListener('beforeunload', onBeforeUnload)
onUnmounted(() => window.removeEventListener('beforeunload', onBeforeUnload))

function tryExit(): void {
  if (dirty.value) {
    leaving.value = true
    return
  }
  router.push({ name: 'online-store.index' })
}

function exitWithoutSaving(): void {
  confirmedLeave = true
  leaving.value = false
  router.push({ name: 'online-store.index' })
}

async function saveAndExit(): Promise<void> {
  await save()
  if (!errorMessage.value) {
    confirmedLeave = true
    leaving.value = false
    router.push({ name: 'online-store.index' })
  }
}

// Tambien cubre irse por el boton "atras" del navegador o por cualquier otro
// enlace, no solo por el boton Salir.
onBeforeRouteLeave(() => {
  if (!dirty.value || confirmedLeave) {
    return true
  }
  leaving.value = true
  return false
})

const checklistOpen = ref(false)

const checklist = usePublishChecklist(
  settings,
  {
    get storeName() {
      return draft.storeName.value
    },
    get whatsappNumber() {
      return draft.whatsappNumber.value
    },
    get seoDescription() {
      return draft.seoDescription.value
    },
    get blocks() {
      return homeBlocks.value
    },
  },
  computed(() => settings.value?.published_products_count ?? 0),
)

function goToSection(section: string): void {
  editorSection.value = section as (typeof EDITOR_SECTIONS)[number]['value']
  checklistOpen.value = false
}

// La llave del recorrido es por NEGOCIO: el dueño con dos negocios lo ve en
// cada uno, y en un POS compartido dos usuarios no se lo pisan.
const { data: currentBusiness } = useBusiness()
const tour = useGuidedTour(
  STORE_EDITOR_TOUR.key,
  STORE_EDITOR_TOUR.steps,
  () => currentBusiness.value?.id ?? null,
  goToSection,
)

// Arranca al abrir el editor, una sola vez por negocio. Espera a que haya
// ajustes cargados: sin eso no se sabe de que negocio es la llave.
watch(
  settings,
  (value) => {
    if (value && hasRoom.value) {
      void tour.start()
    }
  },
  { once: true },
)

function selectFromPreview(blockId: string): void {
  // Si estabas en Colores y tocas un bloque, lo esperable es ir a Bloques:
  // abrirlo en una sección que no se ve no serviría de nada.
  editorSection.value = 'bloques'
  expandedBlock.value = blockId
}
const previewWidth = ref<'mobile' | 'desktop'>('desktop')

/**
 * Con espacio, las tres columnas conviven. Sin el, no se bloquea el editor
 * -- eso dejaba a un comerciante con solo un telefono sin poder ni aplicar
 * una plantilla, o sea sin poder publicar su tienda. Se reacomoda: el
 * formulario ocupa todo, las secciones bajan a una barra inferior y la
 * tienda se mira a pantalla completa cuando se pide.
 */
const hasRoom = useMediaQuery('(min-width: 1024px)')
const previewOpen = ref(false)

// Al volver a una pantalla grande la vista previa deja de ser una capa
// encima: vuelve al centro, donde siempre esta.
watch(hasRoom, (room) => {
  if (room) {
    previewOpen.value = false
  }
})

/**
 * El borrador completo, que es la unidad del historial: deshacer tiene que
 * cubrir tanto un bloque borrado como un color cambiado.
 */
const { record, undo, redo, reset, dirty, canUndo, canRedo } = useEditorHistory<StoreDraft>(
  draft.snapshot,
  draft.restore,
)

watch(
  settings,
  (value) => {
    if (!value) {
      return
    }
    // Copia, no referencia: el editor muta la lista y no debe tocar la
    // cache de la consulta.
    draft.loadFrom(value)

    // Cargar lo guardado NO es un paso deshacible: sin esto el primer
    // Ctrl+Z devolvia el editor a un borrador vacio.
    reset()
  },
  { immediate: true },
)

// `deep` porque editar el texto de un bloque muta un objeto de la lista, no
// la lista: sin esto solo se registrarian agregar/quitar/mover.
// `deep` porque editar el texto de un bloque muta un objeto de la lista, no
// la lista: sin esto solo se registrarian agregar/quitar/mover.
watch(draft.snapshot, () => record(), { deep: true })

// Se apaga con la vista previa abierta: ahi la pantalla la ocupa la tienda a
// tamaño completo y un Ctrl+Z editaria a ciegas por detras.
const detachShortcuts = useUndoShortcuts(
  computed(() => !previewOpen.value),
  undo,
  redo,
)
onUnmounted(detachShortcuts)

/**
 * Los ajustes con lo que se esta editando AHORA, no lo guardado: la vista
 * previa tiene que mostrar el borrador completo, no la mitad.
 */
const previewSettings = draft.previewSettings(settings)

function applyPreset(payload: { blocks: Block[]; theme: HomePreset['theme'] | null }): void {
  homeBlocks.value = payload.blocks
  if (payload.theme) {
    primaryColor.value = payload.theme.primary
    surfaceColor.value = payload.theme.surface
    accentColor.value = payload.theme.accent
    fontPreset.value = payload.theme.font
  }
  editorSection.value = 'bloques'
}

async function save(): Promise<void> {
  errorMessage.value = null
  try {
    await updateMutation.mutateAsync(draft.toPayload())
    // El historial es de lo NO guardado: despues de publicar, deshacer
    // revertiria algo que ya esta en internet sin decirlo.
    reset()
    // Confirmacion breve en el mismo boton: un toast obligaria a mirar a
    // otro lado en una pantalla donde la atencion esta en el centro.
    saved.value = true
    window.setTimeout(() => (saved.value = false), 2500)
  } catch (error) {
    errorMessage.value = extractErrorMessage(error, 'No pudimos guardar los cambios.')
  }
}
</script>

<template>
  <div class="flex h-screen flex-col bg-slate-100">
    <!-- Barra superior: salir, estado y guardar. -->
    <header
      class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2"
    >
      <div class="flex min-w-0 items-center gap-2">
        <button
          type="button"
          class="rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          @click="tryExit"
        >
          <i class="pi pi-arrow-left mr-1 text-xs" /> Salir
        </button>
        <span class="min-w-0 truncate text-sm font-semibold text-slate-800">
          Editor de {{ settings?.store_name || 'tu tienda' }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <p v-if="errorMessage" class="max-w-xs truncate text-xs text-red-600">{{ errorMessage }}</p>

        <!-- Relanzar el recorrido. Nadie retiene seis pasos a la primera, y
             sin esto quien lo salta no lo recupera nunca. -->
        <button
          type="button"
          class="rounded-lg px-2 py-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="Ver el recorrido guiado"
          aria-label="Ver el recorrido guiado"
          @click="tour.start(true)"
        >
          <i class="pi pi-question-circle text-sm" />
        </button>

        <!-- Deshacer/rehacer de lo no guardado. Iconos sin texto: la barra
             tiene que dejarle el ancho al nombre de la tienda. -->
        <div class="flex items-center">
          <button
            type="button"
            class="rounded-lg px-2 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
            :disabled="!canUndo"
            title="Deshacer (Ctrl+Z)"
            aria-label="Deshacer"
            @click="undo"
          >
            <i class="pi pi-undo text-sm" />
          </button>
          <button
            type="button"
            class="rounded-lg px-2 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
            :disabled="!canRedo"
            title="Rehacer (Ctrl+Shift+Z)"
            aria-label="Rehacer"
            @click="redo"
          >
            <i class="pi pi-refresh text-sm" />
          </button>
        </div>

        <NxButton v-if="!hasRoom" variant="outline" icon="pi pi-eye" @click="previewOpen = true">
          Ver
        </NxButton>
        <NxButton data-tour="save" :loading="updateMutation.isPending.value" @click="save">
          {{ saved ? 'Guardado' : 'Guardar' }}
        </NxButton>
      </div>
    </header>

    <!-- Aviso delgado, no una puerta cerrada: se puede trabajar igual. -->
    <p
      v-if="!hasRoom"
      class="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800"
    >
      Desde un computador o una tablet ves tu tienda mientras la editas. Aqui puedes igual: usa
      <strong>Ver</strong> para revisarla.
    </p>

    <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
      <!-- Izquierda: las secciones. -->
      <nav
        v-show="!maximized"
        data-tour="rail"
        class="order-last flex shrink-0 gap-1 overflow-x-auto border-t border-slate-200 bg-white p-2 lg:order-first lg:w-20 lg:flex-col lg:overflow-visible lg:border-r lg:border-t-0"
      >
        <button
          v-for="section in EDITOR_SECTIONS"
          :key="section.value"
          :data-tour="`section-${section.value}`"
          type="button"
          class="flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2.5 transition lg:flex-none"
          :class="
            editorSection === section.value
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-400 hover:bg-slate-50'
          "
          @click="editorSection = section.value"
        >
          <i class="pi text-base" :class="section.icon" />
          <span class="text-[10px] font-semibold leading-tight">{{ section.label }}</span>
        </button>
      </nav>

      <!-- Centro: la tienda, en vivo. Sin espacio se mira a pantalla
           completa, pero es el MISMO componente: dos instancias serian dos
           iframes y dos puentes escuchando. -->
      <main
        v-if="settings && (hasRoom || previewOpen)"
        class="min-w-0 overflow-hidden p-3"
        :class="hasRoom ? 'flex-1' : 'fixed inset-0 z-40 flex flex-col bg-slate-100'"
      >
        <button
          v-if="!hasRoom"
          type="button"
          class="mb-2 self-end rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow"
          @click="previewOpen = false"
        >
          Cerrar
        </button>

        <StoreHomePreview
          v-model:width="previewWidth"
          v-model:maximized="maximized"
          v-model:panel-open="panelOpen"
          class="h-full min-h-0 flex-1"
          :blocks="homeBlocks"
          :settings="previewSettings"
          :images="imagesQuery.data.value ?? []"
          @select="selectFromPreview"
        />
      </main>

      <!-- Derecha: el formulario de la seccion activa. -->
      <!-- Se pliega para darle el ancho a la tienda. `lg:w-0` y no `v-if`:
           asi la transicion se ve, y el formulario no se desmonta (perderia
           el scroll y el bloque abierto). -->
      <aside
        v-show="!maximized"
        class="min-h-0 flex-1 overflow-y-auto bg-white p-4 transition-[width] duration-200 lg:flex-none lg:border-l lg:border-slate-200"
        :class="panelOpen ? 'lg:w-[380px]' : 'lg:w-0 lg:overflow-hidden lg:border-l-0 lg:p-0'"
      >
        <div data-tour="checklist" class="mb-4 border-b border-slate-100 pb-4">
          <button
            type="button"
            class="flex w-full items-center justify-between text-left"
            @click="checklistOpen = !checklistOpen"
          >
            <span class="text-sm font-semibold text-slate-700">
              Listo para abrir
              <span
                v-if="checklist.blockers.value.length > 0"
                class="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
              >
                {{ checklist.blockers.value.length }}
              </span>
            </span>
            <i
              class="pi text-xs text-slate-400"
              :class="checklistOpen ? 'pi-chevron-up' : 'pi-chevron-down'"
            />
          </button>

          <div v-if="checklistOpen" class="mt-3">
            <PublishChecklist
              :items="checklist.items.value"
              :progress="checklist.progress.value"
              :ready="checklist.ready.value"
              @go="goToSection"
            />
          </div>
        </div>

        <HomePresetPicker
          v-if="editorSection === 'plantillas'"
          :has-blocks="homeBlocks.length > 0"
          @apply="applyPreset"
          @close="editorSection = 'bloques'"
        />

        <BlockEditor
          v-else-if="editorSection === 'bloques'"
          v-model="homeBlocks"
          v-model:expanded="expandedBlock"
          :catalog="HOME_BLOCK_CATALOG"
        >
          <template #image-picker="{ value, onSelect }">
            <StoreImagePicker :value="value" @select="onSelect" />
          </template>
          <template #images-picker="{ value, max, onSelect }">
            <StoreImagePicker :value="value" :max="max" multiple @select="onSelect" />
          </template>
          <template #entity-picker="{ value, max, kind, onSelect }">
            <StoreCategoryPicker
              v-if="kind === 'category'"
              :value="value"
              :max="max"
              @select="onSelect"
            />
            <StoreProductPicker v-else :value="value" :max="max" @select="onSelect" />
          </template>
        </BlockEditor>

        <div v-else-if="editorSection === 'colores'">
          <p class="mb-1 text-sm font-semibold text-slate-700">Colores</p>
          <p class="mb-3 text-[11px] text-slate-400">
            Con estos tres armamos toda la tienda. El color del texto lo calculamos solos para que
            siempre se lea.
          </p>
          <div class="flex flex-col gap-4">
            <NxColorPicker
              v-model="primaryColor"
              label="Marca — botones y precios"
              :swatches="BRAND_SWATCHES"
            />
            <NxColorPicker
              v-model="surfaceColor"
              label="Fondo de la tienda"
              :swatches="SURFACE_SWATCHES"
            />
            <NxColorPicker
              v-model="accentColor"
              label="Acento — etiquetas y destacados"
              :swatches="BRAND_SWATCHES"
            />
          </div>
          <!-- Muestra rápida con los tres colores juntos -->
          <div
            class="mt-4 rounded-lg border border-slate-200 p-3"
            :style="{ backgroundColor: surfaceColor }"
          >
            <p class="text-xs font-semibold" :style="{ color: primaryColor }">Así se ve tu marca</p>
            <span
              class="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
              :style="{ backgroundColor: accentColor, color: '#fff' }"
            >
              Etiqueta destacada
            </span>
          </div>
        </div>

        <div v-else-if="editorSection === 'tipografia'">
          <p class="mb-1 text-sm font-semibold text-slate-700">Tipografia</p>
          <p class="mb-3 text-[11px] text-slate-400">Asi se va a ver el texto de tu tienda.</p>
          <StoreFontPicker v-model="fontPreset" />
        </div>

        <div v-else-if="editorSection === 'marca' && settings">
          <p class="mb-3 text-sm font-semibold text-slate-700">Logo y portada</p>
          <div class="flex flex-col gap-4">
            <StoreImageField
              image-slot="logo"
              label="Logo"
              :url="settings.logo_url"
              aspect="square"
              hint="Cuadrado, se ve pequeño."
            />
            <StoreImageField
              image-slot="banner"
              label="Portada"
              :url="settings.banner_url"
              aspect="wide"
              hint="Banda ancha arriba de la tienda."
            />
          </div>
        </div>

        <!-- Datos del negocio. Antes vivían en la pantalla de Tienda online:
             para poner el WhatsApp había que salir del editor. -->
        <div v-else-if="editorSection === 'identidad'" class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-slate-700">Datos de tu tienda</p>
          <NxInput v-model="draft.storeName.value" label="Nombre" />
          <NxTextarea v-model="draft.description.value" label="Descripción corta" :rows="2" />
          <div>
            <NxInput
              v-model="draft.whatsappNumber.value"
              label="WhatsApp"
              placeholder="573001234567"
              inputmode="tel"
            />
            <p class="mt-1 text-[11px] text-slate-400">
              Con indicativo del país y sin espacios ni signos.
            </p>
          </div>
          <NxInput v-model="draft.address.value" label="Dirección" />
          <NxTextarea
            v-model="draft.openingHours.value"
            label="Horario"
            :rows="2"
            placeholder="Lun-Sáb 9:00-19:00"
          />
          <NxInput v-model="draft.instagramUrl.value" label="Instagram" placeholder="https://…" />
          <NxInput v-model="draft.facebookUrl.value" label="Facebook" placeholder="https://…" />
        </div>

        <!-- Lo que se negocia con el comprador antes de pagar. -->
        <div v-else-if="editorSection === 'envio'" class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-slate-700">Envío y condiciones</p>
          <NxInputNumber
            v-model="draft.shippingFlatFee.value"
            label="Costo de envío"
            :min="0"
            currency
          />
          <NxInputNumber
            v-model="draft.minOrderAmount.value"
            label="Pedido mínimo"
            :min="0"
            currency
          />
          <p class="-mt-1 text-[11px] text-slate-400">
            Con 0 no hay mínimo. Si lo pones, el comprador ve cuánto le falta.
          </p>
          <label class="flex items-center gap-2 text-sm text-slate-700">
            <NxSwitch v-model="draft.pickupEnabled.value" />
            Permitir recoger en tienda
          </label>
          <div>
            <NxTextarea v-model="draft.terms.value" label="Condiciones" :rows="4" />
            <p class="mt-1 text-[11px] text-slate-400">
              Devoluciones, tiempos de entrega, lo que quieras dejar claro.
            </p>
          </div>
        </div>

        <!-- Cómo se ve en Google. La vista previa es literal a propósito: es
             lo que más ayuda a escribir un título que quepa. -->
        <div v-else-if="editorSection === 'buscadores'" class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-slate-700">Cómo apareces en Google</p>
          <NxInput
            v-model="draft.seoTitle.value"
            label="Título"
            :placeholder="draft.storeName.value || 'Nombre de tu tienda'"
          />
          <div>
            <NxTextarea v-model="draft.seoDescription.value" label="Descripción" :rows="3" />
            <p class="mt-1 text-[11px] text-slate-400">
              {{ draft.seoDescription.value.length }}/160 — Google corta lo que sobra.
            </p>
          </div>

          <div class="rounded-lg border border-slate-200 p-3">
            <p class="truncate text-[13px] text-emerald-700">
              {{ settings?.public_url ?? 'tienda.nexolu.co/tu-tienda' }}
            </p>
            <p class="truncate text-base text-blue-800">
              {{ draft.seoTitle.value || draft.storeName.value || 'Nombre de tu tienda' }}
            </p>
            <p class="line-clamp-2 text-xs text-slate-500">
              {{
                draft.seoDescription.value ||
                draft.description.value ||
                'Escribe una descripción para que Google muestre algo aquí.'
              }}
            </p>
          </div>
        </div>
      </aside>
    </div>

    <GuidedTour
      :step="tour.step.value"
      :index="tour.stepIndex.value"
      :total="tour.total"
      :is-last="tour.isLast.value"
      @next="tour.next"
      @back="tour.back"
      @skip="tour.finish"
    />

    <!-- Salir con cambios sin guardar perdía el trabajo sin decir nada. -->
    <NxModal v-model="leaving" title="Tienes cambios sin guardar" size="sm">
      <p class="text-sm text-slate-600">
        Si sales ahora, lo que cambiaste no se publica y se pierde.
      </p>

      <template #footer>
        <div class="flex justify-end gap-2">
          <NxButton variant="ghost" @click="leaving = false">Seguir editando</NxButton>
          <NxButton variant="danger" @click="exitWithoutSaving"> Salir sin guardar </NxButton>
          <NxButton :loading="updateMutation.isPending.value" @click="saveAndExit">
            Guardar y salir
          </NxButton>
        </div>
      </template>
    </NxModal>
  </div>
</template>
