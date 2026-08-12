import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import nodemailer from 'nodemailer';

import { REGION } from './shared';

/**
 * Self-managed replacement for the Trigger Email extension (Firebase
 * Extensions are being decommissioned March 2027, so we never installed it).
 * Same contract: docs written to `mail/` — { to: string[], message:
 * { subject, html } } — get sent and stamped with a `delivery` result the
 * way the extension did.
 *
 * SMTP_CONNECTION_URI is a Cloud Secret, e.g.
 *   smtps://no-reply%40orono.k12.mn.us:APP_PASSWORD@smtp.gmail.com:465
 * (percent-encode the @ in the username). Set it with
 *   firebase functions:secrets:set SMTP_CONNECTION_URI
 * then redeploy this function to pick up the new version.
 */
const SMTP_CONNECTION_URI = defineSecret('SMTP_CONNECTION_URI');

/** Display From; override in functions/.env if the sender account differs. */
const MAIL_FROM = defineString('MAIL_FROM', {
  default: 'OronoHR <no-reply@orono.k12.mn.us>',
});

export const sendQueuedMail = onDocumentCreated(
  { document: 'mail/{id}', region: REGION, secrets: [SMTP_CONNECTION_URI], retry: false },
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
      logger.error('sendQueuedMail failed', { id: snap.id, error });
      await snap.ref.update({
        delivery: { state: 'ERROR', error, endTime: FieldValue.serverTimestamp() },
      });
    };

    if (to.length === 0 || !subject || !html) {
      await fail('Malformed mail doc: needs to[], message.subject, message.html.');
      return;
    }

    try {
      const transport = nodemailer.createTransport(SMTP_CONNECTION_URI.value());
      const info = await transport.sendMail({
        from: MAIL_FROM.value(),
        to,
        subject,
        html,
      });
      logger.info('sendQueuedMail delivered', { id: snap.id, to, subject });
      await snap.ref.update({
        delivery: {
          state: 'SUCCESS',
          error: null,
          messageId: info.messageId ?? null,
          endTime: FieldValue.serverTimestamp(),
        },
      });
    } catch (err) {
      await fail(err instanceof Error ? err.message : String(err));
    }
  },
);
