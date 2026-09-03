<script setup lang="ts">
// Usuarios de TODA la plataforma, de cualquier negocio. Consume
// SuperAdmin\UserController (nexolu-pos-api).
//
// No confundir con modules/employees, que gestiona el equipo de UN negocio:
// aca se entra a dar soporte cruzando tenants (desactivar a alguien,
// resetearle la clave cuando no puede entrar), no a administrar personal.
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { PlatformUser } from '@/types/platformUser'
import { NxButton, NxColumn, NxDataTable, NxInput, NxPageHeader } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import {
  usePlatformUsers,
  useResetPlatformUserPassword,
  useTogglePlatformUser,
} from '../composables/usePlatformUsers'

const searchInput = ref('')
const search = ref('')
const businessIdInput = ref('')
const page = ref(1)

let debounce: number | undefined
watch(searchInput, (value) => {
  window.clearTimeout(debounce)
  debounce = window.setTimeout(() => {
    search.value = value
    page.value = 1
  }, 300)
})

const businessId = computed(() => {
  const parsed = Number.parseInt(businessIdInput.value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
})

watch(businessId, () => {
  page.value = 1
})

const usersQuery = usePlatformUsers(search, businessId, page)
const toggleUser = useTogglePlatformUser()
const resetPassword = useResetPlatformUserPassword()
const meta = computed(() => usersQuery.data.value?.meta)

const router = useRouter()
const { notify } = useSystemAlert()

/**
 * La contraseña generada se muestra UNA vez y solo en memoria: el backend no
 * la persiste en claro, asi que si se pierde de la pantalla hay que generar
 * otra. Por eso queda fijada en la fila hasta que se recargue.
 */
const newPasswordByUser = ref<Record<number, string>>({})

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

async function doResetPassword(user: PlatformUser): Promise<void> {
  try {
    const password = await resetPassword.mutateAsync(user.id)
    newPasswordByUser.value = { ...newPasswordByUser.value, [user.id]: password }
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos generar la contraseña.'))
  }
}

async function doToggle(user: PlatformUser): Promise<void> {
  try {
    await toggleUser.mutateAsync(user.id)
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos cambiar el estado del usuario.'))
  }
}

function openBusiness(user: PlatformUser): void {
  if (user.business_id) {
    router.push({ name: 'superadmin.businesses.show', params: { id: user.business_id } })
  }
}

function formatDateTime(iso: string | null): string {
  return iso
    ? new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Nunca'
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <NxPageHeader
      title="Usuarios (plataforma)"
      subtitle="Todos los usuarios de todos los negocios."
      icon="pi pi-users"
      compact
    />

    <div class="flex flex-wrap items-end gap-3">
      <NxInput
        v-model="searchInput"
        label="Buscar por nombre o correo"
        class="min-w-[240px] flex-1"
        icon="pi pi-search"
        clearable
        blur-after-typing
      />
      <NxInput v-model="businessIdInput" label="ID de negocio" placeholder="Todos" class="w-32" />
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable
        :value="usersQuery.data.value?.data ?? []"
        :loading="usersQuery.isPending.value"
        paginator
        lazy
        :rows="20"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 20"
        @page="onPage"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">No hay usuarios con esos criterios.</p>
        </template>

        <NxColumn header="Usuario">
          <template #body="{ data }: { data: PlatformUser }">
            <p class="text-sm font-semibold text-slate-900">{{ data.full_name }}</p>
            <p class="text-xs text-slate-400">{{ data.email }}</p>
            <p v-if="data.cellphone" class="text-xs text-slate-400">{{ data.cellphone }}</p>
          </template>
        </NxColumn>

        <NxColumn header="Negocio">
          <template #body="{ data }: { data: PlatformUser }">
            <button
              v-if="data.business"
              type="button"
              class="text-sm text-slate-700 hover:text-indigo-600"
              @click="openBusiness(data)"
            >
              {{ data.business.name }}
            </button>
            <span v-else class="text-sm text-slate-400">—</span>
            <p v-if="data.business_id" class="font-mono text-xs text-slate-400">#{{ data.business_id }}</p>
          </template>
        </NxColumn>

        <NxColumn header="Rol">
          <template #body="{ data }: { data: PlatformUser }">
            <span class="text-sm text-slate-600">{{ data.roles.join(', ') || '—' }}</span>
            <p v-if="data.is_business_owner" class="text-xs text-indigo-600">dueño</p>
          </template>
        </NxColumn>

        <NxColumn header="Estado">
          <template #body="{ data }: { data: PlatformUser }">
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="data.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
            >
              {{ data.is_active ? 'Activo' : 'Inactivo' }}
            </span>
            <p class="mt-0.5 text-xs text-slate-400">Últ. conexión: {{ formatDateTime(data.last_active_at) }}</p>
          </template>
        </NxColumn>

        <NxColumn header="Acciones">
          <template #body="{ data }: { data: PlatformUser }">
            <div class="flex flex-col items-start gap-1">
              <div class="flex gap-2">
                <NxButton
                  size="sm"
                  variant="outline"
                  :loading="toggleUser.isPending.value && toggleUser.variables.value === data.id"
                  @click="doToggle(data)"
                >
                  {{ data.is_active ? 'Desactivar' : 'Activar' }}
                </NxButton>
                <NxButton
                  size="sm"
                  variant="outline"
                  :loading="resetPassword.isPending.value && resetPassword.variables.value === data.id"
                  @click="doResetPassword(data)"
                >
                  Resetear clave
                </NxButton>
              </div>
              <!-- Se muestra una sola vez: el backend no la guarda en claro. -->
              <p v-if="newPasswordByUser[data.id]" class="text-xs text-slate-600">
                Clave nueva:
                <code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-900">
                  {{ newPasswordByUser[data.id] }}
                </code>
                <span class="text-slate-400"> — cópiala ahora, no se vuelve a mostrar.</span>
              </p>
            </div>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>
  </div>
</template>
