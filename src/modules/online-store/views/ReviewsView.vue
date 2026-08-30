<script setup lang="ts">
// Moderación de las opiniones de la tienda.
//
// Solo escriben quienes compraron (la API lo exige con el token del pedido),
// así que esto no es una barrera anti-spam sino el control editorial del
// comerciante: nada se publica hasta que lo apruebe.
import { computed, ref } from 'vue'

import { NxButton, NxColumn, NxDataTable, NxPageHeader } from '@/ui'

import { useReviewModeration, useReviews } from '../composables/useReviews'
import type { ProductReview, ReviewStatus } from '../services/reviewService'

const FILTERS: { value: ReviewStatus | 'all'; label: string }[] = [
  { value: 'pending', label: 'Por revisar' },
  { value: 'approved', label: 'Publicadas' },
  { value: 'hidden', label: 'Ocultas' },
  { value: 'all', label: 'Todas' },
]

const status = ref<ReviewStatus | 'all'>('pending')
const page = ref(1)

const reviewsQuery = useReviews(status, page)
const meta = computed(() => reviewsQuery.data.value?.meta)
const moderation = useReviewModeration()

function selectStatus(value: ReviewStatus | 'all'): void {
  status.value = value
  page.value = 1
}

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

function moderate(review: ProductReview, next: 'approved' | 'hidden'): void {
  moderation.mutate({ id: review.id, status: next })
}

function formatDate(value: string | null): string {
  if (!value) {
    return '—'
  }
  return new Date(value).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const STATUS_LABELS: Record<ReviewStatus, { label: string; classes: string }> = {
  pending: { label: 'Por revisar', classes: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Publicada', classes: 'bg-emerald-100 text-emerald-700' },
  hidden: { label: 'Oculta', classes: 'bg-slate-100 text-slate-500' },
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <NxPageHeader title="Opiniones" icon="pi pi-star" compact />

    <p class="text-sm text-slate-500">
      Solo pueden opinar quienes compraron y ya recibieron el pedido. Nada se publica en tu tienda
      hasta que lo apruebes.
    </p>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="filter in FILTERS"
        :key="filter.value"
        type="button"
        class="rounded-full border px-3 py-1.5 text-sm font-semibold transition"
        :class="
          status === filter.value
            ? 'border-indigo-600 bg-indigo-600 text-white'
            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
        "
        @click="selectStatus(filter.value)"
      >
        {{ filter.label }}
      </button>
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable
        :value="reviewsQuery.data.value?.data ?? []"
        :loading="reviewsQuery.isPending.value"
        paginator
        lazy
        :rows="25"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 25"
        @page="onPage"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">
            {{
              status === 'pending'
                ? 'No tienes opiniones por revisar.'
                : 'No hay opiniones en este estado.'
            }}
          </p>
        </template>

        <NxColumn header="Producto">
          <template #body="{ data }: { data: ProductReview }">
            <p class="text-sm font-semibold text-slate-900">{{ data.product?.name ?? '—' }}</p>
            <p class="text-xs text-slate-400">Pedido #{{ data.order_id }}</p>
          </template>
        </NxColumn>

        <NxColumn header="Calificación">
          <template #body="{ data }: { data: ProductReview }">
            <span class="text-sm text-amber-500" :aria-label="`${data.rating} de 5`">
              {{ '★'.repeat(data.rating)
              }}<span class="text-slate-200">{{ '★'.repeat(5 - data.rating) }}</span>
            </span>
          </template>
        </NxColumn>

        <NxColumn header="Opinión">
          <template #body="{ data }: { data: ProductReview }">
            <p class="max-w-md text-sm whitespace-pre-line text-slate-700">
              {{ data.comment || '(Sin comentario)' }}
            </p>
            <p class="text-xs text-slate-400">
              {{ data.author_name }} · {{ formatDate(data.created_at) }}
            </p>
          </template>
        </NxColumn>

        <NxColumn header="Estado">
          <template #body="{ data }: { data: ProductReview }">
            <span
              class="rounded-full px-2.5 py-1 text-xs font-semibold"
              :class="STATUS_LABELS[data.status].classes"
            >
              {{ STATUS_LABELS[data.status].label }}
            </span>
          </template>
        </NxColumn>

        <NxColumn header="">
          <template #body="{ data }: { data: ProductReview }">
            <div class="flex justify-end gap-2">
              <NxButton
                v-if="data.status !== 'approved'"
                label="Publicar"
                size="sm"
                :loading="moderation.isPending.value"
                @click="moderate(data, 'approved')"
              />
              <NxButton
                v-if="data.status !== 'hidden'"
                label="Ocultar"
                size="sm"
                severity="secondary"
                outlined
                :loading="moderation.isPending.value"
                @click="moderate(data, 'hidden')"
              />
            </div>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>
  </div>
</template>
