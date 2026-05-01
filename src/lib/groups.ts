import { ALLOWED_DOMAIN } from './firebase';
import { clearGoogleAccessToken, getGoogleAccessToken } from './auth';

export type GroupRole = 'OWNER' | 'MANAGER' | 'MEMBER';

export type UserGroup = {
  id: string;
  email: string;
  name: string;
  description?: string;
  directMembersCount?: number;
  role: GroupRole;
};

export class GroupsTokenError extends Error {
  constructor() {
    super('Google access token expired or missing.');
    this.name = 'GroupsTokenError';
  }
}

const DIRECTORY = 'https://www.googleapis.com/admin/directory/v1';

async function authedFetch(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    clearGoogleAccessToken();
    throw new GroupsTokenError();
  }
  return res;
}

export async function fetchOwnedOrManagedGroups(userEmail: string): Promise<UserGroup[]> {
  const token = getGoogleAccessToken();
  if (!token) throw new GroupsTokenError();

  const params = new URLSearchParams({
    userKey: userEmail,
    maxResults: '200',
    fields: 'groups(id,email,name,description,directMembersCount),nextPageToken',
  });

  const groups: Omit<UserGroup, 'role'>[] = [];
  let pageToken: string | undefined;
  do {
    const url = pageToken
      ? `${DIRECTORY}/groups?${params.toString()}&pageToken=${pageToken}`
      : `${DIRECTORY}/groups?${params.toString()}`;
    const res = await authedFetch(url, token);
    if (!res.ok) {
      throw new Error(`Directory groups.list error: ${res.status} ${res.statusText}`);
    }
    const body = (await res.json()) as {
      groups?: Omit<UserGroup, 'role'>[];
      nextPageToken?: string;
    };
    groups.push(...(body.groups ?? []));
    pageToken = body.nextPageToken;
  } while (pageToken);

  // For each group, look up the user's role.
  const results = await Promise.all(
    groups.map(async (g) => {
      try {
        const res = await authedFetch(
          `${DIRECTORY}/groups/${encodeURIComponent(g.id)}/members/${encodeURIComponent(userEmail)}?fields=role`,
          token,
        );
        if (!res.ok) return null;
        const body = (await res.json()) as { role?: GroupRole };
        if (!body.role) return null;
        return { ...g, role: body.role };
      } catch {
        return null;
      }
    }),
  );

  return results
    .filter((g): g is UserGroup => g !== null && (g.role === 'OWNER' || g.role === 'MANAGER'))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function groupManageUrl(group: UserGroup): string {
  // Workspace per-domain Groups URL, members tab where the user can promote
  // a colleague to owner.
  const localPart = group.email.split('@')[0];
  return `https://groups.google.com/u/0/a/${ALLOWED_DOMAIN}/g/${encodeURIComponent(localPart)}/members`;
}
