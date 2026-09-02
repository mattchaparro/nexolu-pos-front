<script setup lang="ts">
// Crear/editar descuento - mismo patron modal que ClientFormModal
// (resetForm/watch-on-open/fieldErrors/formError/submit). Puerto de
// Admin/Discounts/Save.vue del legacy.
import { computed, ref, watch } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Discount, DiscountScope, DiscountType } from '@/types/discount'
import { NxButton, NxInput, NxInputNumber, NxModal, NxSelect, NxSwitch } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { hasFeature } from '@/utils/hasFeature'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useDiscountMutations } from '../composables/useDiscountMutations'
import { useDiscountProductOptions } from '../composables/useDiscountProductOptions'

const props = defineProps<{
  modelValue: boolean
  discount: Discount | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { createMutation, updateMutation } = useDiscountMutations()
const { data: products } = useDiscountProductOptions()
const { notify } = useSystemAlert()

const TYPE_OPTIONS: { label: string; value: DiscountType }[] = [
  { label: 'Porcentaje (%)', value: 'percentage' },
  { label: 'Monto fijo ($)', value: 'fixed' },
]
const SCOPE_OPTIONS: { label: string; value: DiscountScope }[] = [
  { label: 'Por producto', value: 'item' },
  { label: 'Por cuenta completa', value: 'cart' },
]

const name = ref('')
const type = ref<DiscountType>('percentage')
const value = ref<number | null>(null)
const scope = ref<DiscountScope>('cart')
const productId = ref<number | null>(null)
const isActive = ref(true)
// Campos de CUPÓN. Un descuento del mostrador los deja vacíos: lo que
// convierte un descuento en cupón es tener código, porque es lo que el
// comprador escribe. Solo se ofrecen si el negocio tiene tienda online.
const code = ref('')
const startsAt = ref('')
const endsAt = ref('')
const maxUses = ref<number | null>(null)
const minOrderAmount = ref<number | null>(null)
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

const productOptions = computed(() => [
  { id: null, name: 'Cualquier producto' },
  ...(products.value ?? []).map((p) => ({ id: p.id, name: p.name })),
])

function resetForm(): void {
  name.value = props.discount?.name ?? ''
  type.value = props.discount?.type ?? 'percentage'
  value.value = props.discount?.value ?? null
  scope.value = props.discount?.scope ?? 'cart'
  productId.value = props.discount?.product?.id ?? null
  isActive.value = props.discount?.is_active ?? true
  code.value = props.discount?.code ?? ''
  startsAt.value = props.discount?.starts_at?.slice(0, 10) ?? ''
  endsAt.value = props.discount?.ends_at?.slice(0, 10) ?? ''
  maxUses.value = props.discount?.max_uses ?? null
  minOrderAmount.value = props.discount?.min_order_amount ?? null
  fieldErrors.value = {}
  formError.value = null
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
    }
  },
)

// Descuento de cuenta completa no se ata a un producto - limpiar de una vez
// si el usuario cambia el alcance despues de haber elegido uno.
watch(scope, (value) => {
  if (value === 'cart') {
    productId.value = null
  }
})

