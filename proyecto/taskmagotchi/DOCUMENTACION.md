# 📚 TaskMagotchi — Documentación del Proyecto

## 🏗️ Arquitectura General

```
TaskMagotchi
├── app/                    ← Expo Router (páginas/navegación)
│   ├── (tabs)/             ← 5 tabs principales
│   ├── camera/             ← Pantalla de cámara (verificación)
│   └── _layout.tsx         ← Layout raíz
├── src/                    ← Código fuente
│   ├── components/         ← Componentes UI
│   ├── services/           ← Lógica de negocio
│   ├── store/              ← Estado global (Zustand)
│   ├── types/              ← Tipos TypeScript
│   └── utils/              ← Utilidades
├── native/android/         ← Módulo nativo Kotlin (App Blocker)
├── plugins/                ← Plugins de Expo config
└── assets/                 ← Sprites, imágenes, fuentes
```

### Stack Tecnológico

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| Expo | ~57.0.7 | Framework RN |
| React Native | 0.86.0 | Mobile framework |
| React | 19.2.3 | UI library |
| TypeScript | ~6.0.3 | Tipado |
| Expo Router | ~57.0.7 | Navegación file-based |
| expo-sqlite | ~57.0.1 | Base de datos local |
| Zustand | ^5.0.14 | Estado global |
| Groq (llama-3.1-8b) | — | Chat IA |
| Gemini 1.5 Flash | — | Verificación por foto |
| Kotlin | 2.0+ | Módulo nativo Android |

---

## 📁 Estructura Detallada

### `app/` — Pantallas (Expo Router)

```
app/
├── _layout.tsx          ← Layout raíz (proveedores, fonts)
├── (tabs)/
│   ├── _layout.tsx      ← Config tabs (iconos, nombres)
│   ├── home.tsx         ← Home: timer, tareas de hoy, mascota
│   ├── chat.tsx         ← Chat con IA Magotchi
│   ├── agenda.tsx       ← Agenda/calendario semanal
│   ├── shop.tsx         ← Tienda de rewards
│   └── settings.tsx     ← Settings: API keys, apps bloqueadas, math challenge
├── camera/
│   └── [taskId].tsx     ← Tomar foto para verificar tarea
```

Cada pantalla es auto-contenida con sus estilos al final del archivo.

### `src/services/` — Servicios

| Archivo | Responsabilidad | Dependencias |
|---------|----------------|--------------|
| `database.ts` | Init SQLite, schema completo, seeds | expo-sqlite |
| `database.web.ts` | Web stub (no-op) | — |
| `blocking.ts` | Bridge JS → Kotlin native module | NativeModules.AppBlocker |
| `conversationMemory.ts` | Memoria de chat (guardar/cargar) | database.ts |
| `groqChat.ts` | Chat con Groq API (LLM) | apiKeys.ts |
| `ai.ts` | Verificación por foto con Gemini | apiKeys.ts |
| `apiKeys.ts` | CRUD de API keys en DB | database.ts |
| `settingsDb.ts` | Apps bloqueadas, schedule | database.ts |
| `shopService.ts` | Tienda, rewards, transacciones | database.ts |

### `src/store/` — Estado Global (Zustand)

| Store | Estado | Métodos clave |
|-------|--------|---------------|
| `petStore.ts` | pet, loading, error | loadPet, updatePet, addXp, addCoins, spendCoins |
| `taskStore.ts` | tasks, todayTasks, loading | loadTasks, addTask, updateTask, completeTask, deleteTask |

### `src/utils/` — Utilidades

| Archivo | Función |
|---------|---------|
| `petEngine.ts` | getMoodFromTasks, calculateTaskReward, calculatePenalty |
| `timeHelpers.ts` | timeStringToTimestamp, formatTimestampToTime |
| `mathBlocker.ts` | generateMathChallenge, checkMathAnswer |

### `src/components/` — Componentes UI

| Archivo | Contenido |
|---------|-----------|
| `retroUi.tsx` | Tema retro: colores, PixelButton, RetroScreen, SpeechBubble, RetroInputShell |
| `petSprite.tsx` | Sprite de mascota con skins y moods |

---

## 🎨 Sistema de Diseño (Retro UI)

### Colores (`retroColors` en `retroUi.tsx`)
```typescript
const retroColors = {
  bg: '#0f0f23',        // Fondo principal (azul oscuro)
  panel: '#1a1a3e',     // Paneles/tarjetas
  border: '#3a3a6e',    // Bordes
  text: '#e0e0ff',      // Texto principal
  muted: '#7a7aaa',     // Texto secundario
  accent: '#00ff88',     // Verde retro (acento)
  danger: '#ff4466',     // Rojo
  warning: '#ffaa00',    // Amarillo
}
```

### Componentes
- **PixelButton**: Botón con borde pixelado
- **RetroScreen**: Contenedor con bordes CRT
- **SpeechBubble**: Burbuja de diálogo (align left/right)
- **RetroInputShell**: Borde para TextInput

### Mascota (PetSprite)
- Soporta múltiples **skins** (especies)
- 4 **moods**: normal, happy, sad, angry
- Spritesheet de 5 frames por mood
- Fallback a emoji si falta el PNG

