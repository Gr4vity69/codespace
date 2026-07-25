# TaskMagotchi — Invariantes para Agentes de IA

## ⚠️ REGLAS SAGRADAS (NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA)

### 1. Native Android Module (Kotlin)
- Los archivos en `native/android/` son la ÚNICA fuente de verdad del módulo nativo
- `withAppBlocker.js` los COPIA al directorio `android/` durante el prebuild
- NO editar los archivos dentro de `android/` directamente — se sobrescriben en cada prebuild
- El módulo usa el puente `NativeModules.AppBlocker` desde JS
- **El bloqueo de apps funciona vía AccessibilityService** (solución implementada)

### 2. Config Plugin (withAppBlocker.js)
- **Inyecta código Kotlin** (NO Java) desde SDK 57
- NO usar `new` keyword en Kotlin (`add(AppBlockerPackage())` en vez de `packages.add(new AppBlockerPackage())`)
- El plugin es IDEMPOTENTE — verifica si el código ya existe antes de insertar
- Permisos requeridos para Android 13+: `POST_NOTIFICATIONS`
- NO agregar `REQUEST_INSTALL_PACKAGES` — la app no instala APKs

### 3. Expo SDK 57 Específico
- SDK 57 → React Native 0.86.0 → usa ReactHost, NO ReactNativeHost
- MainApplication es KOTLIN (`.kt`), NO Java
- El template usa `PackageList(this).packages.apply { add(...) }`

### 4. Base de Datos (SQLite via expo-sqlite)
- Schema completo en `src/services/database.ts` — esa es la fuente de verdad
- `conversationMemory.ts` tiene `ensureTable()` pero NO debe definir el schema
- Usar `CREATE TABLE IF NOT EXISTS` para migraciones
- API keys NUNCA en texto plano — usar `expo-secure-store`

### 5. Stores (Zustand)
- `petStore.ts` + `taskStore.ts` son las fuentes de verdad en memoria
- Siempre escribir a DB primero, luego actualizar store
- `todayTasks` filtra por fecha de creación

### 6. Game Loop System (Mood Solo por Tareas)
- **Engine**: `src/utils/petGameLoop.ts` → lógica central de mascota
- **Mood basado ÚNICAMENTE en tareas** (ningún vital influye):
  - `applyTaskCompletion()` → registra que se completó una tarea
  - `applyTaskSkip()` → registra que se saltó una tarea
  - `applyOverduePenalty()` → registra tareas vencidas
- **Mood calculation** (`computeMood`):
  - `angry`: 3+ tareas vencidas
  - `happy`: streak ≥2 Y 2+ tareas completadas hoy
  - `sad`: 0 completadas + 3+ pendientes
  - `normal`: todo lo demás
- **UI**: `MoodPopup` en `src/components/moodPopup.tsx` + overlay nativo en bloqueo

### 7. UI Orgánica (sin barras vitales)
- NO usar barras de progreso para hambre/felicidad/energía
- El mood se muestra únicamente mediante el sprite de la mascota y el popup contextual
- Diseño orgánico: la mascota reacciona solo a lo que el usuario hace con las tareas

### 8. Vital Bars — ELIMINADOS
- Se removeron las barras ❤️🍖⚡ de home.tsx y settings.tsx
- La mascota ahora muestra su estado SOLO a través del sprite (4 moods) y popups animados
- Ya NO se muestra el % de felicidad/hambre/energía en ninguna pantalla

### 7. AI Integration (Groq + Gemini)
- Groq: `Authorization: Bearer` header
- Gemini: `x-goog-api-key` header
- AbortController con timeout de 30s en fetch

### 8. Regex para parseo de JSON
- SIEMPRE usar non-greedy `\{[\s\S]*?\}` 
- Catch de JSON.parse debe hacer al menos `console.warn`

### 9. Fonts
- `monoFont` definido en `retroUi.tsx`
- iOS: `Menlo`, Android: `monospace`

### 10. Seguridad
- API keys en `expo-secure-store`
- Database backup: `allowBackup=true` en Android

## 📋 Estado del Proyecto (Actualizado — 2026-07-24)

### ✅ Resuelto
1. Game loop conectado a tareas completadas/saltadas/vencidas
2. Mood popup integrado en camera/[taskId].tsx
3. Time decay aplicado en _layout.tsx (no afecta mood)
4. Overdue penalty en taskStore.ts
5. Mood sync con overlay nativo (BlockingService.kt)
6. API keys migradas a expo-secure-store
7. AccessibilityService implementado para bloqueo real
8. **Mood depende SOLAMENTE de tareas** (sin vitales artificiales)
9. **Barras vitales (❤️🍖⚡) ELIMINADAS** de home y settings
10. Diseño orgánico: mascota reacciona solo a acciones del usuario

### ⏳ Pendiente
1. Calendario completo tipo Google Calendar
2. Bloques visuales por hora en agenda
3. Edición directa de plan desde agenda
4. Diseño visual orgánico con Antigravity

## 🔧 Comandos Útiles
```bash
# Build APK
cd proyecto/taskmagotchi
npx expo prebuild
eas build --profile preview --platform android

# Development
npx expo start
npx expo run:android

# Tests
npx jest test/path/to/test.spec.ts --coverage
npx jest --watch           # modo watch

# Lint & Format
npx eslint . --fix
npm run lint

# Type Check
npx tsc --noEmit
```

## 🧪 Testing
- Unit: `src/__tests__/unit/`
- Integration: `src/__tests__/integration/`
- E2E: `e2e/tests/`
- UI Tests: `src/__tests__/ui/`

## 📁 Estructura Clave
```
src/
├── components/     → UI components (PetSprite, MoodPopup, RetroUI)
├── store/          → Zustand stores (petStore, taskStore)
├── utils/          → Business logic (petGameLoop.ts, petEngine.ts)
├── services/       → Data/API layer (database, groqChat, blocking)
└── types/          → TypeScript interfaces (index.ts)

app/
├── _layout.tsx     → App init + time decay
├── (tabs)/         → Screen navigators
└── camera/         → Task verification flow

native/android/     → Kotlin modules (BlockingService, AppBlockerModule)
```