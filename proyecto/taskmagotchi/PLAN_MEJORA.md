# Plan de Mejora — TaskMagotchi

Basado en el diseño actual y la dirección definida. Organizado por prioridad para tener una app funcional lo antes posible.

---

## Decisiones tomadas

| Tema | Decisión |
|------|----------|
| **Formato animaciones** | Aseprite (.aseprite) como fuente. Exportar a **PNG con fondo transparente**. Escalado con `image-rendering: pixelated` / nearest-neighbor, **desactivar filtrado de imágenes** en React Native. |
| **Agenda** | Solo lectura. El chat (Groq) genera el plan del día y se pinta en el calendario. Para cambiar algo, se debate con la IA. |
| **Timer** | Deadline visible. Muestra el tiempo restante de la tarea según lo que la IA asignó. No es Pomodoro, es countdown de vencimiento. |
| **Skins mascota** | 4 estados: `normal`, `happy`, `sad`, `angry`. Carpeta `assets/skins/[nombre]/`. Cada skin = 4 PNGs (uno por estado). |

## Fase 0 — Preparación

- [ ] ~~Regenerar token EAS~~ (el anterior quedó expuesto en git — hacerlo manual en https://expo.dev/accounts/gr4v1tys-team/settings/tokens)

---

## Fase 1 — Reestructurar navegación

La base de todo: cambiar el layout de tabs al nuevo diseño.

### 1.1 Nuevos tabs
| Tab | Ruta | Descripción |
|-----|------|-------------|
| **Home** | `(tabs)/home.tsx` | Fusión del index actual: slider de tareas + botón foto + contador |
| **Chat** | `(tabs)/chat.tsx` | Mascota animada + chat (mover de modal a tab) |
| **Agenda** | `(tabs)/agenda.tsx` | Plan del día estilo Google Calendar |
| **Tienda** | `(tabs)/shop.tsx` | Comprar rewards con coins |
| **Config** | `(tabs)/settings.tsx` | Ya existe, expandir |

### 1.2 Archivos a modificar/crear
- `app/(tabs)/_layout.tsx` — nuevo layout con 5 tabs
- `app/(tabs)/home.tsx` — **nuevo**
- `app/(tabs)/chat.tsx` — mover desde modal
- `app/(tabs)/agenda.tsx` — **nuevo**
- `app/(tabs)/shop.tsx` — **nuevo**
- `app/(tabs)/settings.tsx` — expandir
- `app/(tabs)/pet.tsx` — **eliminar**
- `app/(tabs)/tasks.tsx` — **eliminar** (integrado en home)
- `app/(tabs)/index.tsx` — **eliminar** o redirect

### 1.3 Modales que se quedan
- `camera/[taskId].tsx` — cámara para verificación con foto
- Chat ya no es modal

---

## Fase 2 — Home: Centro de tareas

Unificar las pantallas actuales `index.tsx` + `tasks.tsx` en una sola.

### 2.1 Slider de tareas del día
- Lista horizontal con tarjetas de tareas (pending/in_progress)
- Cada tarjeta muestra: nombre, tiempo estimado, prioridad
- Botón para subir foto (placeholder → después cámara real)
- Al deslizar, timpo countdown de la tarea seleccionada

### 2.2 Contador / Timer
- Cuando hay tarea activa, muestra cuenta regresiva
- Al terminar el tiempo, marca tarea como lista para verificar

### 2.3 Botón de foto (placeholder)
- De momento un botón que abre la cámara (ya existe en camera/[taskId].tsx)
- Placeholder visual mientras se diseña el componente definitivo

### Archivos
- `app/(tabs)/home.tsx` — **nuevo** (aprox. 200 líneas)
- Reutilizar: `src/store/taskStore.ts`, `src/store/petStore.ts`, `src/utils/petEngine.ts`
- Reutilizar: `retroUi.tsx` componentes

---

## Fase 3 — Chat: Mascota + Conversación

La mascota vive aquí. NO hay pantalla separada de stats.

### 3.1 Contenedor de mascota animada
- Recuadro en la parte superior con la animación
- 4 estados: `normal`, `happy`, `sad`, `angry`
- El estado lo determina el PetEngine según rendimiento de tareas
- Formato de animación: a definir (spritesheet, GIF, frames PNG)
- Posibilidad de cargar skins (se configura en Settings)

### 3.2 Barra de chat
- Estado idle: colapsada/mínima (solo un indicador)
- Estado activo: expandida con input de texto (como ahora)
- Animación de transición entre estados

### 3.3 Mover de modal a tab
- Sacar el contenido de `app/chat.tsx`
- Integrar en `app/(tabs)/chat.tsx` junto con el contenedor de mascota

### Archivos
- `app/(tabs)/chat.tsx` — **nuevo** (hereda de `app/chat.tsx`)
- `app/chat.tsx` — **eliminar**
- `src/utils/petEngine.ts` — modificar estados para animación

---

## Fase 4 — Agenda: Plan del día

### 4.1 Visualización tipo timeline
- Línea de tiempo vertical con bloques de tareas
- Horario: desde la primera tarea hasta la última
- Tareas coloreadas por prioridad

### 4.2 Integración con Groq
- Cuando el chat planifica el día, se guarda el schedule en SQLite
- La agenda muestra el schedule actual
- Las modificaciones vía chat actualizan la agenda

### 4.3 Datos
- Tabla `schedules` ya existe en SQLite
- Tabla `conversation_log` ya existe
- Nueva tabla o columna para `day_plan` (plan del día generado por IA)

### Archivos
- `app/(tabs)/agenda.tsx` — **nuevo**
- `src/services/database.ts` — posible migración de schema
- `src/types/index.ts` — nuevos tipos para day plan

---

## Fase 5 — Tienda: Compras con coins

### 5.1 Catálogo
- Usar la tabla `rewards` ya existente en SQLite
- Mostrar rewards disponibles con precio
- Vendedor: mascota con sombrero (animación separada)

### 5.2 Acciones
- Comprar día libre (desbloquea restricciones)
- Comprar tiempo extra de ocio
- Comprar cosméticos (skins para la mascota principal)

### 5.3 Economía
- Coins se ganan completando tareas + rachas (ya implementado en petEngine.ts)
- Gastar coins reduce `pet.coins` y aumenta `pet.totalSpent`

### Archivos
- `app/(tabs)/shop.tsx` — **nuevo**
- `src/services/database.ts` — consultas a `user_rewards`
- `src/store/petStore.ts` — ya maneja economía

---

## Fase 6 — Settings expandido

El actual `settings.tsx` se expande con:

### 6.1 Apps de trabajo
- Lista de apps que el usuario considera productivas
- "Whitelist": apps permitidas mientras hay tarea activa
- Chrome, VS Code, Terminal, Notion, Claude, Gemini, NotebookLM, etc.

### 6.2 Apps de ocio/juego
- Blacklist: apps bloqueadas durante tareas
- YouTube, Instagram, TikTok, juegos, etc.

### 6.3 Horarios de descanso
- Configurar rangos horarios fijos (ya hay tabla `schedules`)
- UI para seleccionar días y horas

### 6.4 Cargar skins de mascota
- Selector de archivo de animación
- Preview de la animación
- La skin debe incluir frames para los 4 estados

### Archivos
- `app/(tabs)/settings.tsx` — **modificar** (expandir secciones)
- `src/services/database.ts` — tabla `blocked_apps` ya existe
- `src/types/index.ts` — nuevos tipos si hace falta

---

## Fase 7 — Motor de mascota (refactor)

Eliminar la lógica de "mascota virtual con stats" y reemplazar por:

### 7.1 Estados de ánimo
Basado SOLO en comportamiento de tareas:
- **Normal**: haciendo tareas normalmente
- **Happy**: racha de tareas completadas a tiempo
- **Sad**: días sin completar tareas / abandono
- **Angry**: tareas vencidas sin hacer

### 7.2 Archivos a modificar
- `src/utils/petEngine.ts` — nueva función `getMoodFromTasks(tasks, streak)`
- `src/store/petStore.ts` — simplificar (eliminar hunger/energy/happiness)
- Tabla `pet` en SQLite — simplificar columnas
- Eliminar `feedPet`, `playWithPet`, `restPet` (ya no existen acciones de cuidado)

---

## Fase 8 — Mascota animada + Skins

### 8.1 Sistema de animación
- Contenedor con dimensiones fijas
- Carga de spritesheet o frames según estado
- Transiciones suaves entre estados

### 8.2 Formato a definir
Opciones:
- **Spritesheet PNG + JSON** (como CSS sprites) — eficiente
- **GIF animado** — simple pero sin control de frames
- **Frames individuales PNG** — flexible, fácil de reemplazar

### 8.3 Sistema de skins
- Carpeta `assets/skins/` 
- Cada skin = carpeta con 4 archivos (normal, happy, sad, angry)
- Usuario puede agregar desde Settings

---

## Resumen de archivos

| Acción | Archivos |
|--------|----------|
| **Nuevos** | `home.tsx`, `agenda.tsx`, `shop.tsx`, `chat.tsx` (en tabs) |
| **Modificar** | `_layout.tsx` (tabs), `settings.tsx`, `petEngine.ts`, `petStore.ts`, `database.ts`, `types/index.ts` |
| **Eliminar** | `pet.tsx`, `tasks.tsx`, `chat.tsx` (modal) |
| **Quedan igual** | `camera/[taskId].tsx`, `groqChat.ts`, `ai.ts`, `apiKeys.ts`, `blocking.ts`, `mathBlocker.ts`, `retroUi.tsx` |

---

## Orden de implementación sugerido

```
Fase 0 (Preparación)
  ↓
Fase 1 (Navegación) ← base, sin esto no funciona nada nuevo
  ↓
Fase 2 (Home) ← lo primero que ve el usuario
  ↓
Fase 3 (Chat) ← mascota + conversación
  ↓
Fase 6 (Settings expandido) ← API keys + apps + horarios
  ↓
Fase 5 (Tienda) ← economía
  ↓
Fase 4 (Agenda) ← plan del día
  ↓
Fase 7 + 8 (Motor animación + Skins) ← mascota animada real
```

¿Qué te parece este plan? ¿Priorizamos distinto, falta algo, sobra algo? Cuando lo afinemos, arrancamos con la Fase 1.
