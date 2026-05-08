import { Plus, Download, Database, MapPin, Camera, Leaf, ChevronRight, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase';
import { Observation } from '../../types';
import Papa from 'papaparse';
import { cn, formatDate, formatTime } from '../../lib/utils';
import { fetchObservations } from '../../lib/services';
import { generateObservationPDF, generateSummaryPDF } from '../../services/pdfService';

interface DashboardProps {
  setActiveTab: (tab: any) => void;
}

export function Dashboard({ setActiveTab }: DashboardProps) {
  const [stats, setStats] = useState({ total: 0, plants: 0, animals: 0, areas: 0 });
  const [recent, setRecent] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'id', 'type', 'researcher', 'timestamp', 'species', 'location'
  ]);

  const exportOptions = [
    { id: 'id', label: 'Unique ID' },
    { id: 'type', label: 'Observation Type' },
    { id: 'researcher', label: 'Researcher Name' },
    { id: 'timestamp', label: 'Date & Time' },
    { id: 'species', label: 'Taxonomic Info (Species/Genus/Family)' },
    { id: 'location', label: 'GPS Coordinates' },
    { id: 'notes', label: 'Field Notes' },
    { id: 'variables', label: 'Measurements & Variables' },
  ];

  const toggleField = (id: string) => {
    setSelectedFields(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await fetchObservations();
        const userObservations = auth?.currentUser 
          ? data.filter(obs => obs.userId === auth.currentUser?.uid || obs.userId === 'anonymous')
          : data.filter(obs => obs.userId === 'anonymous');
        
        setStats({
          total: userObservations.length,
          plants: userObservations.filter(o => o.type === 'plant').length,
          animals: userObservations.filter(o => o.type === 'animal').length,
          areas: userObservations.filter(o => o.type === 'study_area').length,
        });
        
        setRecent(userObservations.slice(0, 5));
      } catch (e) {
        console.error('Error fetching dashboard stats:', e);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  const handleExport = async () => {
     try {
        const data = await fetchObservations();
        
        // Build a set of ALL possible variable keys across the entire dataset
        const allDynamicKeys = new Set<string>();
        data.forEach(obs => {
            if (obs.variables) Object.keys(obs.variables).forEach(k => allDynamicKeys.add(k));
            if (obs.customVariables) obs.customVariables.forEach(v => allDynamicKeys.add(v.name));
        });

        const csvData = data.map(obs => {
            const row: any = {};
            if (selectedFields.includes('id')) row.unique_id = obs.id;
            if (selectedFields.includes('type')) row.observation_type = obs.type;
            if (selectedFields.includes('researcher')) row.researcher_name = obs.researcherName || 'Anonymous';
            if (selectedFields.includes('timestamp')) {
              row.date = formatDate(obs.timestamp);
              row.time = formatTime(obs.timestamp);
            }
            
            if (selectedFields.includes('species')) {
              row.species_name = obs.selectedSpecies?.species || 'Unidentified';
              row.genus = obs.selectedSpecies?.genus || 'N/A';
              row.family = obs.selectedSpecies?.family || 'N/A';
            }

            if (selectedFields.includes('location')) {
              row.gps_latitude = obs.location?.latitude || '';
              row.gps_longitude = obs.location?.longitude || '';
            }

            if (selectedFields.includes('notes')) row.field_notes = obs.notes || '';

            if (selectedFields.includes('variables')) {
              // Collated dynamic variables
              allDynamicKeys.forEach(key => {
                const standardVal = obs.variables?.[key];
                const customVal = obs.customVariables?.find(v => v.name === key)?.value;
                row[`var_${key.toLowerCase().replace(/\s+/g, '_')}`] = standardVal || customVal || '';
              });
            }

            return row;
        });

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `BioDaCol_Full_Export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportModalOpen(false);
    } catch (e) {
        console.error('Export failed:', e);
    }
  }

  const handleDownloadDossier = async () => {
    try {
      const data = await fetchObservations();
      generateSummaryPDF(data);
    } catch (e) {
      console.error('Dossier generation failed:', e);
    }
  };

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 neo-flat-deep p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem]">
        <div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-[var(--text-main)] mb-3">
            Field <span className="text-emerald-500">Analytics</span>
          </h2>
          <div className="flex items-center gap-4">
             <span className="text-[var(--deep-green)] text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-black opacity-70">Active Station:</span>
             <span className="neo-pressed px-4 py-2 rounded-full text-[9px] md:text-[10px] font-black text-emerald-500 tracking-wider">Central Ecosystem Hub</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 md:gap-4 relative group">
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 neo-flat rounded-2xl text-[var(--text-muted)] hover:text-emerald-500 hover:neo-pressed transition-all duration-300 text-xs md:text-sm font-semibold active:scale-95"
          >
            <Download size={16} />
            Data CSV
          </button>
          
          <button 
            onClick={handleDownloadDossier}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 neo-flat rounded-2xl text-emerald-500 hover:neo-pressed transition-all duration-300 text-xs md:text-sm font-semibold active:scale-95"
          >
            <FileText size={16} />
            Analysis PDF
          </button>

          <button 
            onClick={() => setActiveTab('new')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs md:text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all active:scale-95"
          >
            <Plus size={16} />
            Capture
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard label="Total Dataset" value={stats.total} icon={<Database size={18} />} active />
        <StatCard label="Flora Analysis" value={stats.plants} icon={<Leaf size={18} />} active />
        <StatCard label="Fauna Log" value={stats.animals} icon={<MapPin size={18} />} active />
        <StatCard label="Site Metrics" value={stats.areas} icon={<Camera size={18} />} active />
      </section>

      <section className="space-y-8 md:space-y-10">
        <div className="flex items-center justify-between px-2 md:px-4">
          <h3 className="font-black text-[var(--deep-green)] text-xs md:text-base tracking-[0.2em] uppercase opacity-60">Field Log Registry</h3>
          <button onClick={() => setActiveTab('history')} className="text-[10px] md:text-[11px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 neo-flat px-4 md:px-6 py-2 rounded-full hover:neo-pressed transition-all duration-300">Archives</button>
        </div>

        {loading ? (
             <div className="grid gap-6">
                {[1,2,3].map(i => <div key={i} className="h-20 neo-flat rounded-3xl animate-pulse opacity-40" />)}
             </div>
        ) : recent.length > 0 ? (
          <div className="grid gap-6">
            {recent.map((obs, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={obs.id} 
                className="neo-flat p-4 rounded-3xl flex items-center gap-6 hover:neo-pressed transition-all duration-500 group cursor-pointer"
                onClick={() => setActiveTab('history')}
              >
                <div className="w-16 h-16 rounded-2xl neo-pressed flex-shrink-0 overflow-hidden relative p-1">
                  <div className="w-full h-full rounded-xl overflow-hidden">
                    {obs.imageUrl ? (
                      <img src={obs.imageUrl} alt={obs.selectedSpecies?.species} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] bg-emerald-500/5">
                        <Camera size={20} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 mb-2">
                    <span className={cn(
                        "text-[10px] font-black uppercase px-3 py-1 rounded-full",
                        obs.type === 'plant' ? "bg-emerald-500/10 text-emerald-500" : obs.type === 'animal' ? "bg-blue-500/10 text-blue-500" : "bg-slate-800 text-[var(--deep-green)]"
                    )}>
                        {obs.type}
                    </span>
                    <span className="text-[var(--deep-green)] text-[11px] font-black font-mono tracking-tighter opacity-70">
                      {formatTime(obs.timestamp)}
                    </span>
                  </div>
                  <h4 className="text-xl font-black text-[var(--deep-green)] truncate pr-6">
                    {obs.selectedSpecies?.species || (obs.type === 'study_area' ? 'Regional Site' : 'Unidentified specimen')}
                  </h4>
                  {obs.notes && (
                    <p className="text-sm text-[var(--deep-green)] italic truncate max-w-lg mt-1 opacity-60">"{obs.notes}"</p>
                  )}
                </div>

                 <div className="hidden sm:flex items-center gap-4 px-4">
                   <div className="text-right">
                        <p className="text-[9px] font-black text-[var(--deep-green)] uppercase tracking-widest leading-none mb-1 opacity-60">Status</p>
                        <p className="text-[10px] text-emerald-500 font-bold tracking-tight">VERIFIED</p>
                   </div>
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       generateObservationPDF(obs);
                     }}
                     className="w-10 h-10 rounded-xl neo-flat flex items-center justify-center text-emerald-500 hover:neo-pressed transition-all duration-300"
                     title="Download PDF Report"
                   >
                     <Download size={16} />
                   </button>
                   <div className="w-10 h-10 rounded-2xl neo-flat flex items-center justify-center text-[var(--deep-green)] group-hover:text-emerald-500 group-hover:neo-pressed transition-all duration-300">
                        <ChevronRight size={18} />
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="neo-flat rounded-[3rem] p-16 text-center">
            <div className="w-20 h-20 neo-pressed rounded-3xl mx-auto flex items-center justify-center text-[var(--text-muted)] mb-8">
              <Plus size={40} />
            </div>
            <h4 className="font-bold text-[var(--text-main)] text-xl mb-3">Environmental Void</h4>
            <p className="text-[var(--text-muted)] text-sm max-w-sm mx-auto mb-10 leading-relaxed font-medium">Your research station is ready for deployment. Begin your field collection now.</p>
            <button onClick={() => setActiveTab('new')} className="neo-flat hover:neo-pressed text-emerald-500 px-10 py-4 rounded-2xl font-bold transition-all active:scale-95">Inaugurate Dataset</button>
          </div>
        )}
      </section>

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="neo-flat-deep w-full max-w-lg p-8 rounded-[3rem] space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-[var(--text-main)]">Export Selection</h3>
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="p-2 neo-flat rounded-xl text-[var(--text-muted)] hover:text-red-500 transition-colors"
              >
                <Plus className="rotate-45" size={20} />
              </button>
            </div>

            <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed">
              Select the data parameters you wish to include in your biodiversity export. 
              The resulting CSV will be formatted for environmental analysis software.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {exportOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => toggleField(opt.id)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 text-left",
                    selectedFields.includes(opt.id) 
                      ? "neo-pressed text-emerald-500" 
                      : "neo-flat text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                    selectedFields.includes(opt.id) ? "bg-emerald-500 border-emerald-500" : "border-[var(--text-muted)]/30"
                  )}>
                    {selectedFields.includes(opt.id) && <Plus className="text-white rotate-45" size={14} />}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-tight">{opt.label}</span>
                </button>
              ))}
            </div>

            <div className="pt-4 flex gap-4">
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="flex-1 py-4 neo-flat rounded-[1.5rem] font-bold text-[var(--text-muted)] hover:neo-pressed transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleExport}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-[1.5rem] font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all active:scale-95"
              >
                Generate CSV
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, active = false }: { label: string, value: number, icon: any, active?: boolean }) {
  return (
    <div className={cn(
      "p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] transition-all duration-700",
      active ? "neo-convex scale-[1.02] md:scale-105 z-10" : "neo-flat hover:neo-pressed cursor-default"
    )}>
      <div className={cn("inline-flex p-4 md:p-5 rounded-2xl mb-4 md:mb-8 shadow-inner", active ? "bg-[var(--deep-green)]/10 text-[var(--deep-green)]" : "neo-pressed text-emerald-500")}>
        {icon}
      </div>
      <p className={cn("text-[10px] md:text-[11px] uppercase tracking-[0.3em] font-black mb-2 md:mb-3 opacity-60 text-[var(--deep-green)]")}>{label}</p>
      <p className="text-3xl md:text-5xl font-black font-mono tracking-tighter text-[var(--deep-green)]">{value}</p>
    </div>
  );
}
