<script setup lang="ts">
// Replica el layout REAL de pos.nexolu.co/login (verificado contra el
// bundle compilado en produccion, no solo el codigo fuente) - degradado
// indigo-600/700/900, patron SVG, fila de iconos, logo dentro del panel
// oscuro. Unico cambio consciente: PrimeIcons en vez de Material Icons
// (el legacy carga @fontsource/material-icons aparte; ya elegimos
// PrimeIcons como sistema de iconos unico para todo Nexolu UI).
import logo from '@/assets/nexolu-logo.png'

const dotPattern =
  "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'0.06\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"
</script>

<template>
  <div class="flex min-h-screen">
    <div
      class="relative hidden w-1/2 items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 lg:flex"
    >
      <div class="absolute inset-0 opacity-80" :style="{ backgroundImage: dotPattern }" />
      <div class="relative z-10 px-12 text-center">
        <img :src="logo" alt="Nexolú POS" class="mx-auto mb-8 h-20 w-auto" />
        <h2 class="mb-4 text-3xl font-bold text-white">Bienvenido</h2>
        <p class="mx-auto max-w-md text-lg text-white/80">
          Inicia sesión para acceder a tu cuenta.
        </p>
        <div class="mt-10 flex justify-center gap-6 text-white/70">
          <div class="flex flex-col items-center">
            <i class="pi pi-th-large mb-1 text-2xl" />
            <span class="text-xs">Dashboard</span>
          </div>
          <div class="flex flex-col items-center">
            <i class="pi pi-cog mb-1 text-2xl" />
            <span class="text-xs">Configuración</span>
          </div>
          <div class="flex flex-col items-center">
            <i class="pi pi-shield mb-1 text-2xl" />
            <span class="text-xs">Seguridad</span>
          </div>
        </div>
      </div>
    </div>
    <div class="flex w-full items-center justify-center bg-slate-50 px-6 py-12 lg:w-1/2">
      <div class="w-full max-w-md">
        <img :src="logo" alt="Nexolú POS" class="mx-auto mb-8 h-16 w-auto lg:hidden" />
        <router-view />
      </div>
    </div>
  </div>
</template>
