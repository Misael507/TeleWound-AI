import { GoogleGenAI, Type, Modality } from "@google/genai";
import { WoundAnalysis, MapPlace } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to encode image file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Stage 4: AI Diagnostics
 * Uses proprietary NexusCore Engine (mapped to Gemini 3 Pro)
 */
export const analyzeWoundImage = async (base64Image: string): Promise<WoundAnalysis> => {
  try {
    const prompt = `
      Actúa como 'NexusCore v5', un sistema experto avanzado en dermatología y cuidado de heridas crónicas.
      Tu objetivo es generar un informe clínico de alta precisión basado en la imagen proporcionada.
      
      ANALIZA PROFUNDAMENTE LA IMAGEN (Thinking Process). Identifica patrones sutiles en el lecho de la herida, el estado de la piel perilesional (maceración, eritema), tipo de exudado y signos de infección o bio-film.

      Genera un JSON con la siguiente estructura estricta:

      1. **Segmentación Tisular**: 
         - Granulación (Tejido rojo, sano/vascularizado).
         - Esfacelo (Tejido amarillo/blanco, desvitalizado).
         - Necrosis (Tejido negro/marrón duro).
         (La suma debe ser 100%).
      2. **Morfometría**: Estima el área en cm².
      3. **Gravedad**: Puntuación 1-10 basada en la escala visual.
      4. **SVG**: Un path 'd' simple (viewbox 0 0 100 100) que contornee la herida.
      5. **Descripción TÉCNICA (Médica)**: Redacta un informe estructurado y profesional en ESPAÑOL. 
         - Divide el texto en párrafos lógicos: "Lecho de la herida", "Bordes y Piel Perilesional", "Exudado".
         - Usa terminología médica precisa (ej. hiperqueratosis, epitelización, eritema perilesional, socavamiento).
         - Sé coherente con los porcentajes detectados.
      6. **Descripción PACIENTE**: Explicación empática, simple y educativa. Evita tecnicismos. Enfócate en la higiene y signos de alarma.
      7. **Protocolo Sugerido**: Basado en el esquema TIME (Tissue, Infection, Moisture, Edge).

      Retorna JSON estrictamente.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            granulationPercent: { type: Type.NUMBER },
            sloughPercent: { type: Type.NUMBER },
            necrosisPercent: { type: Type.NUMBER },
            areaCm2: { type: Type.NUMBER },
            severityScore: { type: Type.NUMBER },
            tissueMapSvg: { type: Type.STRING },
            analysisText: { type: Type.STRING, description: "Informe médico estructurado y detallado" },
            patientFriendlyText: { type: Type.STRING, description: "Explicación educativa para el paciente" },
            suggestedProtocol: {
              type: Type.OBJECT,
              properties: {
                cleansing: { type: Type.STRING, description: "Solución de limpieza sugerida" },
                debridement: { type: Type.STRING, description: "Método de desbridamiento si aplica" },
                primaryDressing: { type: Type.STRING, description: "Apósito de contacto directo" },
                secondaryDressing: { type: Type.STRING, description: "Apósito de fijación/absorción" },
                frequency: { type: Type.STRING, description: "Frecuencia de curación (ej. cada 24h)" },
                offloading: { type: Type.STRING, description: "Medidas de descarga o protección" }
              },
              required: ["cleansing", "primaryDressing", "frequency"]
            }
          },
          required: ["granulationPercent", "sloughPercent", "necrosisPercent", "areaCm2", "severityScore", "analysisText", "patientFriendlyText", "suggestedProtocol"]
        }
      }
    });

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText) as WoundAnalysis;
  } catch (error) {
    console.error("NexusCore Analysis Failed:", error);
    throw error;
  }
};

/**
 * Stage 6: Maps Grounding
 */
export const findNearbyHospitals = async (lat: number, lng: number): Promise<MapPlace[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Encuentra los 3 hospitales o clínicas de heridas más cercanos.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng }
          }
        }
      }
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const places: MapPlace[] = [];

    if (chunks) {
      chunks.forEach(chunk => {
        if (chunk.maps) {
           places.push({
             name: chunk.maps.title || "Centro Médico",
             address: "Ver ubicación en mapa",
             uri: chunk.maps.uri
           });
        }
      });
    }

    return places;
  } catch (error) {
    console.error("Maps search failed", error);
    return [];
  }
};

// PCM Decoding Helpers
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodePCM(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * TTS Helper
 */
export const speakText = async (text: string): Promise<AudioBuffer | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    // Use PCM decoding instead of native decodeAudioData which expects headers
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    const bytes = decode(base64Audio);
    const buffer = await decodePCM(bytes, audioContext);
    
    if (audioContext.state !== 'closed') {
       // Keep context open? Or close?
       // If we close it, we might lose the ability to use the buffer if it's tied to context resources? 
       // Usually AudioBuffer is independent once decoded.
       // However, to be safe, we can leave it or close it. 
       // The calling function creates its own context to play.
       await audioContext.close();
    }
    return buffer;
  } catch (e) {
    console.error("TTS Failed", e);
    return null;
  }
};