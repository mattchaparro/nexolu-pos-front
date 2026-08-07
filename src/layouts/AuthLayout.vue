<script setup lang="ts">
// Mismo layout de dos paneles del legacy (decorativo a la izquierda,
// formulario a la derecha) - identidad reconocible para el usuario, sin
// el patron SVG ni los iconos sueltos que tenia el legacy (mas sobrio).
//
// El logo real (src/assets/nexolu-logo.png, portado del legacy) tiene el
// wordmark en navy oscuro - se muestra en el panel claro del formulario,
// no sobre el degradado, para no arriesgar contraste.
//
// El degradado del panel decorativo es el mismo que ya usa el hero del
// home del legacy (Pages/Home/Index.vue) - indigo muy oscuro a violeta,
// no un indigo generico inventado aca.
import logo from '@/assets/nexolu-logo.png'
</script>

<template>
  <div class="flex min-h-screen">
    <div
      class="relative hidden w-1/2 items-center justify-center bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] lg:flex"
    >
      <div class="px-12 text-center text-white">
        <h1 class="text-3xl font-bold">Nexolú POS</h1>
        <p class="mt-4 max-w-md text-lg text-white/80">
          Todo lo que necesitas para gestionar tu negocio, en un solo lugar.
        </p>
      </div>
    </div>
    <div class="flex w-full items-center justify-center bg-slate-50 px-6 py-12 lg:w-1/2">
      <div class="w-full max-w-md">
        <img :src="logo" alt="Nexolú POS" class="mb-8 h-10 w-auto" />
        <router-view />
      </div>
    </div>
  </div>
</template>
