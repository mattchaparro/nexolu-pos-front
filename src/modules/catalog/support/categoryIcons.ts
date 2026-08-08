// Portado de pos-saas-legacy/resources/js/utils/categoryIcons.js
// (CATEGORY_ICONS) - mismo vocabulario de Material Icons que ya resuelve
// CategoryIconResolver del lado del backend. NO se porta
// resolveCategoryAccent (paleta de color rotando por indice): el sistema
// de color de este frontend usa un unico acento indigo para categorias
// (ver README "Sistema de color" y el docblock de ProductCard.vue) - una
// paleta decorativa por id era justo el patron sin criterio que se decidio
// no repetir.
export interface CategoryIconOption {
  id: string
  label: string
  group: string
}

export const CATEGORY_ICONS: CategoryIconOption[] = [
  // Tecnología
  { id: 'smartphone', label: 'Celular', group: 'Tecnología' },
  { id: 'phone_android', label: 'Android', group: 'Tecnología' },
  { id: 'phone_iphone', label: 'iPhone', group: 'Tecnología' },
  { id: 'tablet_android', label: 'Tablet', group: 'Tecnología' },
  { id: 'laptop', label: 'Laptop', group: 'Tecnología' },
  { id: 'desktop_windows', label: 'PC / Desktop', group: 'Tecnología' },
  { id: 'headphones', label: 'Auriculares', group: 'Tecnología' },
  { id: 'earbuds', label: 'Earbuds', group: 'Tecnología' },
  { id: 'speaker', label: 'Parlante', group: 'Tecnología' },
  { id: 'tv', label: 'TV / Monitor', group: 'Tecnología' },
  { id: 'watch', label: 'Smartwatch', group: 'Tecnología' },
  { id: 'electrical_services', label: 'Cable/Cargador', group: 'Tecnología' },
  { id: 'battery_charging_full', label: 'Batería', group: 'Tecnología' },
  { id: 'usb', label: 'USB', group: 'Tecnología' },
  { id: 'sd_card', label: 'Memoria SD', group: 'Tecnología' },
  { id: 'memory', label: 'RAM / Memoria', group: 'Tecnología' },
  { id: 'storage', label: 'Almacenamiento', group: 'Tecnología' },
  { id: 'shield', label: 'Funda/Protector', group: 'Tecnología' },
  { id: 'photo_camera', label: 'Cámara', group: 'Tecnología' },
  { id: 'router', label: 'Router / Red', group: 'Tecnología' },
  { id: 'bluetooth', label: 'Bluetooth', group: 'Tecnología' },
  { id: 'sports_esports', label: 'Gaming', group: 'Tecnología' },
  { id: 'devices_other', label: 'Accesorios tech', group: 'Tecnología' },
  { id: 'keyboard', label: 'Teclado', group: 'Tecnología' },
  { id: 'mouse', label: 'Mouse', group: 'Tecnología' },
  { id: 'print', label: 'Impresora', group: 'Tecnología' },
  // Comida y bebida
  { id: 'coffee', label: 'Café', group: 'Comida' },
  { id: 'restaurant', label: 'Comida', group: 'Comida' },
  { id: 'local_bar', label: 'Bebidas', group: 'Comida' },
  { id: 'bakery_dining', label: 'Panadería', group: 'Comida' },
  { id: 'icecream', label: 'Helados', group: 'Comida' },
  { id: 'lunch_dining', label: 'Almuerzos', group: 'Comida' },
  { id: 'local_pizza', label: 'Pizzas', group: 'Comida' },
  { id: 'local_drink', label: 'Jugos', group: 'Comida' },
  // General / Retail
  { id: 'storefront', label: 'Tienda', group: 'General' },
  { id: 'local_grocery_store', label: 'Abarrotes', group: 'General' },
  { id: 'checkroom', label: 'Vestuario', group: 'General' },
  { id: 'shopping_basket', label: 'Canasta', group: 'General' },
  { id: 'spa', label: 'Belleza', group: 'General' },
  { id: 'medication', label: 'Farmacia', group: 'General' },
  { id: 'cleaning_services', label: 'Limpieza', group: 'General' },
  { id: 'pets', label: 'Mascotas', group: 'General' },
  { id: 'home_repair_service', label: 'Herramientas', group: 'General' },
  { id: 'auto_awesome', label: 'Accesorios', group: 'General' },
  { id: 'edit_note', label: 'Papelería', group: 'General' },
  { id: 'inventory_2', label: 'Inventario', group: 'General' },
  // Ropa & Moda
  { id: 'dry_cleaning', label: 'Lavandería', group: 'Ropa & Moda' },
  { id: 'iron', label: 'Planchado', group: 'Ropa & Moda' },
  { id: 'style', label: 'Moda / Etiquetas', group: 'Ropa & Moda' },
  { id: 'shopping_bag', label: 'Bolsa de compras', group: 'Ropa & Moda' },
  { id: 'man', label: 'Ropa hombre', group: 'Ropa & Moda' },
  { id: 'woman', label: 'Ropa mujer', group: 'Ropa & Moda' },
  { id: 'backpack', label: 'Mochila / Bolso', group: 'Ropa & Moda' },
  { id: 'luggage', label: 'Maletas', group: 'Ropa & Moda' },
  { id: 'local_mall', label: 'Centro comercial', group: 'Ropa & Moda' },
  // Tatuajes / Arte corporal
  { id: 'brush', label: 'Pincel', group: 'Tatuajes' },
  { id: 'palette', label: 'Paleta de colores', group: 'Tatuajes' },
  { id: 'gesture', label: 'Trazos / Dibujo', group: 'Tatuajes' },
  { id: 'format_paint', label: 'Pintura', group: 'Tatuajes' },
  { id: 'create', label: 'Lápiz / Aguja', group: 'Tatuajes' },
  { id: 'design_services', label: 'Diseño', group: 'Tatuajes' },
  { id: 'edit', label: 'Edición / Arte', group: 'Tatuajes' },
  { id: 'color_lens', label: 'Colores / Tinta', group: 'Tatuajes' },
  { id: 'accessibility_new', label: 'Cuerpo humano', group: 'Tatuajes' },
  // Smoke Shop
  { id: 'smoking_rooms', label: 'Cigarrillos', group: 'Smoke Shop' },
  { id: 'vaping_rooms', label: 'Vaporizadores', group: 'Smoke Shop' },
  { id: 'whatshot', label: 'Encendedores', group: 'Smoke Shop' },
  { id: 'local_fire_department', label: 'Fuego / Llama', group: 'Smoke Shop' },
  { id: 'grass', label: 'Hierbas / Verde', group: 'Smoke Shop' },
  { id: 'air', label: 'Vapor / Humo', group: 'Smoke Shop' },
  { id: 'eco', label: 'Natural / CBD', group: 'Smoke Shop' },
  { id: 'filter_vintage', label: 'Floral / Botánico', group: 'Smoke Shop' },
  { id: 'science', label: 'Accesorios / Lab', group: 'Smoke Shop' },
]

export const CATEGORY_ICON_GROUPS: string[] = Array.from(new Set(CATEGORY_ICONS.map((i) => i.group)))
