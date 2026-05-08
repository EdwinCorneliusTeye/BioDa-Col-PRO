import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Camera, ChevronRight, ChevronLeft, Save, Plus, X, Trash2, Loader2, Leaf, Bird, Map, Type, Hash, Calendar as CalendarIcon, List as ListIcon, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ObservationType, CustomVariable } from '../../types';
import { analyzeFieldImage, AISuggestion } from '../../services/geminiService';
import { generateObservationPDF } from '../../services/pdfService';
import { saveObservation } from '../../lib/services';
import { auth } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { Download, CheckCircle2 } from 'lucide-react';

interface ObservationEntryProps {
  onComplete: () => void;
}

const PRESET_VARIABLES = {
  plant: [
    { name: 'Height (m)', type: 'number' },
    { name: 'Stem Diameter (cm)', type: 'number' },
    { name: 'Leaf Density', type: 'text' },
    { name: 'Flowering Stage', type: 'select', options: ['None', 'Budding', 'Early', 'Peak', 'Late', 'Seed'] }
  ],
  animal: [
    { name: 'Count', type: 'number' },
    { name: 'Approximate Age', type: 'text' },
    { name: 'Behavior', type: 'text' },
    { name: 'Health Status', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Dead'] }
  ],
  study_area: [
    { name: 'Area Size (sqm)', type: 'number' },
    { name: 'Temperature (C)', type: 'number' },
    { name: 'Humidity (%)', type: 'number' },
    { name: 'Soil pH', type: 'number' }
  ],
};

export function ObservationEntry({ onComplete }: ObservationEntryProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<ObservationType | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<AISuggestion | null>(null);
  const [manualSpecies, setManualSpecies] = useState('');
  const [manualGenus, setManualGenus] = useState('');
  const [manualFamily, setManualFamily] = useState('');
  const [lastSavedObservation, setLastSavedObservation] = useState<any>(null);
  const [showDone, setShowDone] = useState(false);
  const [variables, setVariables] = useState<{ [key: string]: string | number }>({});
  const [customVars, setCustomVars] = useState<CustomVariable[]>([]);
  const [notes, setNotes] = useState('');
  const [researcherName, setResearcherName] = useState(auth?.currentUser?.uid || '');
  const [timestamp, setTimestamp] = useState(new Date().toISOString().slice(0, 16));
  const [altitude, setAltitude] = useState('');
  const [weather, setWeather] = useState('');
  const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  
  const [showVarTypePicker, setShowVarTypePicker] = useState(false);
  const [newVarForm, setNewVarForm] = useState<{ name: string, type: CustomVariable['type'], options?: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load category-specific templates from localStorage
    if (type) {
      const templates = JSON.parse(localStorage.getItem(`protocol_template_${type}`) || '[]');
      if (templates.length > 0) {
        setCustomVars(templates.map((t: any) => ({ ...t, value: '', id: crypto.randomUUID() })));
      }
    }
  }, [type]);

  const handleTypeSelect = (t: ObservationType) => {
    setType(t);
    setStep(2);
  };

  const resizeImage = (base64: string, maxWidth: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = base64;
    });
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        try {
          // Resize to max 1200px for stability and faster processing
          const resized = await resizeImage(result, 1200);
          setImage(resized);
          runIdentification(resized);
          // Wait a second before locating to avoid concurrent resource contention
          setTimeout(handleAutoLocate, 1000);
        } catch (err) {
          console.error('Image resize failed:', err);
          setImage(result);
          runIdentification(result);
          setTimeout(handleAutoLocate, 1000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const runIdentification = async (base64: string) => {
    if (!type || type === 'study_area') return;
    setIsIdentifying(true);
    try {
      const result = await analyzeFieldImage(base64.split(',')[1], type);
      setSuggestions(result || []);
      if (result.length > 0 && result[0].confidence > 0.9) {
        setSelectedSuggestion(result[0]);
      }
    } catch (e) {
      console.error('Identification failed:', e);
    } finally {
      setIsIdentifying(false);
    }
  };

  const openNewVarForm = (varType: CustomVariable['type']) => {
    setNewVarForm({ name: '', type: varType });
    setShowVarTypePicker(false);
  };

  const confirmNewVar = () => {
    if (newVarForm && newVarForm.name.trim()) {
      const options = newVarForm.options ? newVarForm.options.split(',').map(s => s.trim()) : undefined;
      const newVar = { id: crypto.randomUUID(), name: newVarForm.name.trim(), type: newVarForm.type, value: '', options };
      setCustomVars([...customVars, newVar]);
      
      // Save to templates for this category
      if (type) {
        const templates = JSON.parse(localStorage.getItem(`protocol_template_${type}`) || '[]');
        localStorage.setItem(`protocol_template_${type}`, JSON.stringify([...templates, { name: newVar.name, type: newVar.type, options: newVar.options }]));
      }
      
      setNewVarForm(null);
    }
  };

  const removeCustomVar = (id: string) => {
    const varToRemove = customVars.find(v => v.id === id);
    setCustomVars(customVars.filter(v => v.id !== id));
    
    // Remove from templates too if we want to "un-extend" the protocol
    if (type && varToRemove) {
      const templates = JSON.parse(localStorage.getItem(`protocol_template_${type}`) || '[]');
      const updatedTemplates = templates.filter((t: any) => t.name !== varToRemove.name);
      localStorage.setItem(`protocol_template_${type}`, JSON.stringify(updatedTemplates));
    }
  };

  const handleAutoLocate = () => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
        setLocating(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setLocating(false);
      },
      { timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!type) return;
    
    // Manual ID priority: if manual entries exist, they override suggestions
    let finalSpecies = selectedSuggestion;
    if (manualSpecies) {
      finalSpecies = {
        species: manualSpecies,
        family: manualFamily || 'Unknown',
        genus: manualGenus || '',
        confidence: 1.0,
        description: 'Manual entry by researcher'
      };
    }

    // Basic validation
    if (!finalSpecies && !image && !notes && type !== 'study_area') {
      alert("Please provide at least an image, a species identification, or field notes.");
      return;
    }

    setSaving(true);
    try {
      const data = {
        type,
        imageUrl: image || '',
        selectedSpecies: finalSpecies || undefined,
        speciesSuggestions: suggestions,
        researcherName,
        timestamp: new Date(timestamp),
        variables: {
          ...variables,
          'Weather': weather,
          'Altitude (m)': altitude
        } as Record<string, string>,
        customVariables: customVars,
        notes,
        location: location || undefined
      };
      
      const savedObs = await saveObservation(data);
      setLastSavedObservation(savedObs);
      setShowDone(true);
      
      // Reset form state (but keep lastSaved for the "Done" screen)
      setImage(null);
      setVariables({});
      setCustomVars([]);
      setNotes('');
      setSelectedSuggestion(null);
      setSuggestions([]);
      setManualSpecies('');
      setManualGenus('');
      setManualFamily('');
      
      // Clear persistence of custom protocol for "new study" fresh start
      if (type) {
        localStorage.removeItem(`protocol_template_${type}`);
      }
    } catch (e) {
      console.error('Save failed:', e);
      alert("Failed to save observation. It has been cached locally and will sync when possible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Indicator */}
      <div className="flex items-center gap-4 mb-16 px-4">
        <div className={cn("flex-1 h-3 rounded-full neo-pressed overflow-hidden relative", step >= 1 && "after:absolute after:inset-0 after:bg-emerald-500 after:shadow-[0_0_15px_rgba(16,185,129,0.5)]")} />
        <div className={cn("flex-1 h-3 rounded-full neo-pressed overflow-hidden relative", step >= 2 && "after:absolute after:inset-0 after:bg-emerald-500 after:shadow-[0_0_15px_rgba(16,185,129,0.5)]")} />
        <div className={cn("flex-1 h-3 rounded-full neo-pressed overflow-hidden relative", step >= 3 && "after:absolute after:inset-0 after:bg-emerald-500 after:shadow-[0_0_15px_rgba(16,185,129,0.5)]")} />
      </div>

      <AnimatePresence mode="wait">
        {showDone ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center space-y-10 py-12"
          >
            <div className="w-32 h-32 neo-pressed rounded-[2.5rem] flex items-center justify-center text-emerald-500 shadow-2xl">
              <CheckCircle2 size={64} />
            </div>
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-black text-[var(--text-main)] tracking-tight">Capture Committed</h2>
              <p className="text-[var(--text-muted)] font-black uppercase text-[11px] tracking-[0.3em]">Dataset successfully synchronized</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full px-4">
              <button 
                type="button"
                onClick={() => {
                  if (lastSavedObservation) generateObservationPDF(lastSavedObservation);
                }}
                className="flex-1 flex items-center justify-center gap-3 py-4 neo-flat rounded-2xl text-emerald-500 font-bold hover:neo-pressed transition-all active:scale-95"
              >
                <Download size={20} />
                Download PDF Report
              </button>
              <button 
                type="button"
                onClick={() => {
                  setShowDone(false);
                  setStep(1);
                  setType(null);
                  onComplete();
                }}
                className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/20 hover:bg-emerald-500 transition-all active:scale-95"
              >
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        ) : step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-12"
          >
            <div className="text-center">
              <h2 className="text-4xl font-black mb-3 text-[var(--text-main)] tracking-tight">Specimen Category</h2>
              <p className="text-[var(--text-muted)] font-black tracking-widest uppercase text-[11px]">Select tactical research target</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
              <CategoryCard 
                icon={<Leaf size={28} />} 
                label="Flora" 
                sub="Botanical Targets"
                onClick={() => handleTypeSelect('plant')} 
              />
              <CategoryCard 
                icon={<Bird size={28} />} 
                label="Fauna" 
                sub="Zoological Targets"
                onClick={() => handleTypeSelect('animal')} 
              />
               <CategoryCard 
                icon={<Map size={28} />} 
                label="Site" 
                sub="Environmental Sites"
                onClick={() => handleTypeSelect('study_area')} 
              />
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black mb-2 text-[var(--text-main)]">Visual Capture</h2>
                <p className="text-[var(--text-muted)] font-bold">Provide a high-resolution reference image</p>
              </div>
              <button 
                type="button"
                onClick={() => setStep(1)} 
                className="p-3 neo-flat rounded-2xl text-[var(--text-muted)] hover:text-emerald-500 transition-all"
              >
                <ChevronLeft size={24} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              <button 
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                  }
                }}
                className="flex-1 aspect-[4/3] sm:aspect-square neo-flat rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:neo-pressed transition-all duration-500 overflow-hidden group relative shadow-2xl"
              >
                {image ? (
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <div className="w-20 h-20 neo-pressed rounded-3xl flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform duration-500">
                      <Camera size={32} />
                    </div>
                    <p className="font-black text-base text-[var(--text-main)] tracking-tight uppercase">Capture Specimen</p>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-black mt-3 tracking-[0.2em] text-center px-4">Open Field Camera</p>
                  </>
                )}
              </button>

              {!image && (
                <button 
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture');
                      fileInputRef.current.click();
                    }
                  }}
                  className="flex-1 aspect-[4/3] sm:aspect-square neo-flat rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:neo-pressed transition-all duration-500 group"
                >
                  <div className="w-16 h-16 neo-pressed rounded-3xl flex items-center justify-center text-[var(--text-muted)] mb-4 group-hover:text-emerald-500 transition-colors">
                    <Plus size={28} />
                  </div>
                  <p className="font-black text-xs text-[var(--text-muted)] uppercase tracking-widest">Gallery Access</p>
                </button>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />

            {image && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-white uppercase text-xs tracking-widest flex items-center gap-2">
                    Vision AI Analysis
                    {isIdentifying && <Loader2 size={12} className="animate-spin text-emerald-400" />}
                  </h3>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded">Real-time sync</p>
                </div>
                
                {isIdentifying ? (
                  <div className="py-8 text-center text-slate-500 text-sm font-mono animate-pulse">Consulting Research Databases & Satellite Data...</div>
                ) : suggestions.length > 0 ? (
                  <div className="grid gap-2">
                    {suggestions.map((s, i) => (
                      <button 
                        type="button"
                        key={i} 
                        onClick={() => setSelectedSuggestion(s)}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                          selectedSuggestion === s 
                            ? "bg-emerald-600 text-white border-transparent shadow-lg shadow-emerald-500/20" 
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                        )}
                      >
                        <div>
                          <p className={cn("text-[8px] font-black uppercase tracking-widest mb-1", selectedSuggestion === s ? "text-white/60" : "text-slate-500")}>
                            {s.family} {s.genus ? `• ${s.genus}` : ''}
                          </p>
                          <p className="font-bold text-sm tracking-tight">{s.species}</p>
                          {s.description && (
                            <p className={cn("text-[10px] mt-2 line-clamp-2", selectedSuggestion === s ? "text-white/70" : "text-[var(--text-muted)]")}>
                              {s.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-mono">MATCH: {(s.confidence * 100).toFixed(1)}%</p>
                          <div className={cn("w-12 h-1 rounded-full mt-1 overflow-hidden", selectedSuggestion === s ? "bg-white/20" : "bg-slate-950")}>
                             <div className={cn("h-full", selectedSuggestion === s ? "bg-white" : "bg-emerald-500")} style={{ width: `${s.confidence * 100}%` }} />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 text-xs italic bg-slate-900/50 p-4 rounded-xl border border-slate-800">Visual match parameters not found. Manual identification required.</div>
                )}
              </div>
            )}

            <button 
              type="button"
              onClick={() => setStep(3)}
              className="w-full bg-slate-800 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-700 hover:bg-emerald-600 hover:border-transparent transition-all"
            >
              Enter Parameters
              <ChevronRight size={18} />
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8 pb-12"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black mb-2 text-[var(--text-main)]">Specimen Metrics</h2>
                <p className="text-[var(--text-muted)] font-bold">Commit measured variables to dataset</p>
              </div>
              <button 
                type="button"
                onClick={() => setStep(2)} 
                className="p-3 neo-flat rounded-2xl text-[var(--text-muted)] hover:text-emerald-500 transition-all"
              >
                <ChevronLeft size={24} />
              </button>
            </div>

            <section className="space-y-8 neo-flat-deep p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem]">
              <div className="flex items-center justify-between border-b border-[var(--neo-shadow-dark)]/10 pb-6 mb-8 md:mb-10">
                <h3 className="text-[10px] md:text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Researcher Metadata</h3>
                {step === 3 && (
                   <button 
                    type="button"
                    onClick={handleAutoLocate}
                    disabled={locating}
                    className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:neo-pressed px-3 py-1.5 rounded-lg transition-all"
                  >
                    {locating ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                    {locating ? 'Locating...' : 'Auto-Locate'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Manual Identification</label>
                  <input 
                    type="text" 
                    value={manualSpecies}
                    onChange={(e) => {
                      setManualSpecies(e.target.value);
                      setSelectedSuggestion(null);
                    }}
                    placeholder="Species Name..."
                    className="w-full neo-pressed p-4 rounded-2xl text-sm text-[var(--text-main)] focus:text-emerald-500 transition-all duration-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Genus Classification</label>
                  <input 
                    type="text" 
                    value={manualGenus}
                    onChange={(e) => setManualGenus(e.target.value)}
                    placeholder="Enter Genus..."
                    className="w-full neo-pressed p-4 rounded-2xl text-sm text-[var(--text-main)] focus:text-emerald-500 transition-all duration-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Family Classification</label>
                  <input 
                    type="text" 
                    value={manualFamily}
                    onChange={(e) => setManualFamily(e.target.value)}
                    placeholder="Enter Family..."
                    className="w-full neo-pressed p-4 rounded-2xl text-sm text-[var(--text-main)] focus:text-emerald-500 transition-all duration-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Researcher ID</label>
                  <input 
                    type="text" 
                    value={researcherName}
                    onChange={(e) => setResearcherName(e.target.value)}
                    placeholder="Enter ID..."
                    className="w-full neo-pressed p-4 rounded-2xl text-sm text-[var(--text-main)] focus:text-emerald-500 transition-all duration-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Observation Time</label>
                  <input 
                    type="datetime-local" 
                    value={timestamp}
                    onChange={(e) => setTimestamp(e.target.value)}
                    className="w-full neo-pressed p-4 rounded-2xl text-sm text-[var(--text-main)] focus:text-emerald-500 transition-all duration-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)] ml-1">Latitude</label>
                  <input 
                    type="number" 
                    step="any"
                    value={location?.latitude || ''}
                    onChange={(e) => setLocation(loc => ({ latitude: parseFloat(e.target.value), longitude: loc?.longitude || 0 }))}
                    className="w-full neo-pressed p-4 rounded-2xl text-sm text-[var(--text-main)] focus:text-emerald-500 transition-all duration-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)] ml-1">Longitude</label>
                  <input 
                    type="number" 
                    step="any"
                    value={location?.longitude || ''}
                    onChange={(e) => setLocation(loc => ({ latitude: loc?.latitude || 0, longitude: parseFloat(e.target.value) }))}
                    className="w-full neo-pressed p-4 rounded-2xl text-sm text-[var(--text-main)] focus:text-emerald-500 transition-all duration-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)] ml-1">Altitude (m)</label>
                  <input 
                    type="number" 
                    value={altitude}
                    onChange={(e) => setAltitude(e.target.value)}
                    placeholder="Enter elevation..."
                    className="w-full neo-pressed p-4 rounded-2xl text-sm text-[var(--text-main)] focus:text-emerald-500 transition-all duration-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)] ml-1">Atmospheric Condition</label>
                  <select 
                    value={weather}
                    onChange={(e) => setWeather(e.target.value)}
                    className="w-full neo-pressed p-4 rounded-2xl text-sm text-[var(--text-main)] focus:text-emerald-500 transition-all duration-300 focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Select atmosphere...</option>
                    <option value="Sunny">Sunny / Clear</option>
                    <option value="Partly Cloudy">Partly Cloudy</option>
                    <option value="Overcast">Overcast</option>
                    <option value="Rainy">Rainy</option>
                    <option value="Stormy">Stormy</option>
                    <option value="Foggy">Foggy</option>
                  </select>
                </div>
              </div>
            </section>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {type && PRESET_VARIABLES[type].map(field => (
                  <div key={field.name} className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{field.name}</label>
                    {field.type === 'select' ? (
                      <select 
                        className="w-full neo-pressed p-3 rounded-lg text-sm text-[var(--text-main)] focus:text-emerald-500 transition-all focus:outline-none appearance-none cursor-pointer"
                        onChange={(e) => setVariables({ ...variables, [field.name]: e.target.value })}
                      >
                        <option value="">Select option...</option>
                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input 
                        type={field.type} 
                        placeholder={`Enter ${field.name.toLowerCase()}...`}
                        className="w-full neo-pressed p-3 rounded-lg text-sm text-[var(--text-main)] focus:text-emerald-500 transition-all focus:outline-none"
                        onChange={(e) => setVariables({ ...variables, [field.name]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-t border-[var(--neo-shadow-dark)]/10 pt-6">
                  <h3 className="font-bold text-[var(--text-main)] text-xs uppercase tracking-widest">Study-Specific Variables</h3>
                  <div className="relative">
                    <button 
                      type="button"
                      onClick={() => setShowVarTypePicker(!showVarTypePicker)}
                      className="text-[10px] font-black text-emerald-500 flex items-center gap-1 uppercase tracking-widest hover:text-emerald-400 group"
                    >
                      <Plus size={12} className={cn("transition-transform", showVarTypePicker ? "rotate-45" : "group-hover:rotate-90")} />
                      Extend Protocol
                    </button>
                    
                    {showVarTypePicker && (
                      <div className="absolute right-0 top-full mt-2 w-48 neo-flat rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                        <VarTypeBtn icon={<Type size={14}/>} label="Text Field" onClick={() => openNewVarForm('text')} />
                        <VarTypeBtn icon={<Hash size={14}/>} label="Numeric Input" onClick={() => openNewVarForm('number')} />
                        <VarTypeBtn icon={<CalendarIcon size={14}/>} label="Date Picker" onClick={() => openNewVarForm('date')} />
                        <VarTypeBtn icon={<ListIcon size={14}/>} label="Dropdown" onClick={() => openNewVarForm('select')} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {newVarForm && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl space-y-3 mb-4 neo-pressed"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">New {newVarForm.type} Parameter</p>
                        <button 
                          type="button"
                          onClick={() => setNewVarForm(null)} 
                          className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <input 
                        autoFocus
                        value={newVarForm.name}
                        onChange={(e) => setNewVarForm({ ...newVarForm, name: e.target.value })}
                        placeholder="Variable name (e.g. Canopy Cover)..."
                        className="w-full neo-pressed p-2 rounded-lg text-sm text-[var(--text-main)] focus:text-emerald-500 focus:outline-none"
                      />
                      {newVarForm.type === 'select' && (
                        <input 
                          value={newVarForm.options || ''}
                          onChange={(e) => setNewVarForm({ ...newVarForm, options: e.target.value })}
                          placeholder="Options (comma separated)..."
                          className="w-full neo-pressed p-2 rounded-lg text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] focus:text-emerald-500 focus:outline-none"
                        />
                      )}
                      <button 
                        type="button"
                        onClick={confirmNewVar}
                        className="w-full bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all active:scale-95"
                      >
                        Add to Protocol
                      </button>
                    </motion.div>
                  )}

                  {customVars.map(v => (
                    <div key={v.id} className="flex items-center gap-3 neo-pressed p-2.5 rounded-xl group/var">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-tighter">{v.name}</p>
                          <span className="text-[7px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-1 rounded">{v.type}</span>
                        </div>
                        {v.type === 'select' ? (
                          <select 
                            className="w-full text-sm font-bold bg-transparent focus:outline-none text-[var(--text-main)] appearance-none cursor-pointer"
                            onChange={(e) => {
                              setCustomVars(customVars.map(cv => cv.id === v.id ? { ...cv, value: e.target.value } : cv));
                            }}
                          >
                            <option value="">Select parameter...</option>
                            {v.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input 
                            type={v.type} 
                            placeholder="Commit parameters..."
                            className="w-full text-sm font-bold bg-transparent focus:outline-none text-[var(--text-main)]"
                            onChange={(e) => {
                              setCustomVars(customVars.map(cv => cv.id === v.id ? { ...cv, value: e.target.value } : cv));
                            }}
                          />
                        )}
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeCustomVar(v.id)} 
                        className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:neo-pressed rounded-lg transition-all opacity-0 group-hover/var:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {customVars.length === 0 && (
                    <div className="border border-dashed border-[var(--neo-shadow-dark)]/30 rounded-xl p-6 text-center">
                        <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest">No custom variables defined</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Field Notes & Observations</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record qualitative observations, environmental anomalies, or secondary identifiers..."
                  className="w-full h-32 neo-pressed p-4 rounded-xl text-sm text-[var(--text-main)] focus:text-emerald-500 transition-all focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <button 
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 hover:bg-emerald-500 transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {navigator.onLine && auth?.currentUser ? "Commit Entry to Dataset" : "Save Entry to Local Cache"}
              </button>
              
              {(!navigator.onLine || !auth?.currentUser) && (
                <p className="text-center text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.3em] leading-loose opacity-70">
                  Station is <span className="text-amber-500">Offline</span>. <br/>
                  Data will be queued for Cloud Sync.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryCard({ icon, label, sub, onClick }: { icon: any, label: string, sub: string, onClick: () => void }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className="p-8 neo-flat rounded-[3rem] flex flex-col items-center text-center group hover:neo-pressed transition-all duration-500 active:scale-95"
    >
      <div className="w-20 h-20 neo-pressed rounded-3xl flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform duration-500">
        {icon}
      </div>
      <h3 className="text-xl font-black text-[var(--text-main)] mb-2 tracking-tight">{label}</h3>
      <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest leading-relaxed opacity-60">{sub}</p>
    </button>
  );
}

function VarTypeBtn({ icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2 hover:neo-pressed text-[var(--text-muted)] hover:text-emerald-500 transition-all text-xs font-black uppercase tracking-tight text-left"
    >
      <span className="text-emerald-500">{icon}</span>
      {label}
    </button>
  );
}
