<script setup lang="ts">
// Modal de crear/editar categoria - un solo componente para los dos casos
// (props.category null = crear, con valor = editar), igual que
// TableManagerModal/PaymentModal. Un solo nivel de subcategorias (ver
// docblock de ProductCategory en el backend): el selector de "categoría
// padre" solo ofrece categorias de nivel raiz, sin la propia categoria en
// edicion.
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { ProductCategory } from '@/types/product'
import { NxButton, NxInput, NxModal, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useCategoryMutations } from '../composables/useCategoryMutations'
import CategoryIconPicker from './CategoryIconPicker.vue'

const props = defineProps<{
  modelValue: boolean
  category: ProductCategory | null
  categories: ProductCategory[]
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { createMutation, updateMutation } = useCategoryMutations()
const { notify } = useSystemAlert()

const name = ref('')
const description = ref('')
const icon = ref('inventory_2')
const parentId = ref<number | null>(null)
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

function resetForm(): void {
  name.value = props.category?.name ?? ''
  description.value = props.category?.description ?? ''
  icon.value = props.category?.icon ?? 'inventory_2'
  parentId.value = props.category?.parent_id ?? null
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

// Nivel raiz: sin parent_id, y sin la propia categoria (no puede ser su
// propia padre) - la regla de "un solo nivel" la termina de validar el
// backend, esto solo evita el caso obvio en el picker. Se antepone una
// opcion "Sin categoría padre" (id null) para poder volver una
// subcategoria a nivel raiz.
const parentOptions = computed(() => [
  { id: null as number | null, name: 'Sin categoría padre' },
  ...props.categories
    .filter((c) => c.parent_id === null && c.id !== props.category?.id)
    .map((c) => ({ id: c.id as number | null, name: c.name })),
])

const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)
const modalTitle = computed(() => (props.category ? 'Editar categoría' : 'Nueva categoría'))

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  if (!name.value.trim()) {
    fieldErrors.value.name = 'El nombre es obligatorio.'
    return
  }

  const payload = {
    name: name.value.trim(),
    description: description.value.trim() || null,
    icon: icon.value,
    parent_id: parentId.value,
  }

  try {
    if (props.category) {
      await updateMutation.mutateAsync({ id: props.category.id, payload })
      notify('Categoría actualizada')
    } else {
      await createMutation.mutateAsync(payload)
      notify('Categoría creada')
    }
    emit('update:modelValue', false)
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos guardar la categoría.')
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

      <NxInput v-model="name" label="Nombre" required :error="fieldErrors.name" />
      <NxInput v-model="description" label="Descripción (opcional)" />
      <NxSelect
        :model-value="parentId"
        :options="parentOptions"
        option-label="name"
        option-value="id"
        label="Categoría padre (opcional)"
        :error="fieldErrors.parent_id"
        @update:model-value="parentId = $event as number | null"
      />
      <CategoryIconPicker v-model="icon" />
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="isSaving" @click="submit">Guardar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
