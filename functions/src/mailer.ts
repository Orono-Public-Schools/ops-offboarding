import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineString } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import { google } from 'googleapis';
import MailComposer from 'nodemailer/lib/mail-composer';

import { REGION } from './shared';

/**
 * Self-managed replacement for the Trigger Email extension (Firebase
 * Extensions are being decommissioned March 2027, so we never installed it).
 * Same contract: docs written to `mail/` — { to: string[], message:
 * { subject, html } } — get sent and stamped with a `delivery` result the
 * way the extension did.
 *
 * Sends through the Gmail API as the MAIL_FROM mailbox, impersonated by a
 * domain-wide-delegated service account (scope gmail.send). Keyless: the
 * function's runtime account asks IAM to sign the delegation JWT as
 * MAIL_SERVICE_ACCOUNT, so no JSON key or mailbox password exists anywhere.
 *
 * One-time setup:
 * 1. The runtime account (default compute) holds "Service Account Token
 *    Creator" on MAIL_SERVICE_ACCOUNT.
 * 2. MAIL_SERVICE_ACCOUNT's OAuth client ID is granted domain-wide
 *    delegation for https://www.googleapis.com/auth/gmail.send in the
 *    Workspace Admin console.
 */
const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** The dedicated sender identity; override in functions/.env if renamed. */
const MAIL_SERVICE_ACCOUNT = defineString('MAIL_SERVICE_ACCOUNT', {
  default: 'oronohr-mailer@ops-offboarding.iam.gserviceaccount.com',
});

/** Display From; the address in it is the mailbox the mail is sent as. */
const MAIL_FROM = defineString('MAIL_FROM', {
  default: 'OronoHR <noreply-hr@orono.k12.mn.us>',
});

/** "OronoHR <noreply-hr@…>" → "noreply-hr@…"; a bare address passes through. */
function senderAddress(from: string): string {
  return (from.match(/<([^>]+)>/)?.[1] ?? from).trim();
}

/** A gmail.send access token for `sender`, minted without a key. */
async function delegatedToken(serviceAccount: string, sender: string): Promise<string> {
  const iam = google.iamcredentials({
    version: 'v1',
    auth: new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    }),
  });
  const now = Math.floor(Date.now() / 1000);
  const signed = await iam.projects.serviceAccounts.signJwt({
    name: `projects/-/serviceAccounts/${serviceAccount}`,
    requestBody: {
      payload: JSON.stringify({
        iss: serviceAccount,
        sub: sender,
        scope: GMAIL_SEND_SCOPE,
        aud: TOKEN_URL,
        iat: now,
        exp: now + 600,
      }),
    },
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signed.data.signedJwt ?? '',
    }),
  });
  const body = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !body.access_token) {
    // unauthorized_client here = the delegation grant is missing or lacks the scope.
    throw new Error(
      `Delegation token refused: ${body.error ?? res.status} ${body.error_description ?? ''}`.trim(),
    );
  }
  return body.access_token;
}

export const sendQueuedMail = onDocumentCreated(
  { document: 'mail/{id}', region: REGION, retry: false },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() as {
      to?: unknown;
      message?: { subject?: unknown; html?: unknown };
      delivery?: { state?: string };
    };
    // Already handled (duplicate event delivery) — never double-send.
    if (data.delivery?.state) return;

    const to = (Array.isArray(data.to) ? data.to : [data.to]).filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    );
    const subject = typeof data.message?.subject === 'string' ? data.message.subject : null;
    const html = typeof data.message?.html === 'string' ? data.message.html : null;

    const fail = async (error: string) => {
      // Plain-string message — the CLI log viewer drops structured payloads.
      logger.error(`sendQueuedMail FAILED id=${snap.id}: ${error}`);
      await snap.ref.update({
        delivery: { state: 'ERROR', error, endTime: FieldValue.serverTimestamp() },
      });
    };

    if (to.length === 0 || !subject || !html) {
      await fail('Malformed mail doc: needs to[], message.subject, message.html.');
      return;
    }

    try {
      const from = MAIL_FROM.value();
      const sender = senderAddress(from);
      const serviceAccount = MAIL_SERVICE_ACCOUNT.value();
      // Who is sending as whom, so a missing grant or wrong mailbox is
      // obvious in logs.
      logger.info(`sendQueuedMail gmail sa=${serviceAccount} as=${sender}`);
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: await delegatedToken(serviceAccount, sender) });
      const mime = await new MailComposer({ from, to, subject, html }).compile().build();
      const res = await google.gmail({ version: 'v1', auth }).users.messages.send({
        userId: 'me',
        requestBody: { raw: mime.toString('base64url') },
      });
      logger.info(`sendQueuedMail DELIVERED id=${snap.id} to=${to.join(',')} subject=${subject}`);
      await snap.ref.update({
        delivery: {
          state: 'SUCCESS',
          error: null,
          messageId: res.data.id ?? null,
          endTime: FieldValue.serverTimestamp(),
        },
      });
    } catch (err) {
      await fail(err instanceof Error ? err.message : String(err));
    }
  },
);
