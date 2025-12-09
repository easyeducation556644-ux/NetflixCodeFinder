import Imap from "imap";
import { simpleParser } from "mailparser";
import translatte from "translatte";

function escapeHtml(text) {
if (!text) return '';
return text
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&#39;');
}

function sanitizeUrl(url) {
if (!url || typeof url !== 'string') return null;

const trimmedUrl = url.trim();

let urlObj;
try {
urlObj = new URL(trimmedUrl);
} catch (e) {
return null;
}

const protocol = urlObj.protocol.toLowerCase();
if (protocol !== 'http:' && protocol !== 'https:') {
return null;
}

let decodedUrl;
try {
decodedUrl = decodeURIComponent(trimmedUrl.toLowerCase());
} catch (e) {
decodedUrl = trimmedUrl.toLowerCase();
}

const dangerousPatterns = [
'javascript:',
'data:',
'vbscript:',
'<script',
'onerror',
'onclick',
'onload',
'onmouseover',
];

for (const pattern of dangerousPatterns) {
if (decodedUrl.includes(pattern)) {
return null;
}
}

const hostname = urlObj.hostname.toLowerCase();
const allowedDomains = [
'netflix.com',
'www.netflix.com',
'nflxso.net',
'www.nflxso.net',
'email.netflix.com',
'click.netflix.com',
];

const isAllowed = allowedDomains.some(domain => {
return hostname === domain || hostname.endsWith('.' + domain);
});

if (!isAllowed) {
return null;
}

return trimmedUrl;
}

async function translateToEnglish(text) {
if (!text || text.trim() === "") return text;

try {
if (text.length > 3000) {
const chunks = [];
const sentences = text.split(/(?<=[.!?])\s+/);
let currentChunk = "";

for (const sentence of sentences) {
if ((currentChunk + sentence).length > 2000) {
if (currentChunk) chunks.push(currentChunk.trim());
currentChunk = sentence;
} else {
currentChunk += " " + sentence;
}
}
if (currentChunk) chunks.push(currentChunk.trim());

const translatedChunks = [];
for (const chunk of chunks) {
try {
const result = await translatte(chunk, { to: "en" });
translatedChunks.push(result.text);
} catch (e) {
translatedChunks.push(chunk);
}
}
return translatedChunks.join(" ");
}

const result = await translatte(text, { to: "en" });
return result.text;
} catch (error) {
return text;
}
}

