/**
 * Shared visual shell for lifecycle / transactional emails.
 *
 * Deliberately kept parallel to the one-time-code shell in
 * `app/libs/emailVerification.ts` — one plain-white Redrive email, a single
 * rounded card, a warm yellow hairline as the only accent, no gradients — but
 * self-contained so booking mail and auth mail can evolve independently.
 */

const THEME = {
  ground: "#F4F4F4",
  card: "#FFFFFF",
  border: "#E7E7E7",
  hairline: "#EDEDED",
  ink: "#111111",
  body: "#4A4A4A",
  muted: "#6E6E6E",
  faint: "#9A9A9A",
  accent: "#EAB308",
} as const;

const HEAD_STYLE = `
  @media only screen and (max-width:620px) {
    .shell { width:100% !important; border-radius:0 !important; border-left:0 !important; border-right:0 !important; }
    .pad { padding-left:22px !important; padding-right:22px !important; }
    .title { font-size:26px !important; line-height:32px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .shell, .pad, .rowbg { background:#FFFFFF !important; }
    .ground { background:#F4F4F4 !important; }
  }
`;

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

export interface EmailButton {
  label: string;
  url: string;
}

export interface EmailFactRow {
  label: string;
  value: string;
}

export interface RenderEmailInput {
  /** Inbox preview text. */
  preheader: string;
  /** Small uppercase kicker above the headline. */
  eyebrow: string;
  /** Main headline (may contain simple HTML entities). */
  title: string;
  /** Optional greeting line, e.g. "Hi Khush,". */
  greeting?: string | null;
  /** One or more paragraphs of body copy (plain text; each becomes a <p>). */
  paragraphs: string[];
  /** Optional labelled facts rendered as a bordered table. */
  facts?: EmailFactRow[];
  /** Primary call-to-action button. */
  primaryButton?: EmailButton | null;
  /** Secondary text link under the button. */
  secondaryLink?: EmailButton | null;
  /** Small print under the CTA (e.g. a policy reminder). */
  footnote?: string | null;
  /** Absolute unsubscribe URL — present only for non-transactional mail. */
  unsubscribeUrl?: string | null;
  /** Public site origin, for the help link and logo. */
  appUrl?: string | null;
}

function paragraphHtml(text: string): string {
  // Allow a already-escaped <strong>/<a> to pass through: callers pass trusted
  // template strings, not user input.
  return `<p style="margin:14px 0 0;font-size:16px;line-height:26px;color:${THEME.body};">${text}</p>`;
}

function factsTable(facts: EmailFactRow[]): string {
  const rows = facts
    .map(
      (fact, index) => `<tr>
        <td style="padding:${index === 0 ? "14px" : "10px"} 16px 10px;font-size:13px;line-height:19px;color:${THEME.muted};border-top:${index === 0 ? "0" : `1px solid ${THEME.hairline}`};width:42%;">${escapeHtml(fact.label)}</td>
        <td style="padding:${index === 0 ? "14px" : "10px"} 16px 10px;font-size:14px;line-height:20px;font-weight:600;color:${THEME.ink};border-top:${index === 0 ? "0" : `1px solid ${THEME.hairline}`};">${escapeHtml(fact.value)}</td>
      </tr>`,
    )
    .join("");
  return `<tr><td class="pad" style="padding:20px 40px 2px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid ${THEME.border};border-top:3px solid ${THEME.accent};border-radius:14px;">${rows}</table>
  </td></tr>`;
}

