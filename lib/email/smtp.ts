import nodemailer from "nodemailer";
import {
  getSmtpFromEmail,
  getSmtpFromName,
  getSmtpHost,
  getSmtpPass,
  getSmtpPort,
  getSmtpUser,
} from "@/lib/env";

type CommentModerationNotificationInput = {
  actionType: "updated" | "deleted";
  adminMessage: string;
  commentTitle: string;
  consultationTitle: string;
  nextComment: {
    bodyText: string | null;
    title: string;
  } | null;
  previousComment: {
    bodyText: string | null;
    title: string;
  };
  recipientEmail: string;
  recipientName: string;
  sectionTitle: string;
};

type AuthLinkEmailInput = {
  email: string;
  link: string;
  name?: string;
};

let transport: nodemailer.Transporter | undefined;

function getTransport() {
  if (!transport) {
    const port = getSmtpPort();

    transport = nodemailer.createTransport({
      host: getSmtpHost(),
      port,
      secure: port === 465,
      auth: {
        user: getSmtpUser(),
        pass: getSmtpPass(),
      },
    });
  }

  return transport;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCommentSnapshotText(input: {
  bodyText: string | null;
  title: string;
}) {
  return [
    `Titolo: ${input.title}`,
    "Testo:",
    input.bodyText?.trim() || "Nessuna descrizione aggiuntiva.",
  ].join("\n");
}

function formatCommentSnapshotHtml(input: {
  bodyText: string | null;
  title: string;
}) {
  const safeTitle = escapeHtml(input.title);
  const safeBody = escapeHtml(
    input.bodyText?.trim() || "Nessuna descrizione aggiuntiva.",
  ).replaceAll("\n", "<br />");

  return `<p><strong>Titolo:</strong> ${safeTitle}<br /><strong>Testo:</strong><br />${safeBody}</p>`;
}

async function sendAppEmail(input: {
  html: string;
  subject: string;
  text: string;
  to: string;
}) {
  await getTransport().sendMail({
    from: `"${getSmtpFromName()}" <${getSmtpFromEmail()}>`,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}

export async function sendFirstAccessEmail(input: AuthLinkEmailInput) {
  const safeName = escapeHtml(input.name?.trim() || input.email);
  const safeLink = escapeHtml(input.link);

  await sendAppEmail({
    to: input.email,
    subject: "[Consultazione Delphi] Completa il primo accesso",
    text: [
      `Ciao ${input.name?.trim() || input.email},`,
      "",
      "e' stato creato un account per accedere alla piattaforma di consultazione Delphi.",
      "Apri questo link per confermare l'accesso e impostare la tua password:",
      input.link,
      "",
      "Se non ti aspettavi questa email, puoi ignorarla.",
    ].join("\n"),
    html: [
      `<p>Ciao ${safeName},</p>`,
      "<p>e' stato creato un account per accedere alla piattaforma di consultazione Delphi.</p>",
      `<p><a href="${safeLink}">Completa il primo accesso</a></p>`,
      `<p>Se il pulsante non funziona, copia e incolla questo link nel browser:<br />${safeLink}</p>`,
      "<p>Se non ti aspettavi questa email, puoi ignorarla.</p>",
    ].join(""),
  });
}

export async function sendPasswordRecoveryEmail(input: AuthLinkEmailInput) {
  const safeName = escapeHtml(input.name?.trim() || input.email);
  const safeLink = escapeHtml(input.link);

  await sendAppEmail({
    to: input.email,
    subject: "[Consultazione Delphi] Reimposta la password",
    text: [
      `Ciao ${input.name?.trim() || input.email},`,
      "",
      "abbiamo ricevuto una richiesta di reimpostazione password per la piattaforma di consultazione Delphi.",
      "Apri questo link per scegliere una nuova password:",
      input.link,
      "",
      "Se non hai richiesto tu il recupero password, puoi ignorare questa email.",
    ].join("\n"),
    html: [
      `<p>Ciao ${safeName},</p>`,
      "<p>abbiamo ricevuto una richiesta di reimpostazione password per la piattaforma di consultazione Delphi.</p>",
      `<p><a href="${safeLink}">Reimposta la password</a></p>`,
      `<p>Se il pulsante non funziona, copia e incolla questo link nel browser:<br />${safeLink}</p>`,
      "<p>Se non hai richiesto tu il recupero password, puoi ignorare questa email.</p>",
    ].join(""),
  });
}

export async function sendCommentModerationNotification(
  input: CommentModerationNotificationInput,
) {
  const actionLabel =
    input.actionType === "deleted" ? "eliminato" : "modificato";
  const subject =
    input.actionType === "deleted"
      ? "Un tuo commento e' stato eliminato"
      : "Un tuo commento e' stato modificato";
  const safeRecipientName = escapeHtml(input.recipientName);
  const safeConsultationTitle = escapeHtml(input.consultationTitle);
  const safeSectionTitle = escapeHtml(input.sectionTitle);
  const safeCommentTitle = escapeHtml(input.commentTitle);
  const safeAdminMessage = escapeHtml(input.adminMessage).replaceAll("\n", "<br />");
  const previousCommentText = formatCommentSnapshotText(input.previousComment);
  const previousCommentHtml = formatCommentSnapshotHtml(input.previousComment);
  const nextCommentText = input.nextComment
    ? formatCommentSnapshotText(input.nextComment)
    : null;
  const nextCommentHtml = input.nextComment
    ? formatCommentSnapshotHtml(input.nextComment)
    : null;

  await sendAppEmail({
    to: input.recipientEmail,
    subject: `[Consultazione Delphi] ${subject}`,
    text: [
      `Ciao ${input.recipientName},`,
      "",
      `un amministratore ha ${actionLabel} un tuo commento nella consultazione "${input.consultationTitle}".`,
      `Sezione: ${input.sectionTitle}`,
      `Titolo commento: ${input.commentTitle}`,
      "",
      input.actionType === "updated"
        ? "Versione precedente del commento:"
        : "Commento eliminato:",
      previousCommentText,
      ...(nextCommentText
        ? [
          "",
          "Versione aggiornata del commento:",
          nextCommentText,
        ]
        : []),
      "",
      "Messaggio dell'amministratore:",
      input.adminMessage,
      "",
      "Questa email e' stata inviata automaticamente dalla piattaforma di consultazione Delphi.",
    ].join("\n"),
    html: [
      `<p>Ciao ${safeRecipientName},</p>`,
      `<p>un amministratore ha <strong>${actionLabel}</strong> un tuo commento nella consultazione <strong>${safeConsultationTitle}</strong>.</p>`,
      `<p><strong>Sezione:</strong> ${safeSectionTitle}<br /><strong>Titolo commento:</strong> ${safeCommentTitle}</p>`,
      input.actionType === "updated"
        ? "<p><strong>Versione precedente del commento:</strong></p>"
        : "<p><strong>Commento eliminato:</strong></p>",
      previousCommentHtml,
      ...(nextCommentHtml
        ? [
          "<p><strong>Versione aggiornata del commento:</strong></p>",
          nextCommentHtml,
        ]
        : []),
      `<p><strong>Messaggio dell'amministratore:</strong></p>`,
      `<p>${safeAdminMessage}</p>`,
      "<p>Questa email e' stata inviata automaticamente dalla piattaforma di consultazione Delphi.</p>",
    ].join(""),
  });
}
