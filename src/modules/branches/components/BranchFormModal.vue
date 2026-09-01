<script setup lang="ts">
// Crear/editar una sede. Mismo patron modal que DiscountFormModal
// (resetForm / watch-on-open / fieldErrors / formError / submit).
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Branch, BranchPayload } from '@/types/branch'
import { NxButton, NxInput, NxModal, NxSwitch } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useBranchMutations } from '../composables/useBranchMutations'

const props = defineProps<{
  modelValue: boolean
  branch: Branch | null
  /** Prefijo del negocio, para explicar que hereda una sede sin el suyo. */
  businessInvoicePrefix: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { createMutation, updateMutation } = useBranchMutations()
const { notify } = useSystemAlert()

const name = ref('')
const code = ref('')
const address = ref('')
const phone = ref('')
const invoicePrefix = ref('')
const isMain = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

const isEditing = computed(() => props.branch !== null)
const saving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

function resetForm(): void {
  name.value = props.branch?.name ?? ''
  code.value = props.branch?.code ?? ''
  address.value = props.branch?.address ?? ''
  phone.value = props.branch?.phone ?? ''
  // El backend devuelve el prefijo YA resuelto (el del negocio si la sede no
  // tiene uno propio), asi que no se puede distinguir "heredado" de "propio"
  // mirando el valor. Se deja vacio cuando coincide con el del negocio, para
  // que el placeholder explique que se esta heredando.
  invoicePrefix.value =
    props.branch && props.branch.invoice_prefix !== props.businessInvoicePrefix
      ? props.branch.invoice_prefix
      : ''
  isMain.value = props.branch?.is_main ?? false
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

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  const payload: BranchPayload = {
    name: name.value.trim(),
    code: code.value.trim() || null,
    address: address.value.trim() || null,
    phone: phone.value.trim() || null,
    // Vacio significa "usa el del negocio", que es null en la base.
    invoice_prefix: invoicePrefix.value.trim() || null,
  }

  try {
    if (props.branch) {
      await updateMutation.mutateAsync({
        id: props.branch.id,
        // is_main solo se manda al editar: al crear, la principal no se
        // elige (nace con el negocio, ver BranchController::store).
        payload: { ...payload, is_main: isMain.value },
      })
      notify('Sede actualizada.', 'success')
    } else {
      await createMutation.mutateAsync(payload)
      notify('Sede creada.', 'success')
    }
    emit('update:modelValue', false)
  } catch (error) {
    fieldErrors.value = extractFieldErrors(error)
    formError.value = extractErrorMessage(error, 'No pudimos guardar la sede.')
  }
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="isEditing ? 'Editar sede' : 'Nueva sede'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <NxInput
        v-model="name"
        label="Nombre"
        placeholder="Centro comercial"
        :error="fieldErrors.name"
      />

      <NxInput
        v-model="code"
        label="Código (opcional)"
        placeholder="CC"
        :error="fieldErrors.code"
      />

      <NxInput
        v-model="address"
        label="Dirección"
        placeholder="Local 204"
        :error="fieldErrors.address"
      />

      <NxInput v-model="phone" label="Teléfono" :error="fieldErrors.phone" />

      <NxInput
        v-model="invoicePrefix"
        label="Prefijo de factura"
        :placeholder="`Sin prefijo propio usa ${businessInvoicePrefix}`"
        :error="fieldErrors.invoice_prefix"
      />
      <p class="-mt-2 text-xs text-slate-500">
        Cada sede lleva su propio consecutivo de facturas. Déjalo vacío para usar el del negocio.
      </p>

      <div v-if="isEditing && !branch?.is_main" class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-slate-700">Marcar como sede principal</p>
          <p class="text-xs text-slate-500">
            La que era principal deja de serlo. Es la sede a la que llega todo lo que no tiene una
            asignada.
          </p>
        </div>
        <NxSwitch v-model="isMain" />
      </div>

      <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
    </div>

    <template #footer>
      <NxButton variant="secondary" @click="emit('update:modelValue', false)">Cancelar</NxButton>
      <NxButton :loading="saving" @click="submit">Guardar</NxButton>
    </template>
  </NxModal>
</template>
