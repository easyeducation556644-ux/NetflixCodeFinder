import { google } from 'googleapis';

/* =========================
   Gmail API Client
========================= */
function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/* =========================
   Netflix Link Detection
========================= */
function isRelevantNetflixLinkEmail(htmlContent, textContent) {
  if (!htmlContent && !textContent) return false;

  const patterns = [
    'netflix.com/account/travel/verify',
    'netflix.com/account/update-primary-location',
    'netflix.com/account/travel',
    'temporary-access',
    'verify-device',
    'yesitwasme',
    'yes-it-was-me'
  ];

  const content = (htmlContent || '') + (textContent || '');
  const contentLower = content.toLowerCase();

  for (const pattern of patterns) {
    if (contentLower.includes(pattern.toLowerCase())) {
      console.log(`✓ Found pattern: ${pattern}`);
      return true;
    }
  }

  return false;
}

/* =========================
   Base64URL Decode (Gmail bodies)
========================= */
function decodeBase64Url(data) {
  if (!data) return '';
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  const padded = pad ? b64 + '='.repeat(4 - pad) : b64;

  try {
    return Buffer.from(padded, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

/* =========================
   Extract HTML + Text Bodies
========================= */
function extractBodiesFromPayload(payload) {
  let htmlContent = '';
  let textContent = '';

  function walk(part) {
    if (!part) return;

    if (part.mimeType === 'text/html' && part.body?.data) {
      const decoded = decodeBase64Url(part.body.data);
      if (decoded) htmlContent = decoded;
    } else if (part.mimeType === 'text/plain' && part.body?.data) {
      const decoded = decodeBase64Url(part.body.data);
      if (decoded) textContent = decoded;
    }

    if (Array.isArray(part.parts)) {
      part.parts.forEach(walk);
    }
  }

  walk(payload);

  if (!htmlContent && payload?.body?.data && payload?.mimeType?.includes('html')) {
    htmlContent = decodeBase64Url(payload.body.data);
  }
  if (!textContent && payload?.body?.data && payload?.mimeType?.includes('plain')) {
    textContent = decodeBase64Url(payload.body.data);
  }

  return { htmlContent, textContent };
}

/* =========================
   URL Sanitizer
========================= */
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return null;

  const trimmedUrl = url.trim();
  let urlObj;

  try {
    urlObj = new URL(trimmedUrl);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(urlObj.protocol.toLowerCase())) return null;

  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(trimmedUrl.toLowerCase());
  } catch {
    decodedUrl = trimmedUrl.toLowerCase();
  }

  const dangerousPatterns = [
    'javascript:', 'data:', 'vbscript:', '<script',
    'onerror', 'onclick', 'onload', 'onmouseover',
  ];

  for (const pattern of dangerousPatterns) {
    if (decodedUrl.includes(pattern)) return null;
  }

  const hostname = urlObj.hostname.toLowerCase();
  const allowedDomains = [
    'netflix.com', 'www.netflix.com', 'nflxso.net',
    'www.nflxso.net', 'email.netflix.com', 'click.netflix.com',
  ];

  const isAllowed = allowedDomains.some(domain =>
    hostname === domain || hostname.endsWith('.' + domain)
  );

  return isAllowed ? trimmedUrl : null;
}

/* =========================
   Keep original email design
   (sanitize links + style specific buttons)
========================= */
async function sanitizeAndStyleHtml(html) {
  if (!html || html.trim() === "") return html;

  let processedHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  processedHtml = processedHtml.replace(
    /<a([^>]*)href\s*=\s*['"]([^'"]*)['"]([^>]*)>/gi,
    (match, preAttrs, url, postAttrs) => {
      const urlClean = url.replace(/&amp;/g, '&').toLowerCase();
      const safeUrl = sanitizeUrl(url.replace(/&amp;/g, '&'));

      if (!safeUrl) return match;

      const isYesItsMe =
        urlClean.includes('yesitwasme') ||
        urlClean.includes('yes-it-was-me') ||
        urlClean.includes('yes_it_was_me');

      const isGetCode = urlClean.includes('travel') && urlClean.includes('temporary');

      if (isYesItsMe || isGetCode) {
        let newAttrs = preAttrs + postAttrs;
        const buttonStyle =
          'color: #ffffff !important; background-color: #e50914 !important; padding: 5px 10px; border-radius: 4px; display: inline-block; text-decoration: none;';

        if (newAttrs.includes('style=')) {
          newAttrs = newAttrs.replace(/style\s*=\s*["']([^"']*)["']/i, (m, styles) => {
            return `style="${styles}; ${buttonStyle}"`;
          });
        } else {
          newAttrs = newAttrs + ` style="${buttonStyle}"`;
        }

        return `<a${newAttrs} href="${safeUrl}" target="_blank" rel="noopener noreferrer">`;
      }

      return `<a${preAttrs} href="${safeUrl}"${postAttrs} target="_blank" rel="noopener noreferrer">`;
    }
  );

  return `<div class="netflix-email-original">${processedHtml}</div>`;
}

/* =========================
   OTP Extraction (language-agnostic)
   NOTE: Used only for selecting relevant email.
         NOT returned to client (keeps old response shape).
========================= */
function stripHtmlToText(s) {
  return (s || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '\n')
    .replace(/\u00a0/g, ' ');
}

function findNetflixOtp4(htmlContent, textContent) {
  const html = htmlContent || '';
  const text = textContent || '';

  const plain = (stripHtmlToText(html) + '\n' + text)
    .replace(/[ \t]+/g, ' ')
    .replace(/\r\n/g, '\n');

  // A) Strong Netflix signal: digits inside element with letter-spacing
  const RE_LETTER_SPACING_4 = /letter-spacing\s*:\s*[^;"']+[^>]*>\s*(\d{4})\s*</gi;

  // B) Spaced digits (rare) — NO lookbehind (prod-safe)
  const RE_SPACED4 = /(?:^|[^\d])(\d(?:\s*\d){3})(?!\d)/g;

  // C) Plain 4-digit — NO lookbehind (prod-safe)
  const RE_PLAIN4 = /(?:^|[^\d])(\d{4})(?!\d)/g;

  const candidates = [];

  function push(code, index, bonus = 0) {
    const n = Number(code);
    let score = 0;

    // Early in email is better
    if (index < 1500) score += 4;
    else if (index < 4000) score += 2;

    // Penalize year-like values
    if (n >= 1900 && n <= 2099) score -= 3;

    // Footer-ish penalty
    const ctx = plain.slice(Math.max(0, index - 140), index + 140).toLowerCase();
    if (ctx.includes('privacy') || ctx.includes('terms') || ctx.includes('help') || ctx.includes('questions')) {
      score -= 2;
    }

    score += bonus;
    candidates.push({ code, index, score });
  }

  // Prefer HTML letter-spacing matches
  for (const m of html.matchAll(RE_LETTER_SPACING_4)) {
    push(m[1], m.index ?? 0, 6);
  }

  // Spaced matches
  for (const m of plain.matchAll(RE_SPACED4)) {
    const raw = m[1];
    const code = raw.replace(/\s+/g, '');
    push(code, m.index ?? 0, 1);
  }

  // Plain matches
  for (const m of plain.matchAll(RE_PLAIN4)) {
    push(m[1], m.index ?? 0, 0);
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => (b.score - a.score) || (a.index - b.index));
  return candidates[0].code;
}

/* =========================
   MAIN FUNCTION - Gmail Search
========================= */
async function searchNetflixEmailsGmail(userEmail) {
  const gmail = getGmailClient();

  try {
    // Last 15 minutes (exact check via internalDate)
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Query attempt #1 (fast)
    const fifteenMinutesAgoEpoch = Math.floor((Date.now() - 15 * 60 * 1000) / 1000);
    const query1 = [
      `from:netflix.com`,
      `to:${userEmail}`,
      `after:${fifteenMinutesAgoEpoch}`
    ].join(' ');

    console.log(`🔍 Gmail Query #1: ${query1}`);

    let listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query1,
      maxResults: 10
    });

    // Fallback query (compat): widen then filter by internalDate
    if (!listResponse.data.messages || listResponse.data.messages.length === 0) {
      const query2 = [
        `from:netflix.com`,
        `to:${userEmail}`,
        `newer_than:1d`
      ].join(' ');

      console.log(`🔍 Gmail Query #2 (fallback): ${query2}`);

      listResponse = await gmail.users.messages.list({
        userId: 'me',
        q: query2,
        maxResults: 10
      });
    }

    const messages = listResponse.data.messages;

    if (!messages || messages.length === 0) {
      console.log('❌ No Netflix emails found');
      return [];
    }

    console.log(`✓ Found ${messages.length} emails`);

    // Fetch full messages
    const emailPromises = messages.map(async (message) => {
      try {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });
        return fullMessage.data;
      } catch (error) {
        console.error(`Error fetching ${message.id}:`, error);
        return null;
      }
    });

    const fullMessages = (await Promise.all(emailPromises)).filter(Boolean);

    // Parse emails
    const parsedEmails = fullMessages.map(msg => {
      const headers = msg.payload?.headers || [];
      const getHeader = (name) =>
        headers.find(h => (h.name || '').toLowerCase() === name)?.value || '';

      const { htmlContent, textContent } = extractBodiesFromPayload(msg.payload);

      return {
        id: msg.id,
        subject: getHeader('subject'),
        from: getHeader('from'),
        to: getHeader('to'),
        date: new Date(getHeader('date')),
        receivedAt: new Date(parseInt(msg.internalDate, 10)),
        htmlContent,
        textContent
      };
    });

    // Sort newest first
    parsedEmails.sort((a, b) => b.receivedAt - a.receivedAt);

    // Exact time filter: last 15 minutes
    const recentEmails = parsedEmails.filter(email => email.receivedAt >= fifteenMinAgo);
    console.log(`${recentEmails.length} emails in last 15 minutes`);

    // Relevant if link patterns OR OTP found (OTP not returned)
    const relevantEmail = recentEmails.find(email => {
      const hasLink = isRelevantNetflixLinkEmail(email.htmlContent, email.textContent);
      const otp = findNetflixOtp4(email.htmlContent, email.textContent);

      if (hasLink) console.log(`✓ Relevant link: ${email.subject}`);
      if (otp) console.log(`✓ Found OTP (internal): ${otp}`);

      return hasLink || !!otp;
    });

    if (!relevantEmail) {
      console.log('❌ No relevant Netflix links/OTP found');
      return [];
    }

    const sanitizedHtml = await sanitizeAndStyleHtml(relevantEmail.htmlContent);

    // ✅ FINAL: Keep old response shape (NO otpCode field)
    return [{
      id: relevantEmail.id,
      subject: relevantEmail.subject,
      receivedAt: relevantEmail.receivedAt.toISOString(),
      from: relevantEmail.from,
      to: relevantEmail.to,
      rawHtml: sanitizedHtml
    }];

  } catch (error) {
    console.error('Gmail API Error:', error);
    throw error;
  }
}

/* =========================
   Error messages
========================= */
function getUserFriendlyError(error) {
  const msg = error?.message || error?.toString?.() || String(error);

  if (msg.includes('invalid_grant') || msg.includes('Token has been expired')) {
    return 'Gmail authentication expired. Please refresh the token.';
  }
  if (msg.includes('invalid_client')) {
    return 'Gmail API credentials are invalid.';
  }
  if (msg.includes('insufficient permission')) {
    return 'Insufficient Gmail permissions.';
  }
  if (msg.includes('quotaExceeded')) {
    return 'Gmail API quota exceeded. Try again later.';
  }
  if (msg.includes('ETIMEDOUT') || msg.includes('timeout')) {
    return 'Connection timeout. Please try again.';
  }

  return 'Something went wrong. Please try again.';
}

/* =========================
   Vercel Serverless Handler
========================= */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Please enter an email address to search.' });
  }

  if (!process.env.GOOGLE_CLIENT_ID ||
      !process.env.GOOGLE_CLIENT_SECRET ||
      !process.env.GOOGLE_REFRESH_TOKEN) {
    console.error('Missing Gmail API credentials');
    return res.status(500).json({ error: 'Gmail API is not configured.' });
  }

  console.log(`🔍 Searching for: ${email}`);
  const startTime = Date.now();

  try {
    const results = await searchNetflixEmailsGmail(email);
    const duration = Date.now() - startTime;

    console.log(`✅ Completed in ${duration}ms`);

    if (results && results.length > 0) {
      return res.status(200).json({
        emails: results,
        totalCount: results.length,
        searchTime: duration
      });
    }

    return res.status(404).json({
      error: 'No Netflix email found for this address in the last 15 minutes.',
      searchTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error after ${duration}ms:`, error);

    return res.status(500).json({
      error: getUserFriendlyError(error),
      searchTime: duration
    });
  }
}
