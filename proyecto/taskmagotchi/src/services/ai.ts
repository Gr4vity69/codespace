import { getApiKey } from './apiKeys'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[]
    }
  }[]
}

export async function verifyTaskCompletion(
  photoBase64: string,
  taskTitle: string,
  taskDescription: string
): Promise<{ verified: boolean; reason: string }> {
  const apiKey = await getApiKey('GEMINI')

  if (!apiKey) {
    return { verified: false, reason: 'API key de Gemini no configurada' }
  }

  try {
    const response = await fetch(GEMINI_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: photoBase64,
              },
            },
            {
              text: `Verifica si esta persona ha completado la siguiente tarea: "${taskTitle}".
              Descripción: "${taskDescription}".
              
              Responde ÚNICAMENTE con un JSON:
              {
                "verified": true/false,
                "confidence": 0.0-1.0,
                "reason": "explicación breve en español"
              }`,
            },
          ],
        }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data: GeminiResponse = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const jsonMatch = text.match(/\{[\s\S]*?\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      return {
        verified: result.verified === true,
        reason: result.reason || 'Verificado por IA',
      }
    }

    return { verified: false, reason: 'No se pudo interpretar la respuesta de la IA' }
  } catch (error) {
    console.error('Gemini verification error:', error)
    return { verified: false, reason: 'Error al conectar con la IA de verificación' }
  }
}
