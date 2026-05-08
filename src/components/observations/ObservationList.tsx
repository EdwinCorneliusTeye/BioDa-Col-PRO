import { useEffect, useState } from 'react';
import { fetchObservations as getObservations, deleteObservation as removeObservation } from '../../lib/services';
import { Observation } from '../../types';
import { auth } from '../../lib/firebase';
import { Trash2, Calendar, FileText, Search, Filter, Download, Database, Leaf, Bug, Map as MapIcon, Layers, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate, formatTime } from '../../lib/utils';
import { generateObservationPDF } from '../../services/pdfService';
import Papa from 'papaparse';

export function ObservationList() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'plant' | 'animal' | 'study_area'>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchObservations();
  }, []);

  async function fetchObservations() {
    setLoading(true);
    try {
      const data = await getObservations();
      setObservations(data);
    } catch (e) {
      console.error('Error fetching observations:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleExportCSV = () => {
    if (observations.length === 0) return;

    try {
      // Build a set of ALL possible variable keys across the entire dataset
      const allDynamicKeys = new Set<string>();
      observations.forEach(obs => {
          if (obs.variables) Object.keys(obs.variables).forEach(k => allDynamicKeys.add(k));
          if (obs.customVariables) obs.customVariables.forEach(v => allDynamicKeys.add(v.name));
      });

      const csvData = observations.map(obs => {
          const row: any = {
            unique_id: obs.id,
            observation_type: obs.type,
            researcher: obs.researcherName || 'Anonymous',
            date: formatDate(obs.timestamp),
            time: formatTime(obs.timestamp),
            species_name: obs.selectedSpecies?.species || 'Unidentified',
            genus: obs.selectedSpecies?.genus || 'N/A',
            family: obs.selectedSpecies?.family || 'N/A',
            gps_latitude: obs.location?.latitude || '',
            gps_longitude: obs.location?.longitude || '',
            field_notes: obs.notes || ''
          };

          // Collated dynamic variables
          allDynamicKeys.forEach(key => {
            const standardVal = obs.variables?.[key];
            const customVal = obs.customVariables?.find(v => v.name === key)?.value;
            row[`var_${key.toLowerCase().replace(/\s+/g, '_')}`] = standardVal || customVal || '';
          });

          return row;
      });

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BioDaCol_Full_Registry_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await removeObservation(id);
      setObservations(observations.filter(o => o.id !== id));
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const filtered = observations.filter(o => {
    const matchesFilter = filter === 'all' || o.type === filter;
    const s = search.toLowerCase();
    const matchesSearch = !search || 
      o.selectedSpecies?.species?.toLowerCase().includes(s) || 
      o.selectedSpecies?.family?.toLowerCase().includes(s) || 
      o.notes?.toLowerCase().includes(s) ||
      o.type.toLowerCase().includes(s);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 neo-flat-deep p-8 md:p-12 rounded-[3rem] md:rounded-[4rem]">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 neo-convex rounded-2xl flex items-center justify-center text-emerald-500">
              <Database size={24} />
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-[var(--text-main)]">Collection <span className="text-emerald-500">History</span></h2>
          </div>
          <p className="text-[var(--text-muted)] font-black uppercase text-[10px] md:text-[12px] tracking-[0.4em] mb-8 md:mb-0">Vault of Parametric Biodiversity Data</p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 relative group min-w-[280px]">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-emerald-500 transition-colors" size={18} />
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search taxonomy or notes..."
                className="neo-pressed rounded-[1.5rem] py-4 pl-14 pr-8 text-sm text-[var(--text-main)] focus:text-emerald-500 focus:outline-none w-full transition-all duration-300"
              />
            </div>
            <button 
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-[1.5rem] text-sm font-bold shadow-xl shadow-emerald-500/20 hover:bg-emerald-500 transition-all active:scale-95"
            >
              <FileSpreadsheet size={18} />
              Full CSV Export
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--neo-bg)] p-2 rounded-[2rem] neo-pressed">
            <FilterButton active={filter === 'all'} label="All Systems" icon={<Layers size={14} />} onClick={() => setFilter('all')} />
            <FilterButton active={filter === 'plant'} label="Flora" icon={<Leaf size={14} />} onClick={() => setFilter('plant')} color="emerald" />
            <FilterButton active={filter === 'animal'} label="Fauna" icon={<Bug size={14} />} onClick={() => setFilter('animal')} color="amber" />
            <FilterButton active={filter === 'study_area'} label="Regions" icon={<MapIcon size={14} />} onClick={() => setFilter('study_area')} color="blue" />
          </div>
        </div>
      </header>

      {loading ? (
         <div className="space-y-6">
            {[1,2,3,4].map(i => <div key={i} className="h-28 neo-flat opacity-30 animate-pulse rounded-[3rem]" />)}
         </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-8">
          <AnimatePresence>
            {filtered.map((obs) => {
              const isExpanded = expandedId === obs.id;
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={obs.id} 
                  className={cn(
                    "neo-flat transition-all duration-500 overflow-hidden rounded-[3rem]",
                    isExpanded ? "neo-pressed ring-2 ring-emerald-500/20" : "hover:neo-pressed"
                  )}
                >
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : obs.id)}
                    className="p-5 md:p-8 flex items-center gap-6 md:gap-10 cursor-pointer"
                  >
                    <div className="w-20 h-20 md:w-28 md:h-28 rounded-[2rem] neo-pressed flex-shrink-0 overflow-hidden p-1.5 bg-white/5">
                      <div className="w-full h-full rounded-[1.5rem] overflow-hidden">
                        {obs.imageUrl ? (
                          <img src={obs.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] bg-emerald-500/5">
                             <FileText size={32} />
                           </div>
                        )}
                      </div>
                    </div>
      
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 mb-3 md:mb-4">
                        <span className={cn(
                          "w-fit text-[9px] md:text-[11px] font-black uppercase px-4 py-1.5 rounded-full leading-none",
                          obs.type === 'plant' ? "bg-emerald-500/10 text-emerald-500" : 
                          obs.type === 'animal' ? "bg-amber-500/10 text-amber-500" : 
                          "bg-blue-500/10 text-blue-500"
                        )}>
                          {obs.type === 'study_area' ? 'Study Area' : obs.type}
                        </span>
                        <span className="text-emerald-500 font-extrabold text-xl md:text-3xl tracking-tighter truncate">
                          {obs.selectedSpecies?.species || (obs.type === 'study_area' ? 'Regional Site' : 'Unidentified specimen')}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-6 md:gap-x-12 gap-y-3 text-[10px] md:text-[12px] font-black leading-none uppercase tracking-[0.1em]">
                         <span className="flex items-center gap-2.5 text-[var(--text-muted)]">
                           <Calendar size={16} className="text-emerald-500/40" /> {formatDate(obs.timestamp)}
                         </span>
                         {obs.researcherName && (
                           <span className="hidden sm:inline-block text-emerald-600/70 bg-emerald-500/5 px-5 py-2 rounded-full neo-pressed text-[9px] md:text-[10px] tracking-widest whitespace-nowrap">
                             BY: {obs.researcherName}
                           </span>
                         )}
                         <span className="text-xs font-mono text-[var(--text-muted)]/50 tracking-tighter">REF: {obs.id.slice(0, 8)}</span>
                      </div>
                    </div>
      
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          generateObservationPDF(obs);
                        }}
                        className="w-12 h-12 md:w-16 md:h-16 neo-flat text-emerald-500 hover:text-emerald-400 hover:neo-pressed rounded-[1.5rem] md:rounded-[2rem] transition-all duration-300 flex items-center justify-center"
                        title="Export AI Report"
                      >
                        <Download size={20} className="md:size-6" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(obs.id);
                        }}
                        className="w-12 h-12 md:w-16 md:h-16 neo-flat text-[var(--text-muted)] hover:text-red-500 hover:neo-pressed rounded-[1.5rem] md:rounded-[2rem] transition-all duration-300 flex items-center justify-center"
                      >
                        <Trash2 size={20} className="md:size-6" />
                      </button>
                    </div>
                  </div>

                {isExpanded && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-4 md:px-8 pb-8 border-t border-[var(--neo-shadow-dark)]/10 pt-8"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
                      <div className="space-y-8">
                        <section>
                          <h4 className="text-[10px] md:text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mb-4 md:mb-6">Core Metadata</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                             <div className="neo-pressed p-4 md:p-6 rounded-2xl md:rounded-3xl">
                                <p className="text-[8px] md:text-[9px] font-black text-[var(--text-muted)] uppercase tracking-tight mb-2">Researcher ID</p>
                                <p className="text-xs md:text-sm font-black text-[var(--text-main)] truncate">{obs.researcherName || 'Anonymous'}</p>
                             </div>
                             <div className="neo-pressed p-4 md:p-6 rounded-2xl md:rounded-3xl">
                                <p className="text-[8px] md:text-[9px] font-black text-[var(--text-muted)] uppercase tracking-tight mb-2">Timestamp</p>
                                <p className="text-xs md:text-sm font-black text-[var(--text-main)] truncate">{formatDate(obs.timestamp)} {formatTime(obs.timestamp)}</p>
                             </div>
                          </div>
                        </section>

                        <section>
                          <h4 className="text-[10px] md:text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mb-4 md:mb-6">Parametric Values</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                            {Object.entries(obs.variables).map(([key, val]) => (
                              <div key={key} className="neo-pressed p-4 md:p-6 rounded-2xl md:rounded-3xl">
                                <p className="text-[8px] md:text-[9px] font-black text-[var(--text-muted)] uppercase tracking-tight mb-2">{key}</p>
                                <p className="text-xs md:text-sm font-black text-[var(--text-main)] truncate">{val || 'NR'}</p>
                              </div>
                            ))}
                          </div>
                        </section>

                        {obs.customVariables && obs.customVariables.length > 0 && (
                          <section>
                            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4">Study Extensions</h4>
                            <div className="grid grid-cols-2 gap-4">
                              {obs.customVariables.map((v) => (
                                <div key={v.id} className="bg-emerald-500/5 p-4 rounded-2xl neo-pressed border-none">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-tight">{v.name}</p>
                                    <span className="text-[7px] font-black uppercase bg-emerald-500/20 text-emerald-400 px-1.5 rounded leading-none py-0.5">{v.type}</span>
                                  </div>
                                  <p className="text-xs font-bold text-emerald-200 truncate">{v.value || 'N/A'}</p>
                                </div>
                              ))}
                            </div>
                          </section>
                        )}
                      </div>

                      <div className="space-y-6">
                        {obs.notes && (
                          <section>
                            <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4">Researcher Insights</h4>
                            <div className="neo-pressed p-6 rounded-[2rem] text-[12px] text-[var(--text-muted)] italic leading-relaxed border-none">
                              "{obs.notes}"
                            </div>
                          </section>
                        )}

                        {obs.location && (
                          <section>
                             <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4">Spatial Anchors</h4>
                             <div className="flex gap-4 font-mono text-[10px] text-[var(--text-muted)]">
                               <div className="neo-pressed px-4 py-2 rounded-xl text-emerald-500/60 font-bold border-none">LAT: {obs.location.latitude.toFixed(6)}</div>
                               <div className="neo-pressed px-4 py-2 rounded-xl text-emerald-500/60 font-bold border-none">LON: {obs.location.longitude.toFixed(6)}</div>
                             </div>
                          </section>
                        )}
                        
                        {obs.selectedSpecies && (
                           <section>
                            <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4">Taxonomic Resolution</h4>
                            <div className="neo-pressed p-4 rounded-2xl inline-block border-none">
                              <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-tight mb-1">Family</p>
                              <p className="text-sm font-black text-[var(--text-main)] tracking-tight">{obs.selectedSpecies.family}</p>
                            </div>
                          </section>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-24 text-center neo-flat rounded-[3rem] opacity-50">
            <h4 className="font-black text-[var(--text-muted)] uppercase text-xs tracking-[0.5em]">End of Dataset</h4>
        </div>
      )}
    </div>
  );
}

function FilterButton({ active, label, icon, onClick, color = 'emerald' }: { active: boolean, label: string, icon: any, onClick: () => void, color?: string }) {
  const colorMap: any = {
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    blue: 'text-blue-500',
  };
  
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 px-3 py-3 rounded-xl transition-all duration-300",
        active 
          ? `shadow-inner bg-white/5 ${colorMap[color] || 'text-emerald-500'}` 
          : "text-[var(--text-muted)] hover:text-emerald-400 opacity-60 hover:opacity-100"
      )}
    >
      {icon}
      <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">{label}</span>
      <span className="text-[9px] font-black uppercase tracking-widest sm:hidden">{label.split(' ')[0]}</span>
    </button>
  );
}
