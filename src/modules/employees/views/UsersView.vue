<script setup lang="ts">
// Usuarios - equipo del negocio (empleados + admins adicionales), con
// permisos granulares por empleado. Puerto de Admin/Users/Index.vue del
// legacy. El dueño del negocio (is_business_owner) siempre existe y no se
// gestiona desde aca (ver EmployeeController).
import { computed, ref } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import { useAuthStore } from '@/stores/auth.store'
import type { Employee } from '@/types/employee'
import { NxButton, NxPageHeader } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { hasFeature } from '@/utils/hasFeature'

import EmployeeFormModal from '../components/EmployeeFormModal.vue'
import EmployeePermissionsModal from '../components/EmployeePermissionsModal.vue'
import { useEmployeeMutations } from '../composables/useEmployeeMutations'
import { useEmployees } from '../composables/useEmployees'

const { data: business } = useBusiness()
const auth = useAuthStore()
const { notify } = useSystemAlert()

const employeesQuery = useEmployees()
const { toggleMutation, deleteMutation } = useEmployeeMutations()

const canManagePermissions = computed(() => hasFeature(business.value, 'permissions_management'))

const formModalOpen = ref(false)
const editingEmployee = ref<Employee | null>(null)

function openNewEmployee(): void {
  editingEmployee.value = null
  formModalOpen.value = true
}

function openEditEmployee(employee: Employee): void {
  editingEmployee.value = employee
  formModalOpen.value = true
}

const permissionsModalOpen = ref(false)
const managingPermissionsFor = ref<Employee | null>(null)

function openPermissions(employee: Employee): void {
  managingPermissionsFor.value = employee
  permissionsModalOpen.value = true
}

function isSelf(employee: Employee): boolean {
  return auth.user?.id === employee.id
}

async function toggle(employee: Employee): Promise<void> {
  try {
    await toggleMutation.mutateAsync(employee.id)
    notify(employee.is_active ? 'Usuario desactivado' : 'Usuario activado')
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos actualizar el usuario.'))
  }
}

async function remove(employee: Employee): Promise<void> {
  if (!window.confirm(`¿Eliminar a "${employee.name}"? Esta acción no se puede deshacer.`)) {
    return
  }
  try {
    await deleteMutation.mutateAsync(employee.id)
    notify('Usuario eliminado')
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos eliminar el usuario.'))
  }
}

function formatLastActive(iso: string | null): string {
  if (!iso) {
    return 'Nunca'
  }
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Usuarios" icon="pi pi-users" compact />
      <NxButton icon="pi pi-plus" @click="openNewEmployee">Usuario</NxButton>
    </div>

    <div v-if="employeesQuery.isPending.value" class="flex flex-col gap-2">
      <div v-for="i in 3" :key="i" class="h-16 animate-pulse rounded-xl bg-slate-100" />
    </div>

    <div v-else class="flex flex-col gap-2">
      <p v-if="(employeesQuery.data.value ?? []).length === 0" class="py-6 text-center text-sm text-slate-400">
        Todavía no tienes usuarios adicionales.
      </p>

      <div
        v-for="employee in employeesQuery.data.value ?? []"
        :key="employee.id"
        class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm font-semibold text-slate-900">{{ employee.name }}</p>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="employee.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'"
            >
              {{ employee.role === 'admin' ? 'Administrador' : 'Empleado' }}
            </span>
            <span v-if="employee.is_business_owner" class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              Dueño
            </span>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="employee.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
            >
              {{ employee.is_active ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
          <p class="mt-0.5 truncate text-xs text-slate-500">{{ employee.email }}</p>
          <p class="mt-0.5 text-xs text-slate-400">Última conexión: {{ formatLastActive(employee.last_active_at) }}</p>
          <p v-if="employee.role === 'employee'" class="mt-0.5 text-xs text-slate-400">
            {{ employee.permissions?.length ?? 0 }} permiso(s) asignado(s)
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3 sm:shrink-0">
          <button type="button" class="text-sm font-medium text-slate-600 hover:text-slate-800" @click="openEditEmployee(employee)">
            Editar
          </button>
          <button
            v-if="employee.role === 'employee' && canManagePermissions"
            type="button"
            class="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            @click="openPermissions(employee)"
          >
            Permisos
          </button>
          <button
            v-if="!employee.is_business_owner"
            type="button"
            class="text-sm font-medium hover:underline"
            :class="employee.is_active ? 'text-amber-600' : 'text-emerald-600'"
            :disabled="toggleMutation.isPending.value"
            @click="toggle(employee)"
          >
            {{ employee.is_active ? 'Desactivar' : 'Activar' }}
          </button>
          <button
            v-if="!employee.is_business_owner && !employee.is_active && !isSelf(employee)"
            type="button"
            class="text-sm font-medium text-red-500 hover:text-red-700"
            :disabled="deleteMutation.isPending.value"
            @click="remove(employee)"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>

    <EmployeeFormModal v-model="formModalOpen" :employee="editingEmployee" />
    <EmployeePermissionsModal v-model="permissionsModalOpen" :employee="managingPermissionsFor" />
  </div>
</template>
