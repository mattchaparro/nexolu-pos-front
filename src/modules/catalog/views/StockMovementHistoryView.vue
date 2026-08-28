<script setup lang="ts">
// Historial completo de movimientos de stock de un producto o insumo -
// pagina propia (no el mini-listado de "ultimos movimientos" dentro de
// StockMovementModal), calcada de Products/StockHistory.vue del legacy.
// El `kind` viene de route.meta (dos rutas estaticas, una por tipo - ver
// router/index.ts), igual que el resto de rutas de Catalogo.
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { StockMovementType } from '@/types/inventory'
import { NxButton, NxPageHeader } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import { useIngredient } from '../composables/useIngredient'
import { useProduct } from '../composables/useProduct'
import { type StockSubjectKind, useStockMovements } from '../composables/useStockMovements'

const route = useRoute()
const router = useRouter()

const subjectId = computed(() => (route.params.id ? Number(route.params.id) : null))
const kind = computed<StockSubjectKind>(() => (route.meta.stockSubjectKind as StockSubjectKind) ?? 'product')

const productQuery = useProduct(computed(() => (kind.value === 'product' ? subjectId.value : null)))
const ingredientQuery = useIngredient(computed(() => (kind.value === 'ingredient' ? subjectId.value : null)))

const subjectName = computed(() => (kind.value === 'product' ? productQuery.data.value?.name : ingredientQuery.data.value?.name))
const subjectUnit = computed(() => (kind.value === 'ingredient' ? ingredientQuery.data.value?.unit : undefined))
const subjectStock = computed(() => {
  if (kind.value === 'product') {
    return productQuery.data.value?.stock
  }
  return ingredientQuery.data.value != null ? Number(ingredientQuery.data.value.stock) : undefined
})
const isSubjectPending = computed(() =>
  kind.value === 'product' ? productQuery.isPending.value : ingredientQuery.isPending.value,
)

const page = ref(1)
const { movementsQuery } = useStockMovements(kind, subjectId, page)
const meta = computed(() => movementsQuery.data.value?.meta)

// Mismos labels/iconos/colores que StockMovementsTab.vue (reportes de
// inventario) para el mismo dato - no reinventar el mapeo por pantalla.
const TYPE_INFO: Record<StockMovementType, { label: string; icon: string; class: string }> = {
  entry: { label: 'Entrada', icon: 'pi pi-arrow-down', class: 'text-emerald-600' },
  exit: { label: 'Salida', icon: 'pi pi-arrow-up', class: 'text-red-500' },
  adjustment: { label: 'Ajuste', icon: 'pi pi-sliders-h', class: 'text-slate-500' },
  sale: { label: 'Venta', icon: 'pi pi-shopping-cart', class: 'text-indigo-500' },
}
// Fallback generico para un `type` que el backend agregue despues sin que
// esta lista se actualice - bug real reportado: un tipo no mapeado (aca
// faltaba 'sale') hacia TYPE_INFO[movement.type] undefined, y
// undefined.icon tiraba un TypeError que rompia el render de toda la
// lista, dejando la pantalla trabada en el skeleton de carga para siempre
// (el catch nunca se disparaba porque no era un error de la peticion, era
// un error de render). Acceso opcional + este fallback evita que vuelva a
// pasar con el proximo tipo que se sume en el backend.
const UNKNOWN_TYPE_INFO = { label: 'Movimiento', icon: 'pi pi-circle', class: 'text-slate-400' }
function typeInfo(type: StockMovementType): { label: string; icon: string; class: string } {
  return TYPE_INFO[type] ?? UNKNOWN_TYPE_INFO
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function goBack(): void {
  router.push({ name: 'catalog.index' })
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center gap-2">
      <button type="button" class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" @click="goBack">
        <i class="pi pi-arrow-left" />
      </button>
      <NxPageHeader
        :title="subjectName ?? 'Historial de movimientos'"
        :subtitle="subjectStock != null ? `Stock actual: ${subjectStock}${subjectUnit ? ` ${subjectUnit}` : ''}` : undefined"
        icon="pi pi-history"
        compact
      />
    </div>

    <template v-if="isSubjectPending || movementsQuery.isPending.value">
      <div class="flex flex-col gap-2">
        <div v-for="n in 5" :key="n" class="h-16 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </template>

    <template v-else>
      <div class="flex flex-col gap-2">
        <div
          v-for="movement in movementsQuery.data.value?.data ?? []"
          :key="movement.id"
          class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <i :class="[typeInfo(movement.type).icon, typeInfo(movement.type).class]" class="text-xl" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-slate-900">
              {{ typeInfo(movement.type).label }}
              <span v-if="movement.reason?.label" class="text-xs font-normal text-slate-500"> · {{ movement.reason.label }}</span>
              <span v-if="movement.reference" class="text-slate-400"> - {{ movement.reference }}</span>
            </p>
            <p v-if="movement.notes" class="text-xs text-slate-400">{{ movement.notes }}</p>
            <p v-if="movement.unit_cost_cop != null" class="text-xs text-slate-400">
              Costo unitario: {{ formatCop(Number(movement.unit_cost_cop)) }}
            </p>
            <p class="text-xs text-slate-400">
              {{ movement.user?.name ?? 'Sistema' }} · {{ formatDate(movement.created_at) }}
            </p>
          </div>
          <div class="shrink-0 text-lg font-bold" :class="movement.quantity > 0 ? 'text-emerald-600' : 'text-red-500'">
            {{ movement.quantity > 0 ? '+' : '' }}{{ movement.quantity }}
          </div>
        </div>

        <div v-if="!movementsQuery.data.value?.data.length" class="flex flex-col items-center gap-2 py-12 text-slate-400">
          <i class="pi pi-history text-4xl" />
          <p class="text-sm">No hay movimientos registrados.</p>
        </div>
      </div>

      <div v-if="meta && meta.last_page > 1" class="flex items-center justify-between">
        <NxButton variant="outline" icon="pi pi-chevron-left" :disabled="page <= 1" @click="page -= 1">Anterior</NxButton>
        <p class="text-xs text-slate-400">Página {{ meta.current_page }} de {{ meta.last_page }}</p>
        <NxButton variant="outline" icon="pi pi-chevron-right" :disabled="page >= meta.last_page" @click="page += 1">
          Siguiente
        </NxButton>
      </div>
    </template>
  </div>
</template>