export function renderEmail(input: RenderEmailInput): string {
  const {
    preheader,
    eyebrow,
    title,
    greeting,
    paragraphs,
    facts,
    primaryButton,
    secondaryLink,
    footnote,
    unsubscribeUrl,
    appUrl,
  } = input;

  const helpUrl = appUrl ? `${appUrl}/help-centre` : null;
  const privacyUrl = appUrl ? `${appUrl}/privacy` : null;

  const headline = `<tr>
    <td class="pad" style="padding:26px 40px 4px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td width="22" style="padding-top:7px;"><div style="width:22px;height:3px;background:${THEME.accent};border-radius:2px;"></div></td>
          <td style="padding-left:10px;font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${THEME.muted};">${escapeHtml(eyebrow)}</td>
        </tr>
      </table>
      <h1 class="title" style="margin:14px 0 0;font-size:30px;line-height:37px;letter-spacing:-0.6px;font-weight:800;color:${THEME.ink};">${title}</h1>
      ${greeting ? `<p style="margin:18px 0 0;font-size:16px;line-height:26px;font-weight:700;color:${THEME.ink};">${escapeHtml(greeting)}</p>` : ""}
    </td>
  </tr>`;

  const bodyCopy = `<tr><td class="pad" style="padding:${greeting ? "2px" : "6px"} 40px 4px;">${paragraphs.map(paragraphHtml).join("")}</td></tr>`;

  const cta = primaryButton
    ? `<tr><td class="pad" align="center" style="padding:26px 40px 6px;">
        <a href="${primaryButton.url}" style="display:inline-block;min-width:200px;padding:15px 28px;border-radius:999px;background:${THEME.accent};color:${THEME.ink};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:20px;font-weight:700;text-align:center;text-decoration:none;">${escapeHtml(primaryButton.label)}</a>
        ${secondaryLink ? `<p style="margin:14px 0 0;font-size:13px;line-height:20px;"><a href="${secondaryLink.url}" style="color:${THEME.muted};text-decoration:underline;">${escapeHtml(secondaryLink.label)}</a></p>` : ""}
      </td></tr>`
    : secondaryLink
      ? `<tr><td class="pad" align="center" style="padding:22px 40px 6px;font-size:14px;"><a href="${secondaryLink.url}" style="color:${THEME.ink};font-weight:600;text-decoration:underline;">${escapeHtml(secondaryLink.label)}</a></td></tr>`
      : "";

  const footnoteRow = footnote
    ? `<tr><td class="pad" style="padding:18px 40px 4px;"><p style="margin:0;font-size:13px;line-height:20px;color:${THEME.muted};">${escapeHtml(footnote)}</p></td></tr>`
    : "";

  const unsubscribeLine = unsubscribeUrl
    ? `<p style="margin:10px 0 0;font-size:12px;line-height:19px;color:${THEME.faint};">You are getting this because you opted in to Redrive updates. <a href="${unsubscribeUrl}" style="color:${THEME.muted};text-decoration:underline;">Unsubscribe</a>.</p>`
    : `<p style="margin:0;font-size:12px;line-height:19px;color:${THEME.faint};">You are receiving this email because of activity on your Redrive account.${privacyUrl ? ` Read our <a href="${privacyUrl}" style="color:${THEME.muted};text-decoration:underline;">privacy notice</a>.` : ""}</p>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(preheader)}</title>
    <style>${HEAD_STYLE}</style>
  </head>
  <body style="margin:0;padding:0;background:${THEME.ground};color:${THEME.body};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="ground" style="background:${THEME.ground};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" class="shell" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background:${THEME.card};border:1px solid ${THEME.border};border-radius:20px;overflow:hidden;">
            <tr>
              <td class="pad" style="padding:26px 40px 22px;border-bottom:1px solid ${THEME.hairline};">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td width="40" height="40" align="center" valign="middle" style="width:40px;height:40px;border-radius:12px;background:${THEME.ink};color:#ffffff;font-size:22px;font-weight:700;line-height:40px;">R</td>
                          <td style="padding-left:11px;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:${THEME.ink};">redrive<span style="color:${THEME.accent};">.</span></td>
                        </tr>
                      </table>
                    </td>
                    ${helpUrl ? `<td align="right" style="vertical-align:middle;"><a href="${helpUrl}" style="font-size:13px;font-weight:600;color:${THEME.muted};text-decoration:none;">Help centre</a></td>` : ""}
                  </tr>
                </table>
              </td>
            </tr>
            ${headline}
            ${bodyCopy}
            ${facts && facts.length ? factsTable(facts) : ""}
            ${cta}
            ${footnoteRow}
            <tr>
              <td class="pad rowbg" style="padding:24px 40px 30px;border-top:1px solid ${THEME.hairline};background:${THEME.card};">
                ${unsubscribeLine}
                <p style="margin:10px 0 0;font-size:12px;line-height:19px;color:${THEME.faint};">Redrive &middot; Peer-to-peer vehicle hire across Australia</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:11px;line-height:17px;color:${THEME.faint};">This is an automated message&mdash;please do not reply.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function plainTextFallback(input: RenderEmailInput): string {
  const lines: string[] = [];
  if (input.greeting) lines.push(input.greeting, "");
  lines.push(...input.paragraphs, "");
  if (input.facts?.length) {
    for (const fact of input.facts) lines.push(`${fact.label}: ${fact.value}`);
    lines.push("");
  }
  if (input.primaryButton) lines.push(`${input.primaryButton.label}: ${input.primaryButton.url}`, "");
  if (input.footnote) lines.push(input.footnote, "");
  if (input.unsubscribeUrl) lines.push(`Unsubscribe: ${input.unsubscribeUrl}`);
  lines.push("Redrive · Peer-to-peer vehicle hire across Australia");
  return lines.join("\n");
}
