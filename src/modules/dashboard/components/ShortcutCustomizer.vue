<script setup lang="ts">
// Reordenar con flechas arriba/abajo unicamente, sin arrastrar-y-soltar: el
// legacy (ShortcutCustomizer.vue en pos-saas-legacy) ofrecia las dos formas
// porque el drag-and-drop nativo no funciona en touch (aviso propio del
// legacy: "arrastra para ordenar en escritorio"), pero las flechas por si
// solas ya cubren mouse y touch por igual - no vale la pena duplicar el
// mismo resultado con una segunda interaccion mas dificil de tocar bien en
// celular.
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { DashboardShortcut } from '@/types/dashboard'
import type { NavItem } from '@/types/navigation'
import { NxButton, NxModal } from '@/ui'

import { useUpdateDashboardShortcuts } from '../composables/useDashboardSummary'
import { eligibleNavItems, resolveShortcuts, type ResolvedShortcut } from '../support/shortcuts'

const props = defineProps<{
  modelValue: boolean
  savedShortcuts: DashboardShortcut[] | null
  navItems: NavItem[]
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { notify } = useSystemAlert()
const updateMutation = useUpdateDashboardShortcuts()

const items = ref<ResolvedShortcut[]>([])

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      items.value = resolveShortcuts(props.savedShortcuts, props.navItems)
    }
  },
)

const candidates = computed(() => {
  const used = new Set(items.value.map((i) => i.routeName))
  return eligibleNavItems(props.navItems).filter((item) => !used.has(item.routeName as string))
})

function add(item: NavItem): void {
  items.value.push({ routeName: item.routeName as string, label: item.label, icon: item.icon, color: 'outline' })
}

function remove(index: number): void {
  items.value.splice(index, 1)
}

function moveUp(index: number): void {
  if (index === 0) {
    return
  }
  ;[items.value[index - 1], items.value[index]] = [items.value[index], items.value[index - 1]]
}

function moveDown(index: number): void {
  if (index === items.value.length - 1) {
    return
  }
  ;[items.value[index], items.value[index + 1]] = [items.value[index + 1], items.value[index]]
}

function setColor(index: number, color: ResolvedShortcut['color']): void {
  items.value[index].color = color
}

function save(): void {
  const shortcuts: DashboardShortcut[] = items.value.map((i) => ({ route_name: i.routeName, color: i.color }))
  updateMutation.mutate(shortcuts, {
    onSuccess: () => {
      notify('Atajos guardados.')
      emit('update:modelValue', false)
    },
    onError: () => notify('No pudimos guardar tus atajos. Intenta de nuevo.', 'error'),
  })
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    title="Personalizar atajos"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <div
          v-for="(item, index) in items"
          :key="item.routeName"
          class="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5"
        >
          <div class="flex flex-col">
            <button
              type="button"
              class="text-slate-300 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-300"
              :disabled="index === 0"
              aria-label="Subir"
              @click="moveUp(index)"
            >
              <i class="pi pi-chevron-up text-xs" />
            </button>
            <button
              type="button"
              class="text-slate-300 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-300"
              :disabled="index === items.length - 1"
              aria-label="Bajar"
              @click="moveDown(index)"
            >
              <i class="pi pi-chevron-down text-xs" />
            </button>
          </div>

          <i :class="item.icon" class="text-lg text-indigo-600" />
          <span class="flex-1 text-sm font-medium text-slate-800">{{ item.label }}</span>

          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="h-5 w-5 rounded-full bg-indigo-600"
              :class="item.color === 'primary' ? 'ring-2 ring-offset-1 ring-indigo-600' : ''"
              aria-label="Color destacado"
              @click="setColor(index, 'primary')"
            />
            <button
              type="button"
              class="h-5 w-5 rounded-full border border-slate-300 bg-white"
              :class="item.color === 'outline' ? 'ring-2 ring-offset-1 ring-indigo-600' : ''"
              aria-label="Color neutro"
              @click="setColor(index, 'outline')"
            />
          </div>

          <button type="button" class="shrink-0 text-slate-300 hover:text-red-500" aria-label="Quitar" @click="remove(index)">
            <i class="pi pi-times" />
          </button>
        </div>

        <p v-if="items.length === 0" class="rounded-xl border-2 border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
          Todavía no agregaste ningún atajo.
        </p>
      </div>

      <div>
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Agregar atajo</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="item in candidates"
            :key="item.routeName"
            type="button"
            class="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
            @click="add(item)"
          >
            <i :class="item.icon" class="text-sm" />
            {{ item.label }}
          </button>
          <p v-if="candidates.length === 0" class="text-sm text-slate-400">No hay más secciones disponibles para agregar.</p>
        </div>
      </div>
    </div>

    <template #footer>
      <NxButton class="w-full" :loading="updateMutation.isPending.value" @click="save">Guardar</NxButton>
    </template>
  </NxModal>
</template>
