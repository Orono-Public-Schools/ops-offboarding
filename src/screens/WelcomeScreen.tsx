import { useMemo, useState } from 'react';
import { signOut, useAuth } from '../lib/auth';
import { startOffboarding } from '../lib/functions';
import {
  BUILDING_CHECKLISTS,
  checklistForBuilding,
  type BuildingChecklist,
  type FlowType,
} from '../lib/offboarding';
import { useStaff } from '../lib/staff';

type Step = 'choose-type' | 'choose-building';

export function WelcomeScreen() {
  const { user } = useAuth();
  const staffState = useStaff();

  const [step, setStep] = useState<Step>('choose-type');
  const [building, setBuilding] = useState<BuildingChecklist | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userEmail = user?.email ?? null;
  const detectedBuilding = useMemo<BuildingChecklist>(() => {
    if (!userEmail || !('staff' in staffState)) return 'nonInstructional';
    const me = staffState.staff.find((s) => s.email === userEmail.toLowerCase());
    return checklistForBuilding(me?.building);
  }, [userEmail, staffState]);

  const startFlow = async (selectedType: FlowType, selectedBuilding: BuildingChecklist | null) => {
    setError(null);
    setPending(true);
    try {
      await startOffboarding({
        type: selectedType,
        buildingChecklist: selectedType === 'returning' ? selectedBuilding : null,
      });
    } catch (err) {
      setError('Could not start your checklist. Please try again or contact IT.');
      console.error(err);
      setPending(false);
    }
  };

  const handleType = (chosen: FlowType) => {
    if (chosen === 'leaving') {
      void startFlow('leaving', null);
    } else {
      setBuilding(detectedBuilding);
      setStep('choose-building');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 sm:px-6">
      <div
        className="w-full max-w-xl rounded-xl p-6 sm:p-8"
        style={{
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
        }}
      >
        <img src="/orono-offboarding-blue.png" alt="" className="mb-3 h-14 w-14" />

        {step === 'choose-type' && (
          <>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1d2a5d' }}>
              Welcome, {user?.displayName?.split(' ')[0] ?? 'there'}.
            </h1>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: '#334155' }}>
              Let's wrap up the year. First — are you coming back next year, or leaving Orono Public
              Schools?
            </p>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => handleType('returning')}
                disabled={pending}
                className="w-full rounded-xl border-2 p-4 text-left transition hover:-translate-y-px hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
                style={{ borderColor: '#1d2a5d' }}
              >
                <p className="text-sm font-semibold" style={{ color: '#1d2a5d' }}>
                  I'm returning next year
                </p>
                <p className="mt-1 text-xs" style={{ color: '#64748b' }}>
                  End-of-year checklist tailored to your building.
                </p>
              </button>

              <button
                onClick={() => handleType('leaving')}
                disabled={pending}
                className="w-full rounded-xl border-2 p-4 text-left transition hover:-translate-y-px hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
                style={{ borderColor: '#cbd5e1' }}
              >
                <p className="text-sm font-semibold" style={{ color: '#1d2a5d' }}>
                  I'm leaving Orono Public Schools
                </p>
                <p className="mt-1 text-xs" style={{ color: '#64748b' }}>
                  Guided offboarding for transferring your work and devices.
                </p>
              </button>
            </div>
          </>
        )}

        {step === 'choose-building' && (
          <>
            <button
              onClick={() => setStep('choose-type')}
              disabled={pending}
              className="mb-3 text-xs font-semibold disabled:opacity-60"
              style={{ color: '#64748b' }}
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1d2a5d' }}>
              Which checklist?
            </h1>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: '#334155' }}>
              Each building has a slightly different end-of-year list. We picked the most likely one
              based on your roster info, but you can choose another.
            </p>

            <div className="mt-6 space-y-2">
              {BUILDING_CHECKLISTS.map((b) => {
                const isSelected = building === b.key;
                const isDetected = detectedBuilding === b.key;
                return (
                  <button
                    key={b.key}
                    onClick={() => setBuilding(b.key)}
                    disabled={pending}
                    className="flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left transition hover:bg-slate-50 disabled:opacity-60"
                    style={{ borderColor: isSelected ? '#1d2a5d' : '#cbd5e1' }}
                  >
                    <span
                      className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2"
                      style={{
                        borderColor: isSelected ? '#1d2a5d' : '#cbd5e1',
                        background: isSelected ? '#1d2a5d' : 'transparent',
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold" style={{ color: '#1d2a5d' }}>
                        {b.label}
                        {isDetected && (
                          <span
                            className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{
                              background: 'rgba(67,86,169,0.12)',
                              color: '#4356a9',
                            }}
                          >
                            Suggested
                          </span>
                        )}
                      </span>
                      <span className="block text-xs" style={{ color: '#64748b' }}>
                        {b.detail}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => building && void startFlow('returning', building)}
              disabled={pending || !building}
              className="mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #ad2122 0%, #c9393a 100%)',
                boxShadow: '0 2px 10px rgba(173,33,34,0.35)',
              }}
            >
              {pending ? 'Starting…' : 'Start my checklist'}
            </button>
          </>
        )}

        {error && (
          <p
            className="mt-4 rounded-lg px-3 py-2 text-center text-xs"
            style={{ background: 'rgba(173,33,34,0.08)', color: '#ad2122' }}
          >
            {error}
          </p>
        )}

        <div
          className="mt-6 flex items-center justify-between text-xs"
          style={{ color: '#94a3b8' }}
        >
          <span>Signed in as {user?.email}</span>
          <button
            onClick={() => signOut()}
            disabled={pending}
            className="font-semibold disabled:opacity-60"
            style={{ color: '#475569' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
