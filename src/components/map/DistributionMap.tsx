import React, { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import { fetchObservations } from '../../lib/services';
import { Observation } from '../../types';
import { Loader2, Leaf, Bird, Map as MapIcon, Calendar } from 'lucide-react';
import { formatDate } from '../../lib/utils';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export default function DistributionMap() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchObservations();
        // Filter observations with actual coordinates
        setObservations(data.filter(obs => obs.location?.latitude && obs.location?.longitude));
      } catch (e) {
        console.error("Failed to load map data", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (!hasValidKey) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] neo-flat rounded-3xl p-12 text-center">
        <div className="w-20 h-20 neo-pressed rounded-3xl flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform duration-500">
          <MapIcon size={32} />
        </div>
        <h2 className="text-2xl font-black text-[var(--text-main)] mb-4 tracking-tight">Spatial Discovery Offline</h2>
        <p className="text-[var(--text-muted)] mb-8 max-w-md font-bold">
          To visualize specimen distribution, please integrate your Google Maps Platform API credentials.
        </p>
        <div className="neo-pressed p-8 rounded-3xl text-left w-full max-w-md border border-[var(--neo-shadow-dark)]/10">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mb-6">Configuration Protocol</p>
          <ol className="space-y-4 text-sm text-[var(--text-main)] font-bold">
            <li className="flex gap-4 items-center">
              <span className="w-6 h-6 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center text-[11px] font-black">1</span>
              <span>Deploy key via Cloud Console</span>
            </li>
            <li className="flex gap-4 items-center">
              <span className="w-6 h-6 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center text-[11px] font-black">2</span>
              <span>Open Application Matrix</span>
            </li>
            <li className="flex gap-4 items-center">
              <span className="w-6 h-6 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center text-[11px] font-black">3</span>
              <span>Assign <code className="text-emerald-500 neo-pressed px-2 py-0.5 rounded-md font-black italic">MAPS_KEY</code></span>
            </li>
          </ol>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] neo-flat rounded-3xl">
        <Loader2 className="animate-spin text-emerald-500 mb-6" size={40} />
        <p className="text-[var(--text-muted)] font-black text-[11px] uppercase tracking-[0.3em] italic">Triangulating Specimens...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-3xl md:text-4xl font-black text-[var(--text-main)] tracking-tight">Spatial Distribution</h2>
          <p className="text-[var(--text-muted)] font-bold text-base md:text-lg">Mapping taxonomic findings across study areas</p>
        </div>
        <div className="neo-pressed px-6 py-3 rounded-2xl border border-[var(--neo-shadow-dark)]/10 w-fit">
           <span className="text-xs font-black text-emerald-500 tracking-widest leading-none">{observations.length} COORDINATES CACHED</span>
        </div>
      </div>

      <div className="h-[400px] md:h-[600px] w-full rounded-[2.5rem] md:rounded-[3rem] overflow-hidden neo-flat-deep relative p-3 md:p-4">
        <div className="w-full h-full rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border-2 md:border-4 border-[var(--neo-shadow-light)]/40 shadow-inner">
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              defaultCenter={{ lat: 0, lng: 0 }}
              defaultZoom={2}
              mapId="ECOLOG_DISTRIBUTION_MAP"
              disableDefaultUI={true}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              {observations.map(obs => (
                <MarkerWithInfoWindow key={obs.id} observation={obs} />
              ))}
            </Map>
          </APIProvider>
        </div>
      </div>
    </div>
  );
}

interface MarkerProps {
  observation: Observation;
  key?: React.Key;
}

function MarkerWithInfoWindow({ observation }: MarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);

  if (!observation.location) return null;

  const getPinColor = (type: string) => {
    switch (type) {
      case 'plant': return '#10b981';
      case 'animal': return '#f59e0b';
      case 'study_area': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: observation.location.latitude, lng: observation.location.longitude }}
        onClick={() => setOpen(true)}
      >
        <Pin 
          background={getPinColor(observation.type)} 
          borderColor="rgba(255,255,255,0.4)" 
          glyphColor="#fff"
        >
          {observation.type === 'plant' ? <Leaf size={14} color="white" /> : <Bird size={14} color="white" />}
        </Pin>
      </AdvancedMarker>
      {open && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)} headerDisabled>
          <div className="p-4 min-w-[280px] bg-[var(--neo-bg)] text-[var(--text-main)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--neo-shadow-dark)]/10">
            <div className="flex items-center gap-4 mb-6">
               {observation.imageUrl && (
                 <img src={observation.imageUrl} className="w-16 h-16 rounded-2xl object-cover neo-pressed shadow-inner" />
               )}
               <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em] mb-1">{observation.type}</p>
                  <p className="text-base font-black text-[var(--text-main)] truncate leading-tight tracking-tight">
                    {observation.selectedSpecies?.species || observation.selectedSpecies?.family || 'Unidentified'}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest truncate opacity-70">
                    {observation.selectedSpecies?.family || 'Kingdom Unknown'}
                  </p>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6 neo-pressed p-3 rounded-xl max-h-[140px] overflow-y-auto custom-scrollbar">
                {Object.entries(observation.variables).map(([name, val]) => (
                   <div key={name} className="overflow-hidden">
                      <p className="text-[8px] font-black uppercase text-[var(--text-muted)] truncate leading-none mb-1.5 opacity-60">{name}</p>
                      <p className="text-[11px] font-black text-[var(--text-main)] truncate">{val}</p>
                   </div>
                ))}
                {observation.customVariables?.map(v => (
                   <div key={v.id} className="overflow-hidden">
                      <p className="text-[8px] font-black uppercase text-[var(--text-muted)] truncate leading-none mb-1.5 opacity-60">{v.name}</p>
                      <p className="text-[11px] font-black text-emerald-500 truncate">{v.value || 'N/A'}</p>
                   </div>
                ))}
            </div>

            {observation.notes && (
              <div className="mb-6 border-l-4 border-emerald-500/20 pl-4">
                 <p className="text-[10px] text-[var(--text-muted)] font-bold italic line-clamp-3 leading-relaxed">"{observation.notes}"</p>
              </div>
            )}
            
            <div className="space-y-3 border-t border-[var(--neo-shadow-dark)]/10 pt-4">
              <div className="flex items-center justify-between text-[10px]">
                 <span className="text-[var(--text-muted)] flex items-center gap-2 font-black uppercase tracking-widest"><Calendar size={12} /> Recorded</span>
                 <span className="text-[var(--text-main)] font-black italic">{formatDate(observation.timestamp)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                 <span className="text-[var(--text-muted)] flex items-center gap-2 font-black uppercase tracking-widest"><MapIcon size={12} /> Coordinates</span>
                 <span className="text-[var(--text-main)] font-black italic">
                    {observation.location.latitude.toFixed(4)}, {observation.location.longitude.toFixed(4)}
                 </span>
              </div>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}
