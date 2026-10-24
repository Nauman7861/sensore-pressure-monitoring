import React from 'react';
import { Users, ChevronDown, RefreshCw } from 'lucide-react';

interface PatientSelectorProps {
  patients: {
    id: number;
    name: string;
    is_active: boolean;
    date_joined?: string;
  }[];

  selectedPatient: number | null;
  onSelectPatient: (id: number | null) => void;
  onRefresh: () => void;
}

export function PatientSelector({
  patients,
  selectedPatient,
  onSelectPatient,  // 👈 NOT USED YET
  onRefresh,
}: PatientSelectorProps) {

  const [isOpen, setIsOpen] = React.useState(false);

  const selected =
  patients.find(p => p.id === selectedPatient) || null;

const activePatients =
  patients.filter(p => p.is_active);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">

      <div className="flex items-center gap-3 mb-3">

        <Users className="w-5 h-5 text-slate-600" />

        <span className="text-sm font-medium text-slate-600">
          {activePatients.length} Active Patients
        </span>

        <button
          onClick={onRefresh}
          className="ml-auto p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 text-sm"
          title="Refresh patients"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

      </div>


      <div className="flex items-center gap-3">

        <span className="text-sm font-medium text-slate-600">
          Selected:
        </span>

        <div className="relative flex-1">

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            disabled={!patients.length}
          >

            <div className="flex items-center gap-3 truncate">

              <span className="font-medium text-slate-900 truncate">
                {selected?.name || 'Select Patient'}
              </span>

              {selected?.date_joined && (
                <span className="text-xs text-slate-500 ml-auto">
                  {new Date(selected.date_joined).toLocaleDateString()}
                </span>
              )}

            </div>

            <ChevronDown
              className={`w-4 h-4 text-slate-600 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />

          </button>


          {isOpen && (

            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">

              {activePatients.length === 0 ? (

                <div className="px-4 py-6 text-center text-slate-500 text-sm">
                  No active patients
                </div>

              ) : (

                activePatients.map(patient => (

                  <button
                    key={patient.id}
                    onClick={() => {
                      onSelectPatient(patient.id);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                  >

                    <div className="flex items-center gap-3 flex-1 min-w-0">

                      <span className="font-medium text-slate-900 truncate">
                        {patient.name}
                      </span>

                    </div>

                    {patient.date_joined && (
                      <span className="text-xs text-slate-500 ml-2 whitespace-nowrap">
                        {new Date(patient.date_joined).toLocaleDateString()}
                      </span>
                    )}

                  </button>

                ))

              )}

            </div>

          )}

        </div>

      </div>

    </div>
  );
}
