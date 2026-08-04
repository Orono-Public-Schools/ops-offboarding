import { useState } from 'react';
import { useNavigate } from 'react-router';
import { startOffboarding } from '../lib/functions';
import { Button } from '../ds/components/core/Button';
import { Card } from '../ds/components/core/Card';
import { QuietLink } from '../ds/components/core/QuietLink';

export function WelcomeScreen() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setError(null);
    setPending(true);
    try {
      await startOffboarding({ type: 'leaving', buildingChecklist: null });
    } catch (err) {
      setError('Could not start your checklist. Please try again or contact IT.');
      console.error(err);
      setPending(false);
    }
  };

  return (
    <Card
      eyebrow="Offboarding"
      heading="We walk every handoff with you"
      footer={
        <QuietLink icon="home" onClick={() => navigate('/')}>
          Not leaving the district? Back to the portal home
        </QuietLink>
      }
    >
      <p style={{ margin: 0, font: 'var(--type-body)', color: 'var(--text-body)' }}>
        Leaving Orono? We'll walk you through transferring your Drive files, handing off group
        ownership, setting an out-of-office reply, returning your devices, and the rest. Nothing
        happens until you say so, and progress saves automatically — stop anytime and pick up where
        you left off.
      </p>

      <div className="mt-5">
        <Button variant="primary" icon="arrowRight" onClick={handleStart} disabled={pending}>
          {pending ? 'Starting…' : 'Start my checklist'}
        </Button>
      </div>

      {error && (
        <p style={{ margin: '16px 0 0', font: 'var(--type-caption)', color: 'var(--accent)' }}>
          {error}
        </p>
      )}
    </Card>
  );
}
