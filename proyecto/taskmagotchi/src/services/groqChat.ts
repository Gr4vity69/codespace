import { getApiKey } from './apiKeys'

const GROQ_API_BASE = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.1-8b-instant'

interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface GroqResponse {
  choices: {
    message: {
      content: string
    }
  }[]
}

const BLOCKING_CAPABILITIES = `TAMBIÉN puedes ayudar al usuario a gestionar el bloqueo de aplicaciones.
- Si el usuario te pide bloquear una app, responde con un JSON:
  { "action": "block_app", "appName": "YouTube", "packageName": "com.google.android.youtube", "reason": "aumentar concentración" }
- Si pide desbloquear:
  { "action": "unblock_app", "appName": "Chrome", "packageName": "com.android.chrome" }
- Si pregunta qué apps puede bloquear o qué apps hay bloqueadas:
  { "action": "list_blocked" }
- Si sugieres bloquear una app que distrae:
  { "action": "block_suggestion", "appName": "Instagram", "packageName": "com.instagram.android", "reason": "te distrae de tus tareas" }
SIEMPRE responde en español, conversacional. Primero explica tu sugerencia, luego incluye el JSON si aplica.`

const SYSTEM_PROMPTS: Record<string, string> = {
  planning: `Eres Magotchi, una mascota virtual motivacional. Tu personalidad es amigable, entusiasta y un poco bromista.
    
    Tu tarea es ayudar al usuario a planificar su día:
    1. Pregunta qué tareas tiene pendientes
    2. Para cada tarea, pregunta: título, descripción, prioridad, tiempo estimado, qué aplicaciones necesita tener abiertas, y qué materiales/recursos
    3. Propón un horario estructurado con bloques de trabajo y descansos
    4. Responde SIEMPRE en español, de forma natural y conversacional
    
    Al final de la conversación, cuando tengas suficiente información, responde SOLO con un JSON:
    {
      "ready": true,
      "tasks": [{ "title": "...", "description": "...", "priority": "medium", "estimatedMinutes": 30, "whitelistedApps": ["..."], "materials": "..." }],
      "schedule": [{ "startTime": "09:00", "endTime": "10:00", "taskTitle": "...", "breakAfter": 15 }]
    }
    
    Si aún no tienes suficiente información, responde de forma conversacional sin incluir el JSON.
    
    ${BLOCKING_CAPABILITIES}`,
  motivation: `Eres Magotchi, una mascota virtual motivacional y entusiasta.
    
    El usuario no tiene tareas hoy. Tu trabajo es:
    1. Pregunta qué planea hacer hoy
    2. Sugiere actividades productivas: leer, practicar habilidades, hobby creativo, ejercicio, etc.
    3. Sé inspirador y alentador
    4. Responde SIEMPRE en español
    
    Si el usuario acepta una sugerencia, puedes responder con:
    {
      "ready": true,
      "suggestion": "nombre de la actividad",
      "description": "descripción de lo que hará",
      "duration": 30
    }
    
    ${BLOCKING_CAPABILITIES}`,
  general: `Eres Magotchi, una mascota virtual. Responde en español de forma amigable y conversacional.
  
  ${BLOCKING_CAPABILITIES}`,
}

export function buildSystemPrompt(context: string): string {
  return SYSTEM_PROMPTS[context] || SYSTEM_PROMPTS.general
}

async function callGroq(messages: GroqMessage[]): Promise<string> {
  const apiKey = await getApiKey('GROQ')

  if (!apiKey) {
    return 'Necesito configurar mi API key de Groq para hablar contigo. Por favor, agrégala en la configuración.'
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(GROQ_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`)
    }

    const data: GroqResponse = await response.json()
    return data.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('Groq chat error:', error)
    return 'Oops, tuve un problema para pensar. ¿Podemos intentarlo de nuevo?'
  }
}

export async function sendMessage(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  context: string = 'general'
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context)
  const groqMessages: GroqMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ]

  return callGroq(groqMessages)
}

interface MemoryContext {
  conversationSummary?: string
  pendingTasks?: string
  todaySchedule?: string
  currentMood?: string
  petLevel?: string
}

export async function sendMessageWithMemory(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  context: string = 'general',
  memory: MemoryContext = {},
): Promise<string> {
  let systemPrompt = buildSystemPrompt(context)

  const contextParts: string[] = []

  if (memory.conversationSummary) {
    contextParts.push(memory.conversationSummary)
  }

  if (memory.todaySchedule) {
    contextParts.push(`\nCalendario de hoy:\n${memory.todaySchedule}`)
  }

  if (memory.pendingTasks) {
    contextParts.push(`\nTareas pendientes:\n${memory.pendingTasks}`)
  }

  if (memory.currentMood) {
    contextParts.push(`\nEstado de ánimo actual: ${memory.currentMood}`)
  }

  if (memory.petLevel) {
    contextParts.push(`\nNivel de Magotchi: ${memory.petLevel}`)
  }

  if (contextParts.length > 0) {
    systemPrompt += '\n\nINFORMACIÓN CONTEXTUAL ACTUAL:\n' + contextParts.join('\n')
    systemPrompt += '\n\nUsa esta información para responder de forma coherente con lo que ya se ha hecho hoy. No repitas información que ya está aquí a menos que te pregunten.'
  }

  const groqMessages: GroqMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ]

  return callGroq(groqMessages)
}
