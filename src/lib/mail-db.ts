import { neon } from "@neondatabase/serverless";

// Cirkle Mail — connected to its OWN Neon Postgres database.
// This is separate from the main app's Neon Postgres.
const MAIL_NEON_URL =
  process.env.MAIL_NEON_URL ||
  "postgresql://neondb_owner:npg_xa2gV8hJbFoe@ep-dry-leaf-b41wbtpn-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require";

export const mailSql = neon(MAIL_NEON_URL);

export interface MailEmail {
  id: string;
  threadId: string;
  fromName: string;
  fromEmail: string;
  toEmails: string;
  subject: string;
  body: string;
  snippet: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  folder: string;
  labels: string;
  hasAttachment: boolean;
  attachmentName: string;
  intent: string;
}

export async function getMailEmails(folder?: string, limit = 50): Promise<MailEmail[]> {
  if (folder && folder !== "ALL") {
    const rows = await mailSql`
      SELECT id, "threadId", "fromName", "fromEmail", "toEmails", subject, body, snippet,
             date, "isRead", "isStarred", "isImportant", folder, labels,
             "hasAttachment", "attachmentName", intent
      FROM "Email" WHERE folder = ${folder}
      ORDER BY date DESC LIMIT ${limit}
    `;
    return rows as MailEmail[];
  }
  const rows = await mailSql`
    SELECT id, "threadId", "fromName", "fromEmail", "toEmails", subject, body, snippet,
           date, "isRead", "isStarred", "isImportant", folder, labels,
           "hasAttachment", "attachmentName", intent
    FROM "Email" ORDER BY date DESC LIMIT ${limit}
  `;
  return rows as MailEmail[];
}

export async function getMailStats() {
  const inbox = await mailSql`SELECT COUNT(*) as n FROM "Email" WHERE folder = 'INBOX'`;
  const unread = await mailSql`SELECT COUNT(*) as n FROM "Email" WHERE folder = 'INBOX' AND "isRead" = false`;
  const starred = await mailSql`SELECT COUNT(*) as n FROM "Email" WHERE "isStarred" = true`;
  const sent = await mailSql`SELECT COUNT(*) as n FROM "Email" WHERE folder = 'SENT'`;
  return {
    inbox: Number(inbox[0]?.n || 0),
    unread: Number(unread[0]?.n || 0),
    starred: Number(starred[0]?.n || 0),
    sent: Number(sent[0]?.n || 0),
  };
}

export async function sendMail(subject: string, body: string, toEmails: string) {
  const id = crypto.randomUUID();
  const threadId = `t_${Date.now()}`;
  const snippet = body.replace(/<[^>]*>/g, "").slice(0, 120);
  await mailSql`
    INSERT INTO "Email" (id, "threadId", "fromName", "fromEmail", "toEmails", "ccEmails", "bccEmails",
                         subject, body, snippet, date, "isRead", "isStarred", "isImportant",
                         folder, labels, "hasAttachment", "attachmentName", intent, "createdAt", "updatedAt")
    VALUES (${id}, ${threadId}, 'You', 'you@cirkle.mail', ${toEmails}, '', '',
            ${subject}, ${body}, ${snippet}, NOW(), true, false, false,
            'SENT', '', false, '', '', NOW(), NOW())
  `;
  return { id, subject };
}

export async function toggleMailStar(id: string) {
  await mailSql`UPDATE "Email" SET "isStarred" = NOT "isStarred", "updatedAt" = NOW() WHERE id = ${id}`;
  const row = await mailSql`SELECT "isStarred" FROM "Email" WHERE id = ${id}`;
  return { starred: Boolean(row[0]?.isStarred) };
}

export async function markMailRead(id: string) {
  await mailSql`UPDATE "Email" SET "isRead" = true, "updatedAt" = NOW() WHERE id = ${id}`;
  return { ok: true };
}
