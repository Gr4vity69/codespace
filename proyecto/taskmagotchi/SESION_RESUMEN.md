# Resumen de Sesión — TaskMagotchi

## Stack
- React Native + Expo SDK 57, TypeScript, SQLite, Zustand, Expo Router
- AI: Groq (Llama 3.1, gratis) para chat, Gemini 1.5 Flash (gratis) para verificación de fotos
- Build: EAS Build cloud, APK descargado a `/workspaces/codespace/builds/`
- Cuenta EAS: `gr4v1tys-team`
- Repo: `https://github.com/Gr4vity69/codespace`

## Diseño visual (creado por ti)
- Tema retro/pixel oscuro
- Fondo `#050507`, paneles `#17131f`, bordes `#f7f0db` (2px), texto crema
- Tipografía monospace, esquinas rectas, orbes de luz difusos de fondo
- Botones pixel (solid/ghost/danger), burbujas de diálogo con cola, placeholder de sprite

## Progreso
- Proyecto scaffolded completo (20+ archivos fuente)
- SQLite con 10 tablas, auto-seeded
- Componentes retro integrados en TODAS las pantallas:
  - `_layout.tsx` (root + tabs) ✅
  - `index.tsx` (home con pet status, tasks, chat) ✅
  - `tasks.tsx` (CRUD, filtros, create modal) ✅
  - `pet.tsx` (stats, XP bar, economy, evolución) ✅
  - `chat.tsx` (AI chat con Groq) ✅
  - `settings.tsx` (API keys configurables) ✅
  - `camera/[taskId].tsx` (captura + verificación Gemini) ✅
- Servicios: database, GroqChatService, GeminiVisionService, bloqueo nativo bridge
- Stores: petStore (Zustand), taskStore (Zustand + SQLite)
- Utils: petEngine (XP/coins/streak/decay/mood), mathBlocker
- Primer APK compilado y subido como GitHub Release v1.0.0

## Conceptos clave de diseño
- "Materials" = apps permitidas durante una tarea (whitelist)
- "Días libres" comprables con coins del juego
- "Do nothing" bloquea apps temporalmente + aburrimiento como castigo
- Bloqueo tedioso: resolver ejercicio matemático (fácil/medio/difícil)
- Economía: coins por tarea + racha, gastar en día libre / ocio extra / cosméticos
- Penalización por tareas perdidas

## Siguientes pasos (cuando continúes localmente)
1. Trabajar en cambios visuales/pixel localmente
2. Hacer push a GitHub
3. Pedir build EAS → APK → GitHub Release

## Comandos útiles
```bash
npx expo start                          # desarrollo con QR
npx expo start --web                    # vista navegador
npx expo run:android                    # build local APK
eas build --platform android --profile preview  # build cloud
```

## Archivos relevantes
| Archivo | Propósito |
|---------|-----------|
| `src/components/retroUi.tsx` | Biblioteca de componentes retro/pixel |
| `app/` | Pantallas (Expo Router file-based) |
| `src/services/database.ts` | SQLite + schema + seed |
| `src/services/groqChat.ts` | Chat con Groq AI |
| `src/services/geminiVision.ts` | Verificación de fotos con Gemini |
| `src/services/blocking.ts` | Bridge nativo de bloqueo |
| `src/store/petStore.ts` | Estado de mascota (Zustand) |
| `src/store/taskStore.ts` | Estado de tareas (Zustand + SQLite) |
| `src/utils/petEngine.ts` | Motor de mascota (XP, mood, decay) |
| `src/utils/mathBlocker.ts` | Generador de ejercicios matemáticos |
| `eas.json` | Perfiles de build EAS |
| `.env` | API keys locales (Groq + Gemini) |