// Los cupones son de la tienda online: a quien no la tiene no se le
// ofrecen campos que no puede usar.
const { data: business } = useBusiness()
const tieneTienda = computed(() => hasFeature(business.value, 'online_store'))
const isEdit = computed(() => props.discount !== null)
const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)
const modalTitle = computed(() => (isEdit.value ? 'Editar descuento' : 'Nuevo descuento'))
const valueMax = computed(() => (type.value === 'percentage' ? 100 : undefined))

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  if (!name.value.trim()) {
    fieldErrors.value.name = 'El nombre es obligatorio.'
    return
  }
  if (!value.value || value.value <= 0) {
    fieldErrors.value.value = 'Indica un valor mayor a cero.'
    return
  }
  if (type.value === 'percentage' && value.value > 100) {
    fieldErrors.value.value = 'Un descuento porcentual no puede superar 100%.'
    return
  }

  const payload = {
    name: name.value.trim(),
    type: type.value,
    value: value.value,
    scope: scope.value,
    product_id: scope.value === 'item' ? productId.value : null,
    is_active: isActive.value,
    // Vacío = descuento del mostrador, sin código que redimir.
    code: code.value.trim().toUpperCase() || null,
    starts_at: startsAt.value || null,
    ends_at: endsAt.value || null,
    max_uses: maxUses.value,
    min_order_amount: minOrderAmount.value,
  }

  try {
    if (props.discount) {
      await updateMutation.mutateAsync({ id: props.discount.id, payload })
      notify('Descuento actualizado')
    } else {
      await createMutation.mutateAsync(payload)
      notify('Descuento creado')
    }
    emit('update:modelValue', false)
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos guardar el descuento.')
    }
  }
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="modalTitle"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-3">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
        {{ formError }}
      </p>

      <NxInput v-model="name" label="Nombre" required :error="fieldErrors.name" />

      <div class="grid grid-cols-2 gap-3">
        <NxSelect
          v-model="type"
          label="Tipo"
          :options="TYPE_OPTIONS"
          option-label="label"
          option-value="value"
        />
        <NxInputNumber
          v-model="value"
          :label="type === 'percentage' ? 'Valor (%)' : 'Valor ($)'"
          required
          :currency="type === 'fixed'"
          :min="0"
          :max="valueMax"
          :error="fieldErrors.value"
        />
      </div>

      <NxSelect
        v-model="scope"
        label="Se aplica a"
        :options="SCOPE_OPTIONS"
        option-label="label"
        option-value="value"
      />

      <NxSelect
        v-if="scope === 'item'"
        v-model="productId"
        label="Producto (opcional)"
        :options="productOptions"
        option-label="name"
        option-value="id"
        filter
      />

      <label class="flex items-center justify-between gap-2 py-1 text-sm text-slate-700">
        Descuento activo
        <NxSwitch v-model="isActive" />
      </label>

      <!-- Cupón: solo con tienda online. Lo que convierte un descuento en
           cupón es tener código, porque es lo que el comprador escribe en el
           checkout. Sin código sigue siendo un descuento del mostrador. -->
      <div v-if="tieneTienda" class="flex flex-col gap-3 border-t border-slate-100 pt-3">
        <div>
          <NxInput
            v-model="code"
            label="Código del cupón"
            placeholder="BIENVENIDA10"
            :error="fieldErrors.code"
          />
          <p class="mt-1 text-[11px] text-slate-400">
            Déjalo vacío si es un descuento que aplicas tú en la caja. Con código, el comprador lo
            escribe en tu tienda online.
            <template v-if="props.discount && props.discount.code">
              Se ha usado {{ props.discount.used_count }}
              {{ props.discount.used_count === 1 ? 'vez' : 'veces' }}.
            </template>
          </p>
        </div>

        <template v-if="code.trim() !== ''">
          <div class="grid grid-cols-2 gap-3">
            <NxInput v-model="startsAt" type="date" label="Desde" :error="fieldErrors.starts_at" />
            <NxInput v-model="endsAt" type="date" label="Hasta" :error="fieldErrors.ends_at" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <NxInputNumber
              v-model="maxUses"
              label="Máximo de usos"
              :min="1"
              :error="fieldErrors.max_uses"
            />
            <NxInputNumber
              v-model="minOrderAmount"
              label="Compra mínima"
              currency
              :min="0"
              :error="fieldErrors.min_order_amount"
            />
          </div>
          <p class="text-[11px] text-slate-400">
            Los campos vacíos no limitan: sin fechas el cupón está siempre vigente, y sin máximo de
            usos no se agota.
          </p>
        </template>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)"
          >Cancelar</NxButton
        >
        <NxButton class="flex-1" :loading="isSaving" @click="submit">Guardar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
