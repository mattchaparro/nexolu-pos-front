<script setup lang="ts">
// Editor de permisos granulares de un empleado - checkboxes agrupados por
// categoria (GET /employees/permission-catalog). Solo aplica a role='employee'
// (un admin hereda todo por rol, ver EmployeeResource) y solo existe si el
// negocio tiene feature:permissions_management (gateado en UsersView.vue,
// que no ofrece esta accion sin el feature).
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Employee } from '@/types/employee'
import { NxButton, NxModal } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useEmployeeMutations } from '../composables/useEmployeeMutations'
import { usePermissionCatalog } from '../composables/usePermissionCatalog'

const props = defineProps<{
  modelValue: boolean
  employee: Employee | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { notify } = useSystemAlert()
const { updatePermissionsMutation } = useEmployeeMutations()
const catalogQuery = usePermissionCatalog(props.modelValue)

const selected = ref<Set<string>>(new Set())
const formError = ref<string | null>(null)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      selected.value = new Set(props.employee?.permissions ?? [])
      formError.value = null
      catalogQuery.refetch()
    }
  },
)

function toggle(name: string): void {
  const next = new Set(selected.value)
  if (next.has(name)) {
    next.delete(name)
  } else {
    next.add(name)
  }
  selected.value = next
}

const isSaving = computed(() => updatePermissionsMutation.isPending.value)

async function submit(): Promise<void> {
  if (!props.employee) {
    return
  }
  formError.value = null

  try {
    await updatePermissionsMutation.mutateAsync({
      id: props.employee.id,
      permissions: Array.from(selected.value),
    })
    notify('Permisos actualizados')
    emit('update:modelValue', false)
  } catch (error) {
    formError.value = extractErrorMessage(error, 'No pudimos guardar los permisos.')
  }
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="employee ? `Permisos — ${employee.name}` : 'Permisos'"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <div v-if="catalogQuery.isPending.value" class="h-40 animate-pulse rounded-xl bg-slate-100" />

      <div v-else class="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
        <div v-for="category in catalogQuery.data.value ?? []" :key="category.key">
          <p class="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <span class="material-icons text-base text-indigo-500">{{ category.icon }}</span>
            {{ category.label }}
          </p>
          <div class="flex flex-col gap-1.5">
            <label
              v-for="permission in category.permissions"
              :key="permission.name"
              class="flex items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                class="mt-0.5 h-4 w-4 rounded accent-indigo-600"
                :checked="selected.has(permission.name)"
                @change="toggle(permission.name)"
              />
              <span class="flex-1">
                <span class="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                  {{ permission.label }}
                  <span v-if="permission.recommended" class="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
                    Recomendado
                  </span>
                  <span v-if="permission.warning" class="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                    Sensible
                  </span>
                </span>
                <span class="block text-xs text-slate-400">{{ permission.description }}</span>
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="isSaving" @click="submit">Guardar permisos</NxButton>
      </div>
    </template>
  </NxModal>
</template>
