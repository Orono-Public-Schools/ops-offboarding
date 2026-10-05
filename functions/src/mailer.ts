import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
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
 * domain-wide-delegated service account (scope gmail.send) — the OPSTech
 * Site pattern. No mailbox password or app password is involved, so a
 * password change or 2SV policy can't break delivery.
 *
 * GMAIL_SA_KEY is a Cloud Secret holding the service account's JSON key:
 *   firebase functions:secrets:set GMAIL_SA_KEY --data-file key.json
 * then redeploy this function to pick up the new version.
 */
const GMAIL_SA_KEY = defineSecret('GMAIL_SA_KEY');

/** Display From; the address in it is the mailbox the mail is sent as. */
const MAIL_FROM = defineString('MAIL_FROM', {
  default: 'OronoHR <noreply-hr@orono.k12.mn.us>',
});

/** "OronoHR <noreply-hr@…>" → "noreply-hr@…"; a bare address passes through. */
function senderAddress(from: string): string {
  return (from.match(/<([^>]+)>/)?.[1] ?? from).trim();
}

export const sendQueuedMail = onDocumentCreated(
  { document: 'mail/{id}', region: REGION, secrets: [GMAIL_SA_KEY], retry: false },
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
      const key = JSON.parse(GMAIL_SA_KEY.value()) as { client_email: string; private_key: string };
      // Who is sending as whom — never the key itself — so a missing
      // delegation grant or wrong mailbox is obvious in logs.
      logger.info(`sendQueuedMail gmail sa=${key.client_email} as=${sender}`);
      const auth = new google.auth.JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
        subject: sender,
      });
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
