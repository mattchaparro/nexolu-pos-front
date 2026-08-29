<script setup lang="ts">
// Modal de crear/editar atributo combinable (Talla, Color, ...) - un solo
// componente para los dos casos (props.attribute null = crear, con valor =
// editar), igual que CategoryFormModal. Los valores (S/M/L, Rojo/Azul, ...)
// se editan como filas repetibles de texto simple, mismo patron que
// ProductIngredientsEditor pero sin cantidad (aca cada fila es solo un
// valor).
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { ProductAttribute, ProductAttributePayload } from '@/types/product'
import { NxButton, NxInput, NxModal } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useProductAttributeMutations } from '../composables/useProductAttributeMutations'

const props = defineProps<{
  modelValue: boolean
  attribute: ProductAttribute | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { createMutation, updateMutation } = useProductAttributeMutations()
const { notify } = useSystemAlert()

const name = ref('')
const values = ref<{ id?: number; value: string }[]>([])
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

function resetForm(): void {
  name.value = props.attribute?.name ?? ''
  values.value = props.attribute?.values.map((v) => ({ id: v.id, value: v.value })) ?? [{ value: '' }]
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

function addValue(): void {
  values.value = [...values.value, { value: '' }]
}

function removeValue(index: number): void {
  values.value = values.value.filter((_, i) => i !== index)
}

const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)
const modalTitle = computed(() => (props.attribute ? 'Editar atributo' : 'Nuevo atributo'))

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  if (!name.value.trim()) {
    fieldErrors.value.name = 'El nombre es obligatorio.'
    return
  }

  const cleanValues = values.value.map((v) => ({ ...v, value: v.value.trim() })).filter((v) => v.value !== '')
  if (cleanValues.length === 0) {
    formError.value = 'Agrega al menos un valor (ej. S, M, L).'
    return
  }

  const payload: ProductAttributePayload = { name: name.value.trim(), values: cleanValues }

  try {
    if (props.attribute) {
      await updateMutation.mutateAsync({ id: props.attribute.id, payload })
      notify('Atributo actualizado')
    } else {
      await createMutation.mutateAsync(payload)
      notify('Atributo creado')
    }
    emit('update:modelValue', false)
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos guardar el atributo.')
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
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <NxInput v-model="name" label="Nombre (ej. Talla, Color)" required :error="fieldErrors.name" />

      <div class="flex flex-col gap-2">
        <p class="text-xs font-semibold tracking-wide text-slate-400 uppercase">Valores</p>
        <div v-for="(row, index) in values" :key="row.id ?? `new-${index}`" class="flex items-center gap-2">
          <NxInput v-model="row.value" label="" placeholder="ej. S" size="sm" class="flex-1" />
          <button type="button" class="shrink-0 text-slate-300 hover:text-red-500" @click="removeValue(index)">
            <i class="pi pi-times" />
          </button>
        </div>
        <button
          type="button"
          class="text-left text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          @click="addValue"
        >
          + Agregar valor
        </button>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="isSaving" @click="submit">Guardar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
