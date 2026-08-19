<script setup lang="ts">
// Componente de pago con tarjeta: numero con espaciado automatico cada 4
// digitos, validacion Luhn en vivo, mes/año restringidos a exactamente 2
// digitos numericos, y el foco avanza solo (holder -> numero -> mes -> año
// -> cvc) a medida que cada campo se completa - asi el usuario nunca tiene
// que tocar el siguiente campo a mano. Emite el CardInput ya limpio (solo
// digitos, sin espacios) listo para tokenizeCard().
import { computed, useTemplateRef, watch } from 'vue'

import { NxInput } from '@/ui'

const cardHolder = defineModel<string>('cardHolder', { default: '' })
const numberDigits = defineModel<string>('number', { default: '' })
const expMonth = defineModel<string>('expMonth', { default: '' })
const expYear = defineModel<string>('expYear', { default: '' })
const cvc = defineModel<string>('cvc', { default: '' })
const valid = defineModel<boolean>('valid', { default: false })

defineProps<{ disabled?: boolean }>()

type FocusableInput = { focus: () => void }
const monthInput = useTemplateRef<FocusableInput>('monthInput')
const yearInput = useTemplateRef<FocusableInput>('yearInput')
const cvcInput = useTemplateRef<FocusableInput>('cvcInput')

// Solo para agrupar visualmente ("4242 4242 4242 4242") - el modelo
// (numberDigits) siempre guarda unicamente digitos, nunca los espacios.
const numberFormatted = computed(() => numberDigits.value.replace(/(\d{4})(?=\d)/g, '$1 '))

type CardBrand = 'visa' | 'mastercard' | 'amex' | 'diners' | null
const brand = computed<CardBrand>(() => {
  const n = numberDigits.value
  if (/^4/.test(n)) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard'
  if (/^3[47]/.test(n)) return 'amex'
  if (/^3(?:0[0-5]|[68])/.test(n)) return 'diners'
  return null
})
const expectedCvcLength = computed(() => (brand.value === 'amex' ? 4 : 3))

function luhnValid(digits: string): boolean {
  if (digits.length < 12) return false
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = Number(digits[i])
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

const numberComplete = computed(() => numberDigits.value.length >= 13)
const numberValid = computed(() => luhnValid(numberDigits.value))
const numberError = computed(() => (numberComplete.value && !numberValid.value ? 'Número de tarjeta inválido.' : undefined))

const expiryComplete = computed(() => expMonth.value.length === 2 && expYear.value.length === 2)
const expiryValid = computed(() => {
  if (!expiryComplete.value) return false
  const month = Number(expMonth.value)
  if (month < 1 || month > 12) return false
  const now = new Date()
  const currentYear = now.getFullYear() % 100
  const currentMonth = now.getMonth() + 1
  const year = Number(expYear.value)
  if (year < currentYear) return false
  if (year === currentYear && month < currentMonth) return false
  return true
})
const monthError = computed(() => {
  if (expMonth.value.length !== 2) return undefined
  return Number(expMonth.value) >= 1 && Number(expMonth.value) <= 12 ? undefined : 'Mes inválido.'
})
const yearError = computed(() => (expiryComplete.value && !expiryValid.value && !monthError.value ? 'Vencida.' : undefined))

const cvcValid = computed(() => cvc.value.length === expectedCvcLength.value)
const holderValid = computed(() => cardHolder.value.trim().length >= 3)

watch(
  [numberValid, expiryValid, cvcValid, holderValid],
  ([n, e, c, h]) => {
    valid.value = n && e && c && h
  },
  { immediate: true },
)

function onNumberInput(raw: string): void {
  numberDigits.value = raw.replace(/\D/g, '').slice(0, 19)
  if (numberDigits.value.length >= 16) {
    monthInput.value?.focus()
  }
}

function onMonthInput(raw: string): void {
  expMonth.value = raw.replace(/\D/g, '').slice(0, 2)
  if (expMonth.value.length === 2) {
    yearInput.value?.focus()
  }
}

function onYearInput(raw: string): void {
  expYear.value = raw.replace(/\D/g, '').slice(0, 2)
  if (expYear.value.length === 2) {
    cvcInput.value?.focus()
  }
}

function onCvcInput(raw: string): void {
  cvc.value = raw.replace(/\D/g, '').slice(0, expectedCvcLength.value)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <NxInput
      :model-value="cardHolder"
      label="Nombre en la tarjeta"
      required
      autocomplete="cc-name"
      :disabled="disabled"
      @update:model-value="cardHolder = $event"
    />
    <NxInput
      :model-value="numberFormatted"
      label="Número de tarjeta"
      required
      inputmode="numeric"
      autocomplete="cc-number"
      :error="numberError"
      :disabled="disabled"
      @update:model-value="onNumberInput"
    />
    <div class="grid grid-cols-3 gap-3">
      <NxInput
        ref="monthInput"
        :model-value="expMonth"
        label="Mes (MM)"
        required
        placeholder="12"
        inputmode="numeric"
        autocomplete="cc-exp-month"
        :error="monthError"
        :disabled="disabled"
        @update:model-value="onMonthInput"
      />
      <NxInput
        ref="yearInput"
        :model-value="expYear"
        label="Año (AA)"
        required
        placeholder="29"
        inputmode="numeric"
        autocomplete="cc-exp-year"
        :error="yearError"
        :disabled="disabled"
        @update:model-value="onYearInput"
      />
      <NxInput
        ref="cvcInput"
        :model-value="cvc"
        label="CVC"
        required
        inputmode="numeric"
        autocomplete="cc-csc"
        :disabled="disabled"
        @update:model-value="onCvcInput"
      />
    </div>
  </div>
</template>
