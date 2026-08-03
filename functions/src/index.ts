// Entry point: re-exports only. Firebase deploys by export name from this
// file — every deployed function name below must stay identical.
// firebase-admin's initializeApp() runs in ./shared, which every module
// imports first.

export { healthcheck, enforceDomain, listAdmins, setAdminClaim } from './adminRoles';
export { syncStaffRoster, scheduledStaffRosterSync } from './staffRoster';
export {
  startOffboarding,
  setLastDay,
  setSupervisor,
  markTaskComplete,
  requestHelp,
  resolveHelp,
  resetUserChecklist,
  setEoySettings,
} from './offboardingLifecycle';
export { setOutOfOffice, requestGmailForwarding } from './gmail';
export {
  scanDrive,
  listSharedDrives,
  createDriveFolder,
  setDriveDestinations,
  moveFileToSharedDrive,
  transferFileOwnership,
  markFilePersonal,
  markFilesPersonalBulk,
  createHandoffDoc,
} from './drive';
export { promoteGroupOwner } from './groups';