---

## 🤖 Integración con IA

### Groq (Chat)
- Endpoint: `https://api.groq.com/openai/v1/chat/completions`
- Modelo: `llama-3.1-8b-instant`
- Auth: Bearer token vía API key
- System prompt cambia según contexto: planning | motivation | general
- Timeout: 30s (AbortController)
- La IA puede responder con JSON para:
  - Crear tareas (`AIPlanResponse`)
  - Bloquear/desbloquear apps (`AIBlockResponse`)

### Gemini (Verificación por foto)
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- Auth: `x-goog-api-key` header
- Toma foto → IA verifica si completaste la tarea
- Retorna `{ verified, confidence, reason }`

---

## 📱 Módulo Nativo Android

### Archivos
```
native/android/
├── AppBlockerModule.kt    ← @ReactMethods (puente JS)
├── BlockingService.kt     ← Foreground Service
└── AppBlockerPackage.kt   ← Registro del módulo
```

### Flujo de datos
```
JS (blocking.ts) → NativeModules.AppBlocker → AppBlockerModule.kt
                                                  ↓
                                          BlockingService (foreground)
                                                  ↓
                                          ActivityManager.getRunningTasks()
                                                  ↓
                                          UsageStatsManager (fallback)
```

### Permisos Android
| Permiso | Propósito |
|---------|-----------|
| QUERY_ALL_PACKAGES | Listar apps instaladas |
| PACKAGE_USAGE_STATS | Detectar app en foreground |
| SYSTEM_ALERT_WINDOW | Overlay de bloqueo |
| FOREGROUND_SERVICE | Servicio en background |
| FOREGROUND_SERVICE_SPECIAL_USE | Tipo specialUse |
| POST_NOTIFICATIONS | Notificación Android 13+ |

---

## 🔧 Tips para Desarrollo

### Agregar una nueva pantalla
1. Crear archivo en `app/` o `app/(tabs)/`
2. Usar `RetroScreen` como wrapper
3. Importar colores desde `retroUi`
4. Agregar al layout si es necesario

### Agregar un nuevo skin para la mascota
1. Crear carpeta en `assets/skins/<skin-name>/`
2. 4 PNGs: `normal.png`, `happy.png`, `sad.png`, `angry.png`
3. Cada PNG es un spritesheet de 5 frames horizontal
4. Opcional: `config.json` con metadatos
5. Agregar al mapping en `petSprite.tsx`

### Agregar un nuevo servicio
1. Crear archivo en `src/services/`
2. Exportar funciones
3. Agregar barrel export en `src/index.ts`

### Modificar el schema de DB
1. Editar SOLO `database.ts` (fuente de verdad)
2. Usar `CREATE TABLE IF NOT EXISTS`
3. Para migraciones: agregar ALTER TABLE después de CREATE
4. NO modificar schema en `conversationMemory.ts`

---

## 🐛 Deuda Técnica Conocida

### 🔴 Crítica
1. **App blocker no funciona en Android 10+** — `getRunningTasks(1)` solo detecta la propia app. Solución real: implementar `AccessibilityService` (ya hay redirect a settings)
2. **showOverlay() no implementado** — el método existe pero no crea overlay UI real
3. **API keys en texto plano** — vulnerable a extracción via ADB. Migrar a expo-secure-store

### 🟡 Media
4. **Streak bonus nunca se aplica** — `hasStreak: false` hardcodeado en camera flow
5. **Penalty system no conectado** — `calculatePenalty()` existe pero jamás se llama
6. **DB schema duplicado** — `conversationMemory.ts` tiene su propio CREATE TABLE que puede pisar el de `database.ts`
7. **Math challenge decorativo** — no bloquea realmente las apps
8. **todayTasks excluye tareas viejas** — tareas pendientes sin deadline ni scheduledStart quedan invisibles
9. **isInBreakTime no soporta horarios overnight** — si termina después de medianoche, falla

### 🟢 Leve
10. **FontFamily inconsistente** — algunos estilos hardcodean `'monospace'` en vez de usar `monoFont`
11. **No hay índices en DB** — tasks.status y tasks.createdAt deberían tener índices
12. **predictiveBackGestureEnabled=false** sin comentario explicativo
13. **Solo light mode** — no soporta dark mode

---

## 🚀 Cómo Buildear

```bash
# 1. Prebuild (genera android/)
npx expo prebuild

# 2. Build APK (EAS cloud)
eas build --profile preview --platform android

# 3. Build APK (local — requiere Android Studio)
cd android
./gradlew assembleRelease

# 4. Build APK (local con C:\tm\ si hay path length issues)
xcopy /E /I proyecto\taskmagotchi C:\tm\
cd C:\tm\
npx expo prebuild
npx expo run:android
```

---

## 🔒 API Keys Requeridas

| Servicio | Dónde configurar | Cómo obtener |
|----------|-----------------|--------------|
| Groq | Settings → API Keys | https://console.groq.com |
| Gemini | Settings → API Keys | https://aistudio.google.com |

Ambas se guardan en la DB local (`api_keys` table).
