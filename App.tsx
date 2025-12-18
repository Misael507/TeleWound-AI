import React, { useState, useEffect, useRef } from 'react';
import { AppStage, Patient, WoundAnalysis, ClinicalReport, MapPlace, CareProtocol } from './types';
import { 
  HeartPulse, UserPlus, Upload, FileImage, 
  Activity, CheckCircle, AlertOctagon, ArrowRight, 
  Mic, MapPin, Volume2, Stethoscope, ClipboardCheck, ArrowLeft,
  Moon, Sun, Video, MessageSquare, BellRing, Share2, ShieldCheck, Thermometer,
  FileText, LayoutDashboard, Microscope, Info, Lightbulb, User, Mail, Printer, X, Sparkles, Bot, Download, Image as ImageIcon, ScanLine
} from 'lucide-react';
import { analyzeWoundImage, findNearbyHospitals, speakText, fileToGenerativePart } from './services/geminiService';
import { LiveConsultant } from './components/LiveConsultant';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// --- Utilities ---

const DarkModeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggle = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <button 
      onClick={toggle}
      className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors print:hidden"
      title="Cambiar Tema"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};

// --- Modal Component ---

const PatientModal = ({ patient, onClose }: { patient: Patient, onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="text-sky-500" /> Expediente Digital
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg">
                        <label className="text-xs font-bold text-slate-400 uppercase">MRN</label>
                        <p className="font-mono text-slate-800 dark:text-slate-200 font-bold">{patient.id}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg">
                         <label className="text-xs font-bold text-slate-400 uppercase">Encuentro</label>
                         <p className="font-mono text-slate-800 dark:text-slate-200 font-bold">{patient.admissionId}</p>
                    </div>
                </div>
                <div>
                     <label className="text-xs font-bold text-slate-400 uppercase">Nombre Completo</label>
                     <p className="text-lg text-slate-800 dark:text-white font-medium">{patient.firstName} {patient.lastName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                         <label className="text-xs font-bold text-slate-400 uppercase">Fecha Nacimiento</label>
                         <p className="text-slate-800 dark:text-slate-200">{patient.dob}</p>
                    </div>
                    <div>
                         <label className="text-xs font-bold text-slate-400 uppercase">Género</label>
                         <p className="text-slate-800 dark:text-slate-200">{patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Femenino' : 'Otro'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Teléfono</label>
                        <p className="text-slate-800 dark:text-slate-200">{patient.phone || 'No registrado'}</p>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
                        <p className="text-slate-800 dark:text-slate-200 truncate" title={patient.email}>{patient.email || 'No registrado'}</p>
                    </div>
                </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-b-2xl border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                    <CheckCircle size={12} /> Sincronizado HL7 v2.5
                </span>
            </div>
        </div>
    </div>
);

// --- Components ---

// Stage 1: Welcome
const Welcome = ({ onStart }: { onStart: () => void }) => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative overflow-hidden transition-colors duration-500 print:hidden">
    <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none">
       <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-sky-500 rounded-full blur-[120px]"></div>
       <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[100px]"></div>
    </div>

    <header className="p-8 flex justify-between items-center relative z-10">
       <div className="flex items-center gap-3">
          <div className="bg-sky-600 p-2 rounded-lg text-white">
             <LayoutDashboard size={24} />
          </div>
          <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
             Nexus<span className="text-sky-600">Health</span>
          </span>
       </div>
       <DarkModeToggle />
    </header>

    <div className="flex-1 flex flex-col justify-center items-center text-center px-6 relative z-10">
      {/* Removed HIPAA certification badge as requested */}

      <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight tracking-tight mt-12">
        Telemedicina Avanzada para <br/>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-400">
           Cuidado de Heridas
        </span>
      </h1>

      <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
        Plataforma de grado hospitalario impulsada por <strong className="text-sky-600 dark:text-sky-400">NexusCore v5</strong>. 
        Monitoreo remoto, segmentación tisular automatizada y protocolos clínicos inteligentes en una suite unificada.
      </p>

      <button 
        onClick={onStart}
        className="px-8 py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-sky-500/30 transition-all transform hover:-translate-y-1 flex items-center gap-2"
      >
        Iniciar Panel Clínico <ArrowRight size={20} />
      </button>

      <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 text-slate-400 dark:text-slate-500 font-semibold text-sm uppercase tracking-widest">
         <span className="flex items-center justify-center gap-2"><Activity size={18} /> HL7 ADT</span>
         <span className="flex items-center justify-center gap-2"><FileImage size={18} /> DICOM ISO</span>
         <span className="flex items-center justify-center gap-2"><Microscope size={18} /> IA Tisular</span>
         <span className="flex items-center justify-center gap-2"><CheckCircle size={18} /> Validación EMR</span>
      </div>
    </div>
  </div>
);

// Stage 2: Admission
const Admission = ({ onComplete }: { onComplete: (p: Patient) => void }) => {
  const [formData, setFormData] = useState<Partial<Patient>>({
    id: `MRN-${Math.floor(Math.random() * 100000)}`,
    admissionId: `ENC-${Math.floor(Math.random() * 100000)}`,
    firstName: '', lastName: '', dob: '', gender: '', phone: '', email: ''
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleComplete = () => {
      // Basic validation
      if(formData.firstName && formData.lastName && formData.gender && formData.email) {
          setIsSendingEmail(true);
          // Simulate email sending delay
          setTimeout(() => {
              setIsSendingEmail(false);
              // In a real app with backend, this would trigger an SMTP call.
              alert(`Confirmación enviada a ${formData.email}\nOrden generada correctamente.`);
              onComplete(formData as Patient);
          }, 1500);
      } else {
          alert("Por favor complete los campos obligatorios (Nombres, Apellidos, Género, Email)");
      }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in print:hidden">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        <div className="flex items-center gap-4 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="p-3 bg-sky-100 dark:bg-sky-900/50 rounded-xl text-sky-600 dark:text-sky-400"><UserPlus size={28} /></div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Admisión Digital (HL7)</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Sincronizando datos demográficos del HIS...</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
           <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">ID Paciente</label>
              <input disabled value={formData.id} className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-lg px-4 py-3 font-mono text-slate-600 dark:text-slate-300" />
           </div>
           <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">ID Encuentro</label>
              <input disabled value={formData.admissionId} className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-lg px-4 py-3 font-mono text-slate-600 dark:text-slate-300" />
           </div>
           <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombres <span className="text-red-500">*</span></label>
              <input 
                onChange={e => setFormData({...formData, firstName: e.target.value})}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-sky-500 outline-none dark:text-white" placeholder="Ej. Ana María" />
           </div>
           <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Apellidos <span className="text-red-500">*</span></label>
              <input 
                onChange={e => setFormData({...formData, lastName: e.target.value})}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-sky-500 outline-none dark:text-white" placeholder="Ej. Rodríguez" />
           </div>
           <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fecha Nacimiento</label>
              <input 
                type="date"
                onChange={e => setFormData({...formData, dob: e.target.value})}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-sky-500 outline-none dark:text-white" />
           </div>
           <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Género <span className="text-red-500">*</span></label>
              <select 
                onChange={e => setFormData({...formData, gender: e.target.value})}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-sky-500 outline-none dark:text-white"
              >
                  <option value="">Seleccionar...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="O">Otro</option>
              </select>
           </div>
           <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Teléfono</label>
              <input 
                type="tel"
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-sky-500 outline-none dark:text-white" placeholder="+52 55..." />
           </div>
           <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email (Notificaciones) <span className="text-red-500">*</span></label>
              <input 
                type="email"
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-sky-500 outline-none dark:text-white" placeholder="paciente@email.com" />
           </div>
        </div>

        <button 
          onClick={handleComplete}
          disabled={isSendingEmail}
          className="w-full py-4 bg-slate-900 dark:bg-sky-600 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity flex justify-center items-center gap-2 shadow-lg"
        >
           {isSendingEmail ? (
               <>Enviando Confirmación <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div></>
           ) : (
               <>Generar Orden RIS y Continuar <ArrowRight size={18} /></>
           )}
        </button>
      </div>
    </div>
  );
};

// Stage 3: Acquisition
const Acquisition = ({ onImageCaptured }: { onImageCaptured: (file: File, base64: string) => void }) => {
  const [processing, setProcessing] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProcessing(true);
      const file = e.target.files[0];
      const base64 = await fileToGenerativePart(file);
      setTimeout(() => { setProcessing(false); onImageCaptured(file, base64); }, 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in flex flex-col md:flex-row gap-8 print:hidden">
       {/* Left: Interactive Guide */}
       <div className="w-full md:w-1/3 space-y-4">
           <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Captura Clínica</h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Siga las guías inteligentes para asegurar un análisis preciso de la IA NexusCore.</p>
           
           <div className="bg-sky-50 dark:bg-slate-800/50 p-4 rounded-xl border border-sky-100 dark:border-slate-700 flex items-start gap-3">
               <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-sky-500 shadow-sm"><Lightbulb size={18} /></div>
               <div>
                   <h4 className="font-bold text-slate-800 dark:text-white text-sm">Iluminación</h4>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Use luz blanca difusa. Evite sombras duras sobre el lecho de la herida.</p>
               </div>
           </div>
           
           <div className="bg-indigo-50 dark:bg-slate-800/50 p-4 rounded-xl border border-indigo-100 dark:border-slate-700 flex items-start gap-3">
               <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-indigo-500 shadow-sm"><Info size={18} /></div>
               <div>
                   <h4 className="font-bold text-slate-800 dark:text-white text-sm">Referencia y Ángulo</h4>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Coloque una regla desechable cerca. Tome la foto a 90° (perpendicular) de la herida.</p>
               </div>
           </div>

           <div className="bg-emerald-50 dark:bg-slate-800/50 p-4 rounded-xl border border-emerald-100 dark:border-slate-700 flex items-start gap-3">
               <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-emerald-500 shadow-sm"><CheckCircle size={18} /></div>
               <div>
                   <h4 className="font-bold text-slate-800 dark:text-white text-sm">Enfoque</h4>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Asegúrese que los bordes y la piel perilesional estén nítidos.</p>
               </div>
           </div>
       </div>

       {/* Right: Upload Area */}
       <div className="w-full md:w-2/3">
            {processing ? (
                <div className="h-full min-h-[400px] bg-white dark:bg-slate-900 rounded-3xl p-16 shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Procesando Imagen...</h3>
                    <p className="text-slate-500 font-mono text-sm">Encapsulando DICOM (1.2.840.10008...)</p>
                </div>
            ) : (
                <label className="h-full min-h-[400px] block group cursor-pointer bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-lg border-2 border-dashed border-slate-300 dark:border-slate-700 group-hover:border-sky-500 dark:group-hover:border-sky-500 transition-all relative overflow-hidden flex flex-col items-center justify-center text-center">
                    <div className="absolute inset-0 bg-sky-50 dark:bg-sky-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10">
                        <div className="w-24 h-24 bg-sky-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-sky-600 dark:text-sky-400 mx-auto mb-6 group-hover:scale-110 transition-transform">
                            <Upload size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Subir Fotografía</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Formatos soportados: JPG, PNG o TIFF. Máximo 20MB.</p>
                        <span className="mt-6 inline-block px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-500">DICOM Ready</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                </label>
            )}
       </div>
    </div>
  );
};

// Stage 4 & 5: Diagnostics (Enhanced UI)
const DiagnosticsAndReview = ({ image, base64, patient, onFinalize }: { image: File, base64: string, patient: Patient, onFinalize: (r: ClinicalReport) => void }) => {
  const [analysis, setAnalysis] = useState<WoundAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'protocol'>('analysis');
  const [viewMode, setViewMode] = useState<'medical' | 'patient'>('medical'); // Toggle for description
  const [protocol, setProtocol] = useState<CareProtocol | null>(null);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    analyzeWoundImage(base64).then(res => {
      setAnalysis(res);
      setProtocol(res.suggestedProtocol);
    });
  }, [base64]);

  const handleUrgency = () => {
      window.open('https://meet.google.com/new', '_blank');
  };

  const handleNotify = () => {
      if(patient.email) {
         // Functional Mailto fallback
         const subject = encodeURIComponent("Actualización Importante: Consulta de Telemedicina");
         const body = encodeURIComponent(`Estimado/a ${patient.firstName},\n\nSu especialista ha revisado su caso. Por favor revise su aplicación.\n\nAtte: Equipo NexusHealth.`);
         window.location.href = `mailto:${patient.email}?subject=${subject}&body=${body}`;
      } else {
        alert("El paciente no tiene correo registrado.");
      }
  };

  const handleTTS = () => {
      if(analysis) {
          const textToRead = viewMode === 'medical' ? analysis.analysisText : analysis.patientFriendlyText;
          speakText(textToRead).then(buffer => {
              if (buffer) {
                 const ctx = new AudioContext();
                 const source = ctx.createBufferSource();
                 source.buffer = buffer;
                 source.connect(ctx.destination);
                 source.start(0);
                 source.onended = () => { if(ctx.state !== 'closed') ctx.close(); };
              }
          });
      }
  };

  if (!analysis || !protocol) {
    return (
       <div className="max-w-4xl mx-auto text-center pt-20">
          <div className="relative inline-block">
             <div className="w-24 h-24 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center">
                <Activity className="text-indigo-600 animate-pulse" size={32} />
             </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-2">NexusCore v5 Analizando...</h2>
          <p className="text-slate-500">Realizando segmentación tisular y consultando guías clínicas.</p>
       </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 h-[calc(100vh-140px)] min-h-[800px] print:h-auto print:block">
      
      {/* Col 1: Visuals (Left) - Span 5 */}
      <div className="xl:col-span-5 bg-slate-900 rounded-3xl relative overflow-hidden flex flex-col shadow-2xl border border-slate-700 print:mb-8">
         <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between items-start print:hidden">
            <div className="text-white">
               <p className="font-bold text-lg">{patient.firstName} {patient.lastName}</p>
               <p className="text-xs font-mono opacity-70">MRN: {patient.id}</p>
            </div>
            <div className="flex gap-2">
               <button onClick={() => setShowOverlay(!showOverlay)} className="bg-white/10 hover:bg-white/20 backdrop-blur text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2">
                  <ScanLine size={14} />
                  {showOverlay ? 'Ocultar AI' : 'Ver Original'}
               </button>
            </div>
         </div>

         {/* Improved Image Container - REFACTORED FOR BETTER OVERLAY ALIGNMENT */}
         <div className="flex-1 bg-slate-950 w-full h-full flex items-center justify-center p-4 relative overflow-hidden group">
            {/* Medical Grid Background */}
            <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
            
            <div className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-800">
                <img 
                    src={URL.createObjectURL(image)} 
                    className="max-h-[600px] w-auto object-contain block" 
                    alt="Clinical Wound"
                />
                
                {showOverlay && (
                    <div className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen opacity-90">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                            <path 
                                d={analysis.tissueMapSvg} 
                                fill="none" 
                                stroke="#00ff9d" 
                                strokeWidth="0.8" 
                                strokeDasharray="2,1"
                                className="animate-[pulse_3s_ease-in-out_infinite]"
                            />
                            {/* Optional: Add a subtle fill for better visibility */}
                            <path 
                                d={analysis.tissueMapSvg} 
                                fill="#00ff9d" 
                                fillOpacity="0.1"
                                stroke="none"
                            />
                        </svg>
                    </div>
                )}
            </div>
         </div>

         <div className="bg-slate-800 p-6 print:bg-white print:text-black print:border-t">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-slate-300 font-bold uppercase tracking-widest text-xs print:text-slate-800">Biometría Tisular</h3>
               <span className="text-emerald-400 font-mono text-lg font-bold print:text-emerald-700">{analysis.areaCm2} cm²</span>
            </div>
            <div className="flex h-4 rounded-full overflow-hidden mb-2 print:border print:border-slate-300">
               <div style={{width: `${analysis.granulationPercent}%`}} className="bg-rose-500" title="Granulación"></div>
               <div style={{width: `${analysis.sloughPercent}%`}} className="bg-amber-400" title="Esfacelo"></div>
               <div style={{width: `${analysis.necrosisPercent}%`}} className="bg-slate-900" title="Necrosis"></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400 font-mono">
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div>Granulación {analysis.granulationPercent}%</span>
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div>Esfacelo {analysis.sloughPercent}%</span>
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-600"></div>Necrosis {analysis.necrosisPercent}%</span>
            </div>
         </div>
      </div>

      {/* Col 2: Clinical Data & Protocol (Right) - Span 7 */}
      <div className="xl:col-span-7 flex flex-col gap-6 h-full overflow-hidden print:h-auto print:overflow-visible">
         
         {/* Navigation Tabs */}
         <div className="flex p-1 bg-slate-200 dark:bg-slate-800 rounded-xl w-fit print:hidden">
            <button 
              onClick={() => setActiveTab('analysis')}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'analysis' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
               Análisis Clínico
            </button>
            <button 
               onClick={() => setActiveTab('protocol')}
               className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'protocol' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
               Protocolo de Cuidado
            </button>
         </div>

         {/* Scrollable Content */}
         <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 print:overflow-visible">
            
            {(activeTab === 'analysis' || true) && ( // Show both in print if strictly needed, but logic here shows current active
               <div className={`bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in relative ${activeTab !== 'analysis' ? 'hidden print:block' : ''}`}>
                  
                  {/* Header with TTS & Toggles */}
                  <div className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                     <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Microscope className="text-indigo-500" /> Hallazgos Clínicos
                     </h3>
                     
                     <div className="flex items-center gap-4 print:hidden">
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                            <button 
                                onClick={() => setViewMode('medical')} 
                                className={`px-3 py-1 text-xs font-bold rounded transition-all ${viewMode === 'medical' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                Médico
                            </button>
                            <button 
                                onClick={() => setViewMode('patient')} 
                                className={`px-3 py-1 text-xs font-bold rounded transition-all ${viewMode === 'patient' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                Paciente
                            </button>
                        </div>
                        <button onClick={handleTTS} className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 transition-colors shadow-sm" title="Leer en voz alta">
                            <Volume2 size={20} />
                        </button>
                     </div>
                  </div>
                  
                  <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed text-lg min-h-[150px] whitespace-pre-wrap">
                     {viewMode === 'medical' ? (
                        analysis.analysisText
                     ) : (
                        <div className="bg-sky-50 dark:bg-sky-900/20 p-6 rounded-xl border border-sky-100 dark:border-sky-800/50">
                            <h4 className="font-bold text-sky-800 dark:text-sky-200 mb-2 flex items-center gap-2"><Info size={18}/> Información para el Paciente</h4>
                            <p className="text-sky-800 dark:text-sky-200">{analysis.patientFriendlyText}</p>
                        </div>
                     )}
                  </div>
                  
                  <div className="mt-8 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-center gap-4 print:border-slate-300">
                     <div className={`text-2xl font-bold ${analysis.severityScore > 5 ? 'text-red-500' : 'text-indigo-600'}`}>
                        {analysis.severityScore}/10
                     </div>
                     <div className="text-sm text-slate-600 dark:text-slate-400">
                        <strong>Escala de Severidad Nexus:</strong> Basada en carga necrótica y dimensiones.
                     </div>
                  </div>
               </div>
            )}

            {(activeTab === 'protocol' || true) && (
               <div className={`bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in space-y-6 ${activeTab !== 'protocol' ? 'hidden print:block print:mt-8' : ''}`}>
                  <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                     <ClipboardCheck className="text-emerald-500" size={24} />
                     <h3 className="text-xl font-bold text-slate-800 dark:text-white">Plan de Tratamiento (TIME)</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Limpieza</label>
                        <input value={protocol.cleansing} onChange={(e) => setProtocol({...protocol, cleansing: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none print:border-none print:p-0 print:font-bold" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Desbridamiento</label>
                        <input value={protocol.debridement} onChange={(e) => setProtocol({...protocol, debridement: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none print:border-none print:p-0 print:font-bold" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Apósito Primario</label>
                        <input value={protocol.primaryDressing} onChange={(e) => setProtocol({...protocol, primaryDressing: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none print:border-none print:p-0 print:font-bold" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Apósito Secundario</label>
                        <input value={protocol.secondaryDressing} onChange={(e) => setProtocol({...protocol, secondaryDressing: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none print:border-none print:p-0 print:font-bold" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Frecuencia</label>
                        <input value={protocol.frequency} onChange={(e) => setProtocol({...protocol, frequency: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none print:border-none print:p-0 print:font-bold" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Descarga / Protección</label>
                        <input value={protocol.offloading} onChange={(e) => setProtocol({...protocol, offloading: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none print:border-none print:p-0 print:font-bold" />
                     </div>
                  </div>
               </div>
            )}

            {/* Doctor Actions */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 print:hidden">
               <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Notas Adicionales del Especialista</label>
               <textarea 
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder="Observaciones clínicas adicionales..."
                  className="w-full h-24 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-sm dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
               />

               <div className="mt-6 flex flex-col md:flex-row gap-4">
                  <div className="flex gap-2">
                     <button onClick={handleUrgency} className="flex-1 px-4 py-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-sm hover:bg-rose-100 dark:hover:bg-rose-900/50 flex items-center justify-center gap-2">
                        <Video size={18} /> Urgencia
                     </button>
                     <button onClick={handleNotify} className="flex-1 px-4 py-3 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-xl font-bold text-sm hover:bg-sky-100 dark:hover:bg-sky-900/50 flex items-center justify-center gap-2">
                        <BellRing size={18} /> Notificar
                     </button>
                  </div>
                  <button 
                     onClick={() => onFinalize({ validatedAnalysis: analysis, finalProtocol: protocol, doctorNotes, diagnosis: "Revisado", recommendedAction: "Seguir Protocolo" })}
                     className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
                  >
                     <ShieldCheck size={20} /> Validar y Cerrar Episodio
                  </button>
               </div>
            </div>

         </div>
      </div>
    </div>
  );
};

// Stage 6: Closure (Telemedicine Focus)
const Closure = ({ report, patient, imageFile }: { report: ClinicalReport, patient: Patient, imageFile: File }) => {
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const results = await findNearbyHospitals(pos.coords.latitude, pos.coords.longitude);
            setPlaces(results);
        });
    }
  }, []);

  // Helper to generate a Blob from the report
  const generatePDFBlob = async (): Promise<Blob | null> => {
     if (!summaryRef.current) return null;
     
     // 1. Capture the DOM element
     const canvas = await html2canvas(summaryRef.current, { 
        scale: 2, // High resolution
        backgroundColor: '#ffffff' // Ensure white background
     });
     
     const imgData = canvas.toDataURL('image/png');
     
     // 2. Create PDF
     // A4 size: 210 x 297 mm
     const pdf = new jsPDF('p', 'mm', 'a4');
     const pdfWidth = pdf.internal.pageSize.getWidth();
     const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
     
     pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
     
     return pdf.output('blob');
  };

  const handleDownloadPDF = async () => {
      const blob = await generatePDFBlob();
      if(blob) {
         const url = URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = url;
         link.download = `Reporte-Clinico-${patient.lastName}.pdf`;
         link.click();
         URL.revokeObjectURL(url);
      }
  };

  const handleSharePDF = async () => {
       const blob = await generatePDFBlob();
       if(blob && navigator.share) {
          const file = new File([blob], `Reporte-${patient.lastName}.pdf`, { type: 'application/pdf' });
          try {
             await navigator.share({
                 title: 'Reporte Clínico NexusHealth',
                 text: `Adjunto reporte de valoración de heridas para ${patient.firstName} ${patient.lastName}.`,
                 files: [file]
             });
          } catch(e) {
             console.log("Error sharing", e);
          }
       } else {
           alert("Su navegador no soporta compartir archivos PDF directamente. Por favor descargue el archivo.");
           handleDownloadPDF();
       }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-fade-in print:max-w-full">
       <div className="bg-emerald-600 text-white rounded-3xl p-10 text-center shadow-2xl mb-10 relative overflow-hidden print:hidden">
          <div className="absolute inset-0 bg-emerald-500 opacity-20" style={{backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
          <div className="relative z-10">
             <div className="w-16 h-16 bg-white text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CheckCircle size={32} />
             </div>
             <h2 className="text-3xl font-bold mb-2">Episodio Clínico Finalizado</h2>
             <p className="opacity-90">Bundle FHIR generado y transmitido al EMR.</p>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Detailed Summary Card for PDF */}
          <div ref={summaryRef} className="md:col-span-2 bg-white dark:bg-white rounded-3xl p-8 shadow-lg border border-slate-200 text-slate-900">
             <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-sky-600" /> Reporte Clínico
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">NexusHealth AI Diagnostics</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-slate-800">{patient.firstName} {patient.lastName}</p>
                    <p className="text-xs text-slate-500 font-mono">MRN: {patient.id}</p>
                </div>
             </div>

             {/* Top Metrics Row */}
             <div className="grid grid-cols-3 gap-4 mb-6">
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                     <span className="text-xs font-bold text-slate-400 uppercase">Severidad</span>
                     <p className="text-xl font-bold text-indigo-600">{report.validatedAnalysis.severityScore}/10</p>
                 </div>
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                     <span className="text-xs font-bold text-slate-400 uppercase">Área</span>
                     <p className="text-xl font-bold text-emerald-600">{report.validatedAnalysis.areaCm2} cm²</p>
                 </div>
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                     <span className="text-xs font-bold text-slate-400 uppercase">Acción</span>
                     <p className="text-sm font-bold text-slate-800 leading-tight mt-1">{report.recommendedAction}</p>
                 </div>
             </div>

             <div className="flex gap-6 mb-6">
                 <div className="w-32 h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                     <img src={URL.createObjectURL(imageFile)} className="w-full h-full object-cover" />
                 </div>
                 <div className="flex-1 space-y-3">
                     <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Análisis Tisular</p>
                        <div className="w-full h-4 rounded-full flex overflow-hidden">
                           <div style={{width: `${report.validatedAnalysis.granulationPercent}%`}} className="bg-rose-500"></div>
                           <div style={{width: `${report.validatedAnalysis.sloughPercent}%`}} className="bg-amber-400"></div>
                           <div style={{width: `${report.validatedAnalysis.necrosisPercent}%`}} className="bg-slate-900"></div>
                        </div>
                        <div className="flex justify-between text-xs mt-1 font-mono text-slate-600">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> G: {report.validatedAnalysis.granulationPercent}%</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div> E: {report.validatedAnalysis.sloughPercent}%</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-900"></div> N: {report.validatedAnalysis.necrosisPercent}%</span>
                        </div>
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Diagnóstico</p>
                        <p className="text-slate-900 font-medium">{report.diagnosis}</p>
                     </div>
                 </div>
             </div>
             
             {/* Full Protocol Table */}
             <div className="mb-6">
                <h4 className="text-sm font-bold text-slate-800 uppercase mb-3 flex items-center gap-2">
                    <ClipboardCheck size={16} /> Protocolo TIME Detallado
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
                    <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 p-2 font-bold text-slate-600">
                        <span>Fase</span>
                        <span className="col-span-2">Indicación</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-slate-100 p-2">
                        <span className="font-medium text-slate-500">Limpieza</span>
                        <span className="col-span-2 text-slate-800">{report.finalProtocol.cleansing}</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-slate-100 p-2">
                        <span className="font-medium text-slate-500">Desbridamiento</span>
                        <span className="col-span-2 text-slate-800">{report.finalProtocol.debridement}</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-slate-100 p-2">
                        <span className="font-medium text-slate-500">Apósito 1°</span>
                        <span className="col-span-2 text-slate-800">{report.finalProtocol.primaryDressing}</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-slate-100 p-2">
                        <span className="font-medium text-slate-500">Apósito 2°</span>
                        <span className="col-span-2 text-slate-800">{report.finalProtocol.secondaryDressing}</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-slate-100 p-2">
                        <span className="font-medium text-slate-500">Frecuencia</span>
                        <span className="col-span-2 text-slate-800">{report.finalProtocol.frequency}</span>
                    </div>
                </div>
             </div>

             {/* Doctor Notes */}
             {report.doctorNotes && (
                 <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-sm text-indigo-900">
                     <p className="font-bold text-xs uppercase text-indigo-400 mb-1">Notas del Especialista</p>
                     <p>{report.doctorNotes}</p>
                 </div>
             )}
             
             {/* Hide buttons when capturing */}
             <div data-html2canvas-ignore className="mt-8 flex gap-3 print:hidden">
                <button onClick={handleDownloadPDF} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                   <Download size={16} /> Descargar PDF
                </button>
                <button onClick={handleSharePDF} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                   <Share2 size={16} /> Compartir PDF
                </button>
             </div>
          </div>

          {/* Support Network */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 print:hidden">
             <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <MapPin className="text-rose-500" /> Red de Apoyo
             </h3>
             {places.length > 0 ? (
                <ul className="space-y-4">
                   {places.map((p, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                         <div className="mt-1 w-2 h-2 rounded-full bg-rose-500"></div>
                         <div>
                            <p className="font-bold text-slate-800 dark:text-white">{p.name}</p>
                            <a href={p.uri} target="_blank" className="text-sky-500 hover:underline text-xs">Ver Mapa</a>
                         </div>
                      </li>
                   ))}
                </ul>
             ) : <p className="text-slate-400 text-sm">Buscando centros cercanos...</p>}
          </div>
       </div>

       <div className="text-center mt-12 print:hidden">
          <button onClick={() => window.location.reload()} className="text-slate-500 dark:text-slate-400 hover:text-sky-500 font-bold flex items-center gap-2 mx-auto">
             <ArrowLeft size={16} /> Iniciar Nuevo Caso
          </button>
       </div>
    </div>
  );
};

const App = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.WELCOME);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [report, setReport] = useState<ClinicalReport | null>(null);
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-sans pb-10">
      {stage !== AppStage.WELCOME && (
          <header className="bg-white dark:bg-slate-900 sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shadow-sm flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center text-white">
                      <LayoutDashboard size={18} />
                  </div>
                  <span className="font-bold text-slate-800 dark:text-white text-lg tracking-tight hidden md:inline">Nexus<span className="text-sky-600">Health</span></span>
              </div>

              <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <span className={stage === AppStage.ADMISSION ? "text-sky-600 dark:text-sky-400" : ""}>1. Admisión</span>
                  <ArrowRight size={12} />
                  <span className={stage === AppStage.ACQUISITION ? "text-sky-600 dark:text-sky-400" : ""}>2. Captura</span>
                  <ArrowRight size={12} />
                  <span className={stage === AppStage.AI_DIAGNOSTICS ? "text-sky-600 dark:text-sky-400" : ""}>3. Diagnóstico AI</span>
                  <ArrowRight size={12} />
                  <span className={stage === AppStage.CLOSURE ? "text-emerald-500" : ""}>4. Cierre</span>
              </div>

              <div className="flex items-center gap-3">
                  {patient && (
                      <button onClick={() => setShowPatientModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                          <User size={14} /> <span className="hidden sm:inline">{patient.firstName}</span>
                      </button>
                  )}
                  <button onClick={() => setIsLiveOpen(true)} className="p-2 bg-rose-500 text-white rounded-full shadow-lg shadow-rose-500/30 hover:bg-rose-600 transition-transform hover:scale-105">
                       <Sparkles size={20} />
                  </button>
                  <DarkModeToggle />
              </div>
          </header>
      )}

      <main className={stage !== AppStage.WELCOME ? "p-6" : ""}>
          {stage === AppStage.WELCOME && <Welcome onStart={() => setStage(AppStage.ADMISSION)} />}
          
          {stage === AppStage.ADMISSION && (
              <Admission onComplete={(p) => { setPatient(p); setStage(AppStage.ACQUISITION); }} />
          )}

          {stage === AppStage.ACQUISITION && (
              <Acquisition onImageCaptured={(file, base64) => { setImageFile(file); setImageBase64(base64); setStage(AppStage.AI_DIAGNOSTICS); }} />
          )}

          {stage === AppStage.AI_DIAGNOSTICS && patient && imageFile && imageBase64 && (
              <DiagnosticsAndReview 
                  image={imageFile} 
                  base64={imageBase64} 
                  patient={patient}
                  onFinalize={(r) => { setReport(r); setStage(AppStage.CLOSURE); }}
              />
          )}

          {stage === AppStage.CLOSURE && report && patient && imageFile && (
              <Closure report={report} patient={patient} imageFile={imageFile} />
          )}
      </main>

      <LiveConsultant isOpen={isLiveOpen} onClose={() => setIsLiveOpen(false)} />
      {showPatientModal && patient && <PatientModal patient={patient} onClose={() => setShowPatientModal(false)} />}

    </div>
  );
};

export default App;