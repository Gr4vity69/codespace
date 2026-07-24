# TaskMagotchi — Invariantes para Agentes de IA

## ⚠️ REGLAS SAGRADAS (NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA)

### 1. Native Android Module (Kotlin)
- Los archivos en `native/android/` son la ÚNICA fuente de verdad del módulo nativo
- `withAppBlocker.js` los COPIA al directorio `android/` durante el prebuild
- NO editar los archivos dentro de `android/` directamente — se sobrescriben en cada prebuild
- El módulo usa el puente `NativeModules.AppBlocker` desde JS
- **El bloqueo de apps NO funciona en Android moderno** (getRunningTasks restringido desde API 21). Hay un fallback con UsageStatsManager. La solución real requiere AccessibilityService.

### 2. Config Plugin (withAppBlocker.js)
- **Inyecta código Kotlin** (NO Java) desde SDK 57
- NO usar `new` keyword en Kotlin (`add(AppBlockerPackage())` en vez de `packages.add(new AppBlockerPackage())`)
- El plugin es IDEMPOTENTE — verifica si el código ya existe antes de insertar
- Permisos requeridos para Android 13+: `POST_NOTIFICATIONS`
- NO agregar `REQUEST_INSTALL_PACKAGES` — la app no instala APKs
- El foreground service usa `foregroundServiceType: 'specialUse'`

### 3. Expo SDK 57 Específico
- SDK 57 → React Native 0.86.0 → usa ReactHost, NO ReactNativeHost
- MainApplication es KOTLIN (`.kt`), NO Java
- El template usa `PackageList(this).packages.apply { add(...) }`
- Siempre leer docs versionados: https://docs.expo.dev/versions/v57.0.0/

### 4. Base de Datos (SQLite via expo-sqlite)
- Schema completo en `src/services/database.ts` — esa es la fuente de verdad
- `conversationMemory.ts` tiene `ensureTable()` pero NO debe definir el schema — solo crea la tabla si `database.ts` no lo hizo
- NO crear tablas duplicadas con diferentes schemas
- Migraciones: usar `CREATE TABLE IF NOT EXISTS` — NO modificar columnas existentes sin migración
- API keys NUNCA en texto plano — usar expo-secure-store cuando esté disponible

### 5. Stores (Zustand)
- `petStore.ts` + `taskStore.ts` son las fuentes de verdad en memoria
- Siempre escribir a DB primero, luego actualizar store (evitar optimistic updates sin rollback)
- `todayTasks` en taskStore filtra por fecha de creación — tareas viejas sin deadline quedan invisibles

### 6. AI Integration (Groq + Gemini)
- Groq: `Authorization: Bearer` header
- Gemini: `x-goog-api-key` header (NO en URL query param)
- Siempre usar AbortController con timeout de 30s en fetch
- Groq model: `llama-3.1-8b-instant`
- Gemini model: `gemini-1.5-flash`
- AI puede inventar packageNames — validar contra `getInstalledApps()` antes de bloquear

### 7. Regex para parseo de JSON
- SIEMPRE usar non-greedy `\{[\s\S]*?\}` — NUNCA greedy `\{[\s\S]*\}`
- Esto aplica en: `chat.tsx`, `ai.ts`, `conversationMemory.ts`
- Los catch de JSON.parse deben al menos hacer console.warn

### 8. Fonts
- `monoFont` está definido en `retroUi.tsx` — importarlo desde ahí
- NO hardcodear `fontFamily: 'monospace'` directamente en los estilos
- iOS: `Menlo`, Android: `monospace`

### 9. Seguridad
- API keys: almacenadas en tabla `api_keys` (plaintext por ahora)
- Migrar a expo-secure-store cuando sea posible
- Database backup: `allowBackup=true` en Android — keys extraíbles via ADB

## 📋 Deuda Técnica Conocida
1. **App blocker no funcional** — getRunningTasks no detecta otras apps en Android 10+. Solución: AccessibilityService
2. **showOverlay no implementado** — la función existe pero no crea overlay real
3. **Streak bonus no aplicado** — calculateTaskReward recibe hasStreak=false siempre
4. **Penalty system no integrado** — calculatePenalty existe pero nunca se llama
5. **happiness/hunger/energy en DB pero no en UI** — columnas existen, modelo TypeScript no las expone
6. **No hay transacciones en initDatabase** — schema creation sin BEGIN/COMMIT
7. **Math challenge no conecta con blocking** — es decorativo, no bloquea realmente

## 🔧 Comandos Útiles
```bash
# Build APK
cd proyecto/taskmagotchi
npx expo prebuild
eas build --profile preview --platform android

# Development
npx expo start
npx expo run:android

# Actualizar dependencias
npx expo install expo@latest --fix
```
