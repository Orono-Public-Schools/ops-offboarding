import { useNavigate } from 'react-router';
import { useAuth, useIsHR } from '../lib/auth';
import { MyNotificationPrefsCard } from './hr/NotificationCards';
import { Card } from '../ds/components/core/Card';
import { RowList, DetailRow } from '../ds/components/forms/RowList';
import { ScreenHeader } from '../components/ScreenHeader';

/** What the signed-in claims amount to, in words. */
function accessLabel(claims: Record<string, unknown> | null): string {
  if (!claims) return 'Staff';
  if (claims.it_admin === true) return 'IT admin';
  if (claims.it_support === true) return 'IT support';
  if (claims.hr === true || claims.hr === 'admin') return 'HR admin';
  if (claims.hr === 'staff') return 'HR staff';
  return 'Staff';
}

export function AccountScreen() {
  const navigate = useNavigate();
  const { user, claims } = useAuth();
  const isHR = useIsHR();

  return (
    <>
      <ScreenHeader
        crumb="Home"
        onBack={() => navigate('/')}
        title={user?.displayName ?? 'Your account'}
        note="What OronoHR knows about you, and how it reaches you."
      />
      <Card eyebrow="Account" heading="Who you're signed in as" pad={16}>
        <RowList>
          <DetailRow label="Name" value={user?.displayName ?? '—'} />
          <DetailRow label="Email" value={user?.email ?? '—'} />
          <DetailRow label="Access" value={accessLabel(claims)} />
        </RowList>
      </Card>
      {isHR && <MyNotificationPrefsCard />}
    </>
  );
}
