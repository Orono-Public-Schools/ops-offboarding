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

  // ─── End-of-year (returning users) ─────────────────────────────────────────

  eoyTeacherDevice: {
    title: 'Your device',
    description: 'Decide whether to keep your laptop over the summer or have it stored.',
    tips: [
      {
        title: 'Keep it',
        body: "You're welcome to take your district laptop home over the summer. Most staff do.",
      },
      {
        title: 'Have it stored',
        body: 'If you’d rather not keep it at home, connect with your building tech (Jason Banks at Schumann/Intermediate, Emily Zakashefski at Secondary) and they’ll store it.',
      },
      {
        title: 'Sync to Google Drive',
        body: 'Either way, sync your laptop to Drive before you go — classroom PCs may be re-imaged this summer and local files won’t survive.',
      },
    ],
    notesPlaceholder: 'e.g. keeping mine at home; left iPad with Jason',
  },

  eoyHardware: {
    title: 'Hardware cleanup',
    description: 'Tidy up classroom tech before you leave for summer.',
    tips: [
      {
        title: 'Tech box',
        body: 'Place your tech box on/near your desk. If you don’t have one, ask your building tech.',
      },
      {
        title: 'Return what you don’t need',
        body: 'Doc cams, swivels, extra cords, old chromebooks/laptops, speakers, mice, keyboards, headphones — to the media center.',
      },
      {
        title: 'Remove personal stuff',
        body: 'Take home any personal keyboards, mice, microphones, chromebooks. The district isn’t responsible for personal items left in classrooms.',
      },
    ],
    notesPlaceholder: 'e.g. returned 3 old chromebooks and a doc cam',
  },

  eoyStudentIpads: {
    title: 'Student iPads',
    description: 'Schumann — leave student iPads in their charging stations for the summer.',
    tips: [
      {
        title: 'Charging stations',
        body: 'Plug each iPad into its assigned slot in the charging station and confirm it’s charging.',
      },
      {
        title: 'Personal accessories',
        body: 'Have students take home anything they brought (cases, headphones, screen protectors).',
      },
    ],
    notesPlaceholder: 'Optional',
  },

  eoyChromebookCheckin: {
    title: 'Student Chromebook check-in',
    description:
      'Intermediate — collect Chromebooks with the check-in form so IT can inventory them over the summer.',
    primaryLink: {
      label: 'Open the check-in form',
      url: 'https://docs.google.com/forms/d/e/check-in-form-link', // placeholder; update with the real form URL
    },
    tips: [
      {
        title: 'Each student fills the form',
        body: 'Students complete one form per Chromebook and put the printed copy inside the closed device.',
      },
      {
        title: 'Where to put them',
        body: 'Leave Chromebooks in the cart/charging station with the papers tucked inside.',
      },
      {
        title: 'Personal accessories',
        body: 'Have students remove personal headphones, mice, etc. before checking in.',
      },
    ],
    notesPlaceholder: 'e.g. all 24 collected, 2 missing — followed up with families',
  },

  eoyDeviceForm: {
    title: 'Device plans form',
    description:
      'Secondary — fill out the form to tell IT what you’re doing with your devices over the summer.',
    primaryLink: {
      label: 'Open the device plans form',
      url: 'https://docs.google.com/forms/d/e/device-plans-form-link', // placeholder; update with real form URL
    },
    tips: [
      {
        title: 'One form per teacher',
        body: 'Quick form — takes a minute. IT uses your answer to plan summer device collection and storage.',
      },
    ],
    notesPlaceholder: 'Optional',
  },

  eoySeesaw: {
    title: 'Seesaw',
    description: 'Schumann — Seesaw archives automatically. No action required, just review.',
    tips: [
      {
        title: 'Auto-archive on June 6',
        body: 'Current classes archive automatically. Don’t delete or remove anything yourself — your activities stay for next year.',
      },
      {
        title: 'Student journals',
        body: 'Parents who want their student’s journal can download it themselves. Send them: search “Download student journal in Seesaw.”',
      },
    ],
    notesPlaceholder: 'Optional',
  },

  eoyGoogleClassroom: {
    title: 'Google Classroom',
    description: 'Intermediate — archive your classes on or before June 6.',
    primaryLink: {
      label: 'Open Google Classroom',
      url: 'https://classroom.google.com',
    },
    tips: [
      {
        title: 'Archive (don’t delete)',
        body: 'Archived classes are still accessible — students can no longer see them but you can pull materials from them next year.',
      },
      {
        title: 'How to archive',
        body: 'On the Classes page, click ⋮ on each class card → Archive.',
      },
    ],
    notesPlaceholder: 'e.g. archived 4 sections of Math 6',
  },

  eoySchoology: {
    title: 'Schoology',
    description: 'Secondary — Schoology auto-archives June 7. Save anything you want to keep.',
    primaryLink: {
      label: 'Open Schoology',
      url: 'https://app.schoology.com',
    },
    tips: [
      {
        title: 'Auto-archive on June 7',
        body: 'Courses archive automatically. You don’t need to do anything to make that happen.',
      },
      {
        title: 'Save course to resources',
        body: 'If you want to reuse a course next year, save it to your personal resources before the archive.',
      },
      {
        title: 'Heads-up on reused courses',
        body: 'If you keep working on a course over the summer, refrain from attaching Google Drive Assignments — courses get re-synced and they may break.',
      },
    ],
    notesPlaceholder: 'Optional',
  },

  eoySummerPL: {
    title: 'Summer Professional Learning',
    description: 'Optional — sign up for summer courses and the AI workshop.',
    tips: [
      {
        title: 'On-demand courses',
        body: 'Summer 2025 catalog is open June 9 – August 18. 1–2 CEUs per course, unlimited seats.',
      },
      {
        title: 'AI Summer Workshop',
        body: 'June 9, 8:00–11:00. 3 hours of curriculum writing + 3 hours CEUs. 15 seats.',
      },
      {
        title: 'Where to sign up',
        body: 'Use the links in your principal’s end-of-year email, or search for "Summer 2025 Course Catalogue."',
      },
    ],
    notesPlaceholder: 'Optional',
  },

  eoyVacationResponder: {
    title: 'Summer vacation responder',
    description: 'Set your Gmail vacation reply for summer break.',
    primaryLink: {
      label: 'Open Gmail settings',
      url: 'https://mail.google.com/mail/u/0/#settings/general',
    },
    tips: [
      {
        title: 'Sample message',
        body: '"Thank you for contacting me. Orono Schools are on summer break until August 25th. If you need assistance please contact the office at 952-449-8338. Thank you, and have a great summer!"',
      },
      {
        title: 'How to turn it on',
        body: 'In Gmail, click the gear → See all settings → General tab → scroll to "Vacation responder."',
      },
      {
        title: 'Set the dates',
        body: 'Start date: your last day. End date: leave blank or set to a couple days before staff return.',
      },
    ],
    notesPlaceholder: 'Optional',
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
