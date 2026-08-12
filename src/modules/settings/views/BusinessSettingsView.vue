<script setup lang="ts">
// Puerto parcial de Admin/Settings/Index.vue del legacy - por ahora solo
// la seccion "Ordenes de servicio" (unica que un modulo migrado consume:
// ServiceOrderFormView.vue). El resto de secciones de legacy (info del
// negocio, redes, tickets, medios de pago, mesas, domicilios, cargos,
// inventario, apartados) ya tienen su propio lugar en este app o todavia
// no fueron migradas - se agregan a esta vista cuando haga falta, no de
// una sola vez.
import { computed, ref, watch } from 'vue'

import { useAuthStore } from '@/stores/auth.store'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import { useUpdateBusinessMutation } from '@/composables/useUpdateBusinessMutation'
import { NxButton, NxCard, NxInput, NxPageHeader, NxToggleButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

const auth = useAuthStore()
const { data: business, isPending } = useBusiness()
const { notify } = useSystemAlert()

const canEdit = computed(() => auth.user?.is_business_owner === true || auth.user?.roles?.includes('admin') === true)

const showCatalog = ref(true)
const defaultServiceName = ref('')

watch(
  business,
  (value) => {
    if (!value) {
      return
    }
    showCatalog.value = value.service_orders_show_catalog
    defaultServiceName.value = value.service_orders_default_service_name ?? ''
  },
  { immediate: true },
)

const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)
const { mutateAsync, isPending: isSaving } = useUpdateBusinessMutation()

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  try {
    await mutateAsync({
      service_orders_show_catalog: showCatalog.value,
      service_orders_default_service_name: defaultServiceName.value.trim() || null,
    })
    notify('Ajustes guardados')
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos guardar los ajustes.')
    }
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <NxPageHeader title="Ajustes" icon="pi pi-cog" compact />

    <p v-if="formError" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ formError }}</p>

    <div v-if="isPending" class="h-48 animate-pulse rounded-xl bg-slate-100" />

    <template v-else>
      <NxCard v-if="business?.can_access_services">
        <p class="mb-1 text-sm font-semibold text-slate-700">Órdenes de servicio</p>
        <p class="mb-3 text-xs text-slate-500">Opciones para el formulario de creación de órdenes.</p>

        <div class="flex flex-col gap-4">
          <div>
            <NxToggleButton v-model="showCatalog" label="Mostrar catálogo de servicios" icon="pi pi-wrench" :disabled="!canEdit" />
            <p class="mt-1 text-xs text-slate-500">Permite seleccionar un servicio del catálogo al crear una orden.</p>
          </div>

          <div>
            <NxInput
              v-model="defaultServiceName"
              label="Nombre de servicio por defecto"
              placeholder="Ej. Servicio Técnico"
              :disabled="!canEdit"
              :error="fieldErrors.service_orders_default_service_name"
            />
            <p class="mt-1 text-xs text-slate-500">Se pre-llena en el campo nombre al crear una orden nueva.</p>
          </div>
        </div>
      </NxCard>

      <p v-else class="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        Este negocio no tiene módulos con ajustes disponibles todavía.
      </p>

      <NxButton v-if="canEdit && business?.can_access_services" :loading="isSaving" @click="submit">Guardar cambios</NxButton>
    </template>
  </div>
</template>
