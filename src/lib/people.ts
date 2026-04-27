import { ALLOWED_DOMAIN } from './firebase';
import { clearGoogleAccessToken, getGoogleAccessToken } from './auth';

export type DirectoryPerson = {
  resourceName: string;
  email: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
  photoUrl?: string;
  department?: string;
  title?: string;
};

export class TokenExpiredError extends Error {
  constructor() {
    super('Google access token expired or missing.');
    this.name = 'TokenExpiredError';
  }
}

const READ_MASK = 'names,emailAddresses,photos,organizations';
const ENDPOINT = 'https://people.googleapis.com/v1/people:searchDirectoryPeople';

type PeopleApiResponse = {
  people?: Array<{
    resourceName: string;
    names?: Array<{ displayName?: string; givenName?: string; familyName?: string }>;
    emailAddresses?: Array<{ value?: string }>;
    photos?: Array<{ url?: string; default?: boolean }>;
    organizations?: Array<{ department?: string; title?: string }>;
  }>;
};

export async function searchDirectoryPeople(query: string): Promise<DirectoryPerson[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const token = getGoogleAccessToken();
  if (!token) throw new TokenExpiredError();

  const params = new URLSearchParams({
    query: trimmed,
    readMask: READ_MASK,
    pageSize: '10',
    sources: 'DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE',
  });

  const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    clearGoogleAccessToken();
    throw new TokenExpiredError();
  }
  if (!res.ok) {
    throw new Error(`People API error: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as PeopleApiResponse;
  const people = body.people ?? [];

  return people
    .map((p) => {
      const email = p.emailAddresses?.find((e) => e.value)?.value ?? '';
      const name = p.names?.[0];
      const photo = p.photos?.find((ph) => !ph.default) ?? p.photos?.[0];
      const org = p.organizations?.[0];
      return {
        resourceName: p.resourceName,
        email,
        displayName: name?.displayName ?? email,
        givenName: name?.givenName,
        familyName: name?.familyName,
        photoUrl: photo?.url,
        department: org?.department,
        title: org?.title,
      };
    })
    .filter((p) => p.email.endsWith(`@${ALLOWED_DOMAIN}`));
}
