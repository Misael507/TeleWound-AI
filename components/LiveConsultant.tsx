import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, X, Activity, Radio } from 'lucide-react';

// Audio encoding/decoding helpers
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
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

function createBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

interface LiveConsultantProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveConsultant: React.FC<LiveConsultantProps> = ({ isOpen, onClose }) => {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("Conectando...");
  const sessionRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null); // Input Context
  const outputAudioContextRef = useRef<AudioContext | null>(null); // Output Context
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Clean up function
  const stopSession = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Safely close input context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    // Safely close output context
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
    }

    setActive(false);
    sessionRef.current = null;
  };

  useEffect(() => {
    if (!isOpen) {
      stopSession();
      return;
    }

    const startSession = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        
        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        audioContextRef.current = inputAudioContext;
        outputAudioContextRef.current = outputAudioContext;
        
        const outputNode = outputAudioContext.createGain();
        outputNode.connect(outputAudioContext.destination);
        
        let nextStartTime = 0;
        const sources = new Set<AudioBufferSourceNode>();

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
              setStatus("Escuchando...");
              setActive(true);
              
              const source = inputAudioContext.createMediaStreamSource(stream);
              const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
              scriptProcessorRef.current = scriptProcessor;

              scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                sessionPromise.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioContext.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              
              if (base64Audio) {
                 nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                 const audioBuffer = await decodeAudioData(
                   decode(base64Audio),
                   outputAudioContext,
                   24000,
                   1
                 );
                 
                 const source = outputAudioContext.createBufferSource();
                 source.buffer = audioBuffer;
                 source.connect(outputNode);
                 source.addEventListener('ended', () => sources.delete(source));
                 source.start(nextStartTime);
                 nextStartTime += audioBuffer.duration;
                 sources.add(source);
              }

              if (message.serverContent?.interrupted) {
                sources.forEach(s => s.stop());
                sources.clear();
                nextStartTime = 0;
              }
            },
            onclose: () => setStatus("Desconectado"),
            onerror: (e) => console.error(e)
          },
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: "Eres un asistente de enfermería especializado en el cuidado de heridas. Responde preguntas brevemente en español sobre protocolos de curación, higiene y signos de emergencia. Sé amable y profesional.",
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
          }
        });
        
        sessionRef.current = sessionPromise;

      } catch (err) {
        console.error("Live API Error", err);
        setStatus("Error accediendo al micrófono");
      }
    };

    startSession();

    return () => {
      stopSession();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 relative flex flex-col items-center border border-slate-100">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="relative mb-8 mt-4">
           {/* Ripple Effect */}
           {active && (
             <div className="absolute inset-0 bg-teal-500 rounded-full animate-ping opacity-20"></div>
           )}
           <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg ${active ? 'bg-gradient-to-br from-teal-400 to-teal-600 text-white scale-110' : 'bg-slate-100 text-slate-400'}`}>
             <Mic size={40} />
           </div>
        </div>
        
        <h3 className="text-xl font-bold text-slate-800 mb-2">Asistente de Voz AI</h3>
        <p className="text-sm text-slate-500 text-center mb-6 h-6">
           {status}
        </p>

        {active ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-full border border-teal-100">
                <Activity className="animate-pulse" size={16} />
                <span className="text-xs font-semibold tracking-wide">EN VIVO</span>
            </div>
        ) : (
            <div className="h-9"></div>
        )}

        <div className="mt-8 text-center text-xs text-slate-400 max-w-[200px]">
          Pregunta sobre protocolos de limpieza o signos de infección.
        </div>
      </div>
    </div>
  );
};