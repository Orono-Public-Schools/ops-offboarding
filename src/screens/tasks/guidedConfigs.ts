import type { TaskKey } from '../../lib/offboarding';
import type { GuidedTaskConfig } from './GuidedTask';

export const GUIDED_TASK_CONFIGS: Partial<Record<TaskKey, GuidedTaskConfig>> = {
  deviceReturn: {
    title: 'Device return',
    description: 'Hand back any district-issued devices before your last day.',
    tips: [
      {
        title: 'Laptops and Chromebooks',
        body: 'Bring them by the IT office, or follow the return process your supervisor shared.',
      },
      {
        title: 'iPads, phones, hotspots',
        body: 'Same — return to IT with chargers and any accessories that came with them.',
      },
      {
        title: 'Keys and badges',
        body: 'If you have building keys or an OPS ID badge, hand those in too — different people might collect those, ask your supervisor.',
      },
      {
        title: 'Note the serial numbers',
        body: 'Helps IT match what came back to your inventory record. The sticker on the bottom of laptops works.',
      },
    ],
    notesPlaceholder: 'e.g. returned MacBook Air SN ABC123 and iPhone on 2026-05-01',
  },

  sharedCredentials: {
    title: 'Shared credentials',
    description: 'Hand off shared logins or rotate any you had access to.',
    tips: [
      {
        title: 'List shared accounts',
        body: 'In your handoff doc or notes below, list any shared accounts you used (vendor portals, social media, etc.) — without pasting passwords.',
      },
      {
        title: 'Don’t paste passwords here',
        body: 'Note WHICH accounts and WHO else uses them. Rotate the password (or have IT rotate) once you’re out.',
      },
      {
        title: 'Single-owner accounts',
        body: 'If you’re the only person with access to a vendor account, transfer admin to a colleague before leaving — otherwise it gets locked when your account deactivates.',
      },
      {
        title: 'Password manager',
        body: 'If you saved passwords in a work password manager, IT will lock that down automatically — but flag any shared vault items that need to stay alive.',
      },
    ],
    notesPlaceholder:
      'e.g. Twitter account shared with Comms team — Sarah has access; vendor portal X needs password rotation',
  },

  contactsExport: {
    title: 'Contacts export',
    description:
      'Optional — export any personal contacts you want to keep before your account is deactivated.',
    primaryLink: { label: 'Open Google Contacts', url: 'https://contacts.google.com' },
    tips: [
      {
        title: 'What you can take',
        body: 'Contacts you saved to your own labels — not the org-wide directory (those don’t belong to you).',
      },
      {
        title: 'How to export',
        body: 'In Google Contacts → Export → choose Google CSV or vCard → download. Import to your personal Google account if you want.',
      },
      {
        title: 'Most people skip this',
        body: 'If you didn’t maintain a personal contact list at work, this one’s probably fine to skip.',
      },
    ],
    notesPlaceholder: 'Optional',
  },

  sitesOwnership: {
    title: 'Google Sites',
    description:
      'Transfer ownership of any Google Sites you own so they don’t get deleted with your account.',
    primaryLink: { label: 'Open Google Sites', url: 'https://sites.google.com' },
    tips: [
      {
        title: 'Find Sites you own',
        body: 'In Google Sites, the "Owned by me" filter shows what’s yours.',
      },
      {
        title: 'Add a new owner first',
        body: 'Share the site with a colleague and give them Owner permission, THEN remove yourself. Don’t demote yourself first or you might lose access.',
      },
      {
        title: 'Most people don’t have any',
        body: 'In K-12, Sites are pretty rare. If you’re not sure whether you own any, you probably don’t.',
      },
    ],
    notesPlaceholder: 'e.g. transferred classroom site to next-year teacher; no other sites',
  },

  driveTeam: {
    title: 'Shared Drive handoff',
    description: 'Files in shared drives are already safe — but worth a quick check.',
    primaryLink: {
      label: 'Open Shared Drives',
      url: 'https://drive.google.com/drive/shared-drives',
    },
    tips: [
      {
        title: 'Shared drives own their files',
        body: 'Even if you created a file in a shared drive, the drive owns it. Those files stay accessible after you leave.',
      },
      {
        title: 'Your membership goes away',
        body: 'When your account deactivates, you’re auto-removed from shared drives. The drives themselves stay.',
      },
      {
        title: 'Quick skim',
        body: 'Open each shared drive you’re a member of. If something looks orphaned, missing context, or about to break — leave a note in your handoff doc.',
      },
      {
        title: 'Manager handoff',
        body: 'If you’re a Manager on a shared drive (not just a Contributor), make sure another Manager exists so the drive doesn’t end up with no admins.',
      },
    ],
    notesPlaceholder:
      'e.g. left a note in handoff doc about Math Department shared drive structure',
  },
};