async function translateHtmlContentPreserveOriginal(html) {
if (!html || html.trim() === "") return html;

let processedHtml = html
.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

const textToTranslate = [];
let textIndex = 0;

processedHtml = processedHtml.replace(/>([^<]+)</g, (match, text) => {
const trimmedText = text.trim();
if (trimmedText && trimmedText.length > 1 && !/^[\s\d\.,;:!?\-_=+*#@$%^&()[\]{}|\\/<>'"&nbsp;]+$/.test(trimmedText)) {
const placeholder = `>___TEXT_${textIndex}___<`;
textToTranslate.push({ index: textIndex, text: trimmedText });
textIndex++;
return placeholder;
}
return match;
});

for (const item of textToTranslate) {
try {
const translated = await translateToEnglish(item.text);
item.translated = translated;
} catch (e) {
item.translated = item.text;
}
}

for (const item of textToTranslate) {
processedHtml = processedHtml.replace(`>___TEXT_${item.index}___<`, `>${escapeHtml(item.translated)}<`);
}

processedHtml = processedHtml.replace(/<a([^>]*href\s*=\s*["']([^"']+)["'][^>]*)>/gi, (match, attrs, url) => {
const urlClean = url.replace(/&amp;/g, '&').toLowerCase();
const safeUrl = sanitizeUrl(url.replace(/&amp;/g, '&'));

if (!safeUrl) {
return match;
}

const isYesItsMe = urlClean.includes('yesitwasme') || 
urlClean.includes('yes-it-was-me') ||
urlClean.includes('yes_it_was_me');

const isGetCode = urlClean.includes('travel') && urlClean.includes('temporary');

if (isYesItsMe || isGetCode) {
let newAttrs = attrs;
if (attrs.includes('style=')) {
newAttrs = attrs.replace(/style\s*=\s*["']([^"']*)["']/i, (m, styles) => {
return `style="${styles}; color: #ffffff !important;"`;
});
} else {
newAttrs = attrs + ' style="color: #ffffff !important;"';
}
return `<a${newAttrs} target="_blank" rel="noopener noreferrer">`;
}

return `<a${attrs} target="_blank" rel="noopener noreferrer">`;
});

const wrappedHtml = `<div class="netflix-email-original">${processedHtml}</div>`;

return wrappedHtml;
}

function getLinkLabel(url) {
const urlLower = url.toLowerCase();

if (urlLower.includes("yesitwasme") || urlLower.includes("yes-it-was-me") || urlLower.includes("yes_it_was_me")) {
return "Yes, It Was Me";
} else if (urlLower.includes("notme") || urlLower.includes("not-me") || urlLower.includes("not_me") || urlLower.includes("wasntme")) {
return "No, It Wasn't Me";
} else if (urlLower.includes("travel") || urlLower.includes("temporary-access") || urlLower.includes("getcode") || urlLower.includes("get-code")) {
return "Get Code";
} else if (urlLower.includes("password") || urlLower.includes("reset")) {
return "Change Password";
} else if (urlLower.includes("device") || urlLower.includes("signout") || urlLower.includes("sign-out") || urlLower.includes("manage")) {
return "Manage Devices";
} else if (urlLower.includes("verify") || urlLower.includes("confirm")) {
return "Verify";
} else if (urlLower.includes("loginhelp") || urlLower.includes("login-help")) {
return "Login Help";
} else if (urlLower.includes("/account")) {
return "Get Code";
}
return "Get Code";
}

function categorizeLinkType(url) {
const urlLower = url.toLowerCase();

if (urlLower.includes("travel") || urlLower.includes("temporary") || urlLower.includes("getcode") || urlLower.includes("get-code")) {
return "getCode";
} else if (urlLower.includes("password") || urlLower.includes("reset")) {
return "resetPassword";
} else if (urlLower.includes("device") || urlLower.includes("signout") || urlLower.includes("sign-out") || urlLower.includes("manage") || urlLower.includes("/account")) {
return "manageDevices";
} else if (urlLower.includes("yesitwasme") || urlLower.includes("yes-it-was-me")) {
return "yesItWasMe";
} else if (urlLower.includes("notme") || urlLower.includes("not-me")) {
return "notMe";
}
return "other";
}

function isMainActionLink(url) {
const urlLower = url.toLowerCase();

const promotionalPatterns = [
/browse/i,
/title/i,
/watch/i,
/latest/i,
/tudum/i,
/about/i,
/jobs/i,
/legal/i,
/privacy/i,
/terms/i,
/help\.netflix/i,
/media\.netflix/i,
/unsubscribe/i,
/mailto:/i,
/notification/i,
/settings/i,
];

for (const pattern of promotionalPatterns) {
if (pattern.test(urlLower)) {
return false;
}
}

const mainActionKeywords = [
'yesitwasme',
'yes-it-was-me',
'yes_it_was_me',
'notme',
'not-me',
'not_me',
'wasntme',
'travel',
'temporary',
'getcode',
'get-code',
'get_code',
'account/travel',
'account/update',
'account/confirm',
'account/verify',
'password',
'loginhelp',
'login-help',
'dnr',
'nflink',
'/e/',
'accountaccess',
'verify',
'confirm',
'reset',
'signin',
'sign-in',
'activate',
'action',
'click.',
'email.netflix',
];

for (const keyword of mainActionKeywords) {
if (urlLower.includes(keyword)) {
return true;
}
}

return false;
}

function extractTempLink(text) {
const match = text.match(/https:\/\/www\.netflix\.com\/account\S+/i);
return match ? match[0] : null;
}

function hasAccountLink(htmlContent) {
return /netflix\.com\/account/i.test(htmlContent);
}

function isHouseholdEmail(translatedSubject, htmlContent) {
const subject = (translatedSubject || "").toLowerCase();

const subjectKeywords = [
"temporary",
"household", 
"temp",
"home",
"access",
"code",
"verify"
];

const hasKeyword = subjectKeywords.some(kw => subject.includes(kw));
const hasLink = hasAccountLink(htmlContent);

console.log('isHouseholdEmail check:', {
subject: subject,
hasKeyword: hasKeyword,
hasLink: hasLink
});

return hasKeyword && hasLink;
}

async function processContentWithLinks(html, text) {
const seenUrls = new Set();
const linkPlaceholders = [];
let placeholderIndex = 0;

const footerPatterns = [
/we're here to help/i,
/visit the help center/i,
/the netflix team/i,
/questions\?/i,
/this message was mailed to/i,
/this message was sent to/i,
/netflix international/i,
/notification settings/i,
/terms of use/i,
/privacy/i,
/help center netflix/i,
/netflix entretenimento/i,
/netflix m[eé]xico/i,
/netflix dream/i,
/customer center/i,
/please check the page/i,
/for more detailed information/i,
/contact our/i,
/need help\??/i,
/it's also good/i,
/src:/i,
/s\. de r\.l\./i,
/do you have any questions/i,
];

let processedHtml = html || "";

if (processedHtml) {
processedHtml = processedHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
processedHtml = processedHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

const linkRegex = /<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

processedHtml = processedHtml.replace(linkRegex, (match, url, linkContent) => {
url = url.replace(/&amp;/g, "&");
const urlLower = url.toLowerCase();

const plainText = linkContent.replace(/<[^>]+>/g, '').trim();

if (urlLower.includes("unsubscribe") || urlLower.includes("mailto:") || urlLower.includes("help.netflix") || urlLower.includes("notification") || urlLower.includes("privacy") || urlLower.includes("terms") || urlLower.includes("legal")) {
return plainText;
}

const isNetflixUrl = urlLower.includes("netflix.com") || urlLower.includes("netflix") || urlLower.includes("nflx");

if (isNetflixUrl && isMainActionLink(urlLower) && !seenUrls.has(urlLower)) {
seenUrls.add(urlLower);
const label = getLinkLabel(urlLower);
const category = categorizeLinkType(urlLower);
const placeholder = `___LINK_PLACEHOLDER_${placeholderIndex}___`;
linkPlaceholders.push({
placeholder,
link: { type: "link", label, url, isMain: true, category }
});
placeholderIndex++;
return `\n${placeholder}\n`;
}

return plainText;
});

processedHtml = processedHtml.replace(/<br\s*\/?>/gi, "\n");
processedHtml = processedHtml.replace(/<\/p>/gi, "\n\n");
processedHtml = processedHtml.replace(/<\/div>/gi, "\n");
processedHtml = processedHtml.replace(/<\/tr>/gi, "\n");
processedHtml = processedHtml.replace(/<[^>]+>/g, " ");
processedHtml = processedHtml.replace(/&shy;/gi, "");
processedHtml = processedHtml.replace(/\u00AD/g, "");
processedHtml = processedHtml.replace(/&#173;/gi, "");
processedHtml = processedHtml.replace(/&#x00AD;/gi, "");
processedHtml = processedHtml.replace(/&nbsp;/gi, " ");
processedHtml = processedHtml.replace(/&amp;/gi, "&");
processedHtml = processedHtml.replace(/&lt;/gi, "<");
processedHtml = processedHtml.replace(/&gt;/gi, ">");
processedHtml = processedHtml.replace(/&quot;/gi, '"');
processedHtml = processedHtml.replace(/&#39;/gi, "'");
processedHtml = processedHtml.replace(/&#x27;/gi, "'");
processedHtml = processedHtml.replace(/&#\d+;/gi, "");
}

let content = processedHtml || text || "";

content = content.replace(/https?:\/\/[^\s]+/gi, "");
content = content.replace(/[ \t]+/g, " ");
content = content.replace(/\n\s*\n\s*\n/g, "\n\n");
content = content.trim();

const lines = content.split('\n');
let cutoffIndex = lines.length;

for (let i = 0; i < lines.length; i++) {
const line = lines[i].toLowerCase();
if (line.includes("___link_placeholder_")) continue;
for (const pattern of footerPatterns) {
if (pattern.test(line)) {
cutoffIndex = i;
break;
}
}
if (cutoffIndex !== lines.length) break;
}

const cleanedLines = lines.slice(0, cutoffIndex)
.filter(line => line.trim())
.filter(line => !line.trim().match(/^\[+$/))
.filter(line => !line.trim().match(/^\]+$/))
.filter(line => line.trim() !== '[')
.filter(line => line.trim() !== ']');
const cleanedContent = cleanedLines.join('\n').trim();

const segments = [];

if (linkPlaceholders.length === 0) {
if (cleanedContent) {
const translated = await translateToEnglish(cleanedContent);
segments.push({ type: "text", value: translated });
}
return segments;
}

const placeholderRegex = /___LINK_PLACEHOLDER_(\d+)___/g;
let lastIndex = 0;
let match;
const contentParts = [];

while ((match = placeholderRegex.exec(cleanedContent)) !== null) {
if (match.index > lastIndex) {
const textBefore = cleanedContent.slice(lastIndex, match.index).trim();
if (textBefore) {
contentParts.push({ type: "text", value: textBefore });
}
}
const linkIndex = parseInt(match[1], 10);
const linkData = linkPlaceholders.find(p => p.placeholder === match[0]);
if (linkData) {
contentParts.push({ type: "button", link: linkData.link });
}
lastIndex = match.index + match[0].length;
}

if (lastIndex < cleanedContent.length) {
const textAfter = cleanedContent.slice(lastIndex).trim();
if (textAfter) {
contentParts.push({ type: "text", value: textAfter });
}
}

for (const part of contentParts) {
if (part.type === "text") {
const translated = await translateToEnglish(part.value);
segments.push({ type: "text", value: translated });
} else if (part.type === "button") {
segments.push({ type: "buttons", buttons: [part.link] });
}
}

return segments;
}

function extractAccessCode(content) {
const codePatterns = [
/\b(\d{4})\b/,
/code[:\s]+(\d{4})/i,
/verification[:\s]+(\d{4})/i,
];

for (const pattern of codePatterns) {
const match = content.match(pattern);
if (match) {
return match[1];
}
}
return null;
}

function getUserFriendlyError(error) {
const errorMessage = error.message || error.toString();

if (errorMessage.includes("AUTHENTICATIONFAILED") || errorMessage.includes("Invalid credentials")) {
return "Email login failed. The email or password may be incorrect.";
}
if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("getaddrinfo")) {
return "Could not connect to email server. Please check your internet connection.";
}
if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("timeout")) {
return "Connection timed out. Please try again.";
}
if (errorMessage.includes("ECONNREFUSED")) {
return "Connection refused by email server. Please try again later.";
}
if (errorMessage.includes("certificate")) {
return "Security certificate error. Please contact support.";
}

return "Something went wrong while searching emails. Please try again.";
}

function searchNetflixEmails(imapConfig, userEmail) {
return new Promise((resolve, reject) => {
const imap = new Imap(imapConfig);

imap.once("ready", () => {
imap.openBox("INBOX", true, (err, box) => {
if (err) {
imap.end();
return reject(err);
}

// 1 day ago (Python bot style - faster and efficient)
const oneDayAgo = new Date();
oneDayAgo.setDate(oneDayAgo.getDate() - 1);

console.log('Searching emails since:', oneDayAgo.toISOString());
console.log('User email:', userEmail);

// Python style: SINCE date filter + FROM netflix
imap.search([
['SINCE', oneDayAgo],
['FROM', 'netflix']
], (err, results) => {
if (err) {
console.error('IMAP search error:', err);
imap.end();
return reject(err);
}

console.log('Total Netflix emails found:', results ? results.length : 0);

if (!results || results.length === 0) {
imap.end();
return resolve([]);
}

// Get last 200 emails (latest first)
const latestEmails = results.slice(-200);
console.log('Fetching latest', latestEmails.length, 'emails');

const fetch = imap.fetch(latestEmails, { bodies: "", struct: true });
const emailPromises = [];

fetch.on("message", (msg, seqno) => {
const emailPromise = new Promise((resolveEmail) => {
let emailData = null;

msg.on("body", (stream, info) => {
simpleParser(stream, (err, parsed) => {
if (err) {
resolveEmail(null);
return;
}
emailData = parsed;
});
});

msg.once("end", () => {
setTimeout(() => resolveEmail(emailData), 100);
});
});
emailPromises.push(emailPromise);
});

fetch.once("error", (err) => {
console.error('Fetch error:', err);
imap.end();
reject(err);
});

fetch.once("end", async () => {
try {
const emails = await Promise.all(emailPromises);
const validEmails = emails.filter(e => e !== null);
console.log('Total emails parsed:', validEmails.length);

// Python style: Group by recipient
const groupedByRecipient = {};
for (const email of validEmails) {
if (email.to && email.to.text) {
const recipient = email.to.text.toLowerCase();
if (!groupedByRecipient[recipient]) {
groupedByRecipient[recipient] = [];
}
groupedByRecipient[recipient].push(email);
}
}

const userEmailLower = userEmail.toLowerCase().trim();
const userEmails = groupedByRecipient[userEmailLower] || [];

console.log('Emails for user', userEmailLower, ':', userEmails.length);

if (userEmails.length === 0) {
console.log('No emails found for this user address');
console.log('Available recipients:', Object.keys(groupedByRecipient).slice(0, 5));
}

// Sort by date (newest first)
const sortedEmails = userEmails.sort((a, b) => new Date(b.date) - new Date(a.date));

imap.end();

let householdEmail = null;

// Python fuzzy matching approach
for (const email of sortedEmails) {
const subject = email.subject || "";
const htmlContent = email.html || "";
const textContent = email.text || "";

console.log('Checking email:', {
subject: subject.substring(0, 60),
date: email.date ? new Date(email.date).toISOString() : 'no date'
});

// Translation (Python style)
let translatedSubject = subject;
try {
translatedSubject = await translateToEnglish(subject);
if (translatedSubject !== subject) {
console.log('Translated:', translatedSubject.substring(0, 60));
}
} catch (e) {
console.log('Translation failed, using original');
}

// Python TEMP_KEYWORDS + fuzzy matching
if (isHouseholdEmailFuzzy(translatedSubject, subject, htmlContent, textContent)) {
householdEmail = email;
console.log('Found household email!');
break;
}
}

if (!householdEmail) {
console.log('No household email found');
console.log('Checked', sortedEmails.length, 'user emails');

// Debug: First 3 subjects
if (sortedEmails.length > 0) {
console.log('First 3 email subjects:');
sortedEmails.slice(0, 3).forEach((e, i) => {
console.log(`${i + 1}. ${e.subject}`);
});
}

resolve([]);
return;
}

const htmlContent = householdEmail.html || "";
const translatedSubject = await translateToEnglish(householdEmail.subject || "Email");

let translatedHtml = htmlContent;
try {
translatedHtml = await translateHtmlContentPreserveOriginal(htmlContent);
} catch (e) {
console.error('HTML translation error:', e);
translatedHtml = htmlContent;
}

const formattedEmail = {
id: householdEmail.messageId || `${Date.now()}-${Math.random()}`,
subject: translatedSubject,
receivedAt: householdEmail.date ? householdEmail.date.toISOString() : new Date().toISOString(),
from: householdEmail.from?.text || "",
to: householdEmail.to?.text || "",
rawHtml: translatedHtml,
};

console.log('Returning email:', formattedEmail.subject);
resolve([formattedEmail]);
} catch (parseError) {
console.error('Parse error:', parseError);
imap.end();
reject(parseError);
}
});
});
});
});

imap.once("error", (err) => {
console.error('IMAP connection error:', err);
reject(err);
});

imap.connect();
});
}

// Python bot fuzzy matching approach
function isHouseholdEmailFuzzy(translatedSubject, originalSubject, htmlContent, textContent) {
const translatedLower = (translatedSubject || "").toLowerCase();
const originalLower = (originalSubject || "").toLowerCase();
const htmlLower = (htmlContent || "").toLowerCase();
const textLower = (textContent || "").toLowerCase();

// Python TEMP_KEYWORDS
const tempKeywords = [
"temporary",
"household",
"temp",
"home",
"traveling",
"travel",
"access"
];

// Check keyword in translated subject
const hasKeywordInTranslated = tempKeywords.some(kw => translatedLower.includes(kw));

// Also check original subject (in case translation failed)
const hasKeywordInOriginal = tempKeywords.some(kw => originalLower.includes(kw));

// Netflix account link check
const hasAccountLinkCheck = 
htmlLower.includes("netflix.com/account") || 
textLower.includes("netflix.com/account") ||
/netflix\.com\/account/i.test(htmlContent) ||
/netflix\.com\/account/i.test(textContent);

const matched = (hasKeywordInTranslated || hasKeywordInOriginal) && hasAccountLinkCheck;

if (matched) {
console.log('Match found:', {
hasKeywordInTranslated,
hasKeywordInOriginal,
hasAccountLink: hasAccountLinkCheck,
matchedKeyword: tempKeywords.find(kw => 
translatedLower.includes(kw) || originalLower.includes(kw)
)
});
}

return matched;
}

export default async function handler(req, res) {
if (req.method !== "POST") {
return res.status(405).json({ error: "Method not allowed" });
}

const { email } = req.body;

if (!email) {
return res.status(400).json({ error: "Please enter an email address to search." });
}

const imapConfig = {
user: process.env.EMAIL_ADDRESS,
password: process.env.EMAIL_PASSWORD,
host: process.env.EMAIL_SERVER || "imap.gmail.com",
port: parseInt(process.env.EMAIL_PORT || "993", 10),
tls: process.env.EMAIL_TLS !== "false",
tlsOptions: { rejectUnauthorized: false },
};

if (!imapConfig.user || !imapConfig.password) {
return res.status(500).json({ 
error: "Email service is not configured. Please contact the administrator." 
});
}

try {
const results = await searchNetflixEmails(imapConfig, email);
if (results && results.length > 0) {
res.status(200).json({ emails: results, totalCount: results.length });
} else {
res.status(404).json({ 
error: "No Netflix email found for this address." 
});
}
} catch (error) {
res.status(500).json({ 
error: getUserFriendlyError(error)
});
}
}
