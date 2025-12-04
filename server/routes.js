import Imap from "imap";
import { simpleParser } from "mailparser";
import translatte from "translatte";

async function translateToEnglish(text) {
  if (!text || text.trim() === "") return text;
  
  try {
    console.log("Translating text (length:", text.length, ")");
    
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
    console.log("Translation result:", result.text ? result.text.substring(0, 100) + "..." : "empty");
    return result.text;
  } catch (error) {
    console.error("Translation error:", error.message);
    return text;
  }
}

function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  
  const trimmedUrl = url.trim();
  
  // Parse the URL first
  let urlObj;
  try {
    urlObj = new URL(trimmedUrl);
  } catch (e) {
    return null;
  }
  
  // Only allow http and https protocols using URL object's protocol property
  const protocol = urlObj.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return null;
  }
  
  // Decode the full URL to catch encoded dangerous protocols
  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(trimmedUrl.toLowerCase());
  } catch (e) {
    decodedUrl = trimmedUrl.toLowerCase();
  }
  
  // Block dangerous content even when encoded
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
  
  // Strict allowlist of Netflix domains using exact domain matching
  const hostname = urlObj.hostname.toLowerCase();
  const allowedDomains = [
    'netflix.com',
    'www.netflix.com',
    'nflxso.net',
    'www.nflxso.net',
    'email.netflix.com',
    'click.netflix.com',
  ];
  
  // Check for exact match or subdomain match
  const isAllowed = allowedDomains.some(domain => {
    return hostname === domain || hostname.endsWith('.' + domain);
  });
  
  if (!isAllowed) {
    return null;
  }
  
  return trimmedUrl;
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function translateHtmlContent(html) {
  if (!html || html.trim() === "") return html;
  
  // Step 1: Remove all dangerous elements completely
  let processedHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<\?xml[^>]*\?>/gi, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '');
  
  // Step 2: Extract all links with their content for CTA buttons
  const links = [];
  processedHtml = processedHtml.replace(/<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (match, url, content) => {
    const urlClean = url.replace(/&amp;/g, '&');
    const safeUrl = sanitizeUrl(urlClean);
    const textContent = content.replace(/<[^>]+>/g, '').trim();
    
    if (safeUrl && textContent) {
      const urlLower = urlClean.toLowerCase();
      // Check if this is a main action button
      const isMainAction = urlLower.includes('yesitwasme') || 
                           urlLower.includes('yes-it-was-me') ||
                           urlLower.includes('yes_it_was_me') ||
                           urlLower.includes('getcode') || 
                           urlLower.includes('get-code') ||
                           urlLower.includes('get_code') ||
                           urlLower.includes('travel') ||
                           urlLower.includes('temporary-access') ||
                           urlLower.includes('signout') ||
                           urlLower.includes('sign-out') ||
                           urlLower.includes('unknown');
      
      const placeholder = `___LINK_${links.length}___`;
      links.push({ placeholder, url: safeUrl, text: textContent, isMainAction });
      return placeholder;
    }
    return textContent || '';
  });
  
  // Step 3: Strip all remaining HTML tags and clean up text
  let textContent = processedHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#\d+;/gi, '')
    .replace(/&shy;/gi, '')
    .replace(/\u00AD/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
  
  // Step 4: Remove footer content
  const footerPatterns = [
    /we're here to help[\s\S]*/i,
    /visit the help center[\s\S]*/i,
    /the netflix team[\s\S]*/i,
    /this message was sent to[\s\S]*/i,
    /this message was mailed to[\s\S]*/i,
    /netflix international[\s\S]*/i,
    /need help\?[\s\S]*/i,
    /questions\?[\s\S]*/i,
    /do you have any questions[\s\S]*/i,
  ];
  
  for (const pattern of footerPatterns) {
    textContent = textContent.replace(pattern, '');
  }
  textContent = textContent.trim();
  
  // Step 5: Translate the text content
  let translatedContent = textContent;
  try {
    if (textContent.length > 0 && textContent.length < 10000) {
      translatedContent = await translateToEnglish(textContent);
    }
  } catch (e) {
    // Keep original on error
  }
  
  // Step 6: Translate and restore links
  for (const link of links) {
    let translatedText = link.text;
    try {
      translatedText = await translateToEnglish(link.text);
    } catch (e) {
      // Keep original on error
    }
    
    // Build the button/link HTML with Netflix styling
    const safeUrl = escapeHtml(link.url);
    const safeText = escapeHtml(translatedText);
    
    let buttonHtml;
    if (link.isMainAction) {
      // Main action buttons with Netflix red background and white text
      buttonHtml = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #E50914; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 600; margin: 8px 4px;">${safeText}</a>`;
    } else {
      // Secondary links with Netflix style (red border, no fill)
      buttonHtml = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; border: 2px solid #E50914; color: #E50914; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: 500; margin: 8px 4px;">${safeText}</a>`;
    }
    
    translatedContent = translatedContent.replace(link.placeholder, buttonHtml);
  }
  
  // Step 7: Format content as Netflix-styled HTML with dark theme
  const paragraphs = translatedContent
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p && p.length > 0 && !p.match(/^[\s\d\.,;:!?\-_=+*#@$%^&()[\]{}|\\/<>'"]+$/));
  
  let formattedHtml = '<div style="background-color: #141414; color: #ffffff; padding: 24px; font-family: \'Netflix Sans\', \'Helvetica Neue\', Helvetica, Arial, sans-serif; border-radius: 4px;">';
  
  for (const para of paragraphs) {
    // Check if paragraph contains a button link
    if (para.includes('<a href=')) {
      formattedHtml += `<div style="text-align: center; margin: 24px 0;">${para}</div>`;
    } else {
      // Regular paragraph - escape to prevent XSS
      const safePara = escapeHtml(para);
      formattedHtml += `<p style="margin-bottom: 16px; line-height: 1.6; color: #e5e5e5;">${safePara}</p>`;
    }
  }
  
  formattedHtml += '</div>';
  
  return formattedHtml;
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
      
      // Sanitize the URL first
      const safeUrl = sanitizeUrl(url);
      if (!safeUrl) {
        return plainText;
      }
      
      if (isMainActionLink(urlLower) && !seenUrls.has(urlLower)) {
        seenUrls.add(urlLower);
        const label = getLinkLabel(urlLower);
        const category = categorizeLinkType(urlLower);
        const placeholder = `___LINK_PLACEHOLDER_${placeholderIndex}___`;
        linkPlaceholders.push({
          placeholder,
          link: { type: "link", label, url: safeUrl, isMain: true, category }
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

function normalizeText(text) {
  return (text || "")
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
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
    "home"
  ];
  const hasKeyword = subjectKeywords.some(kw => subject.includes(kw));
  
  const hasLink = hasAccountLink(htmlContent);
  
  return hasKeyword && hasLink;
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

export async function registerRoutes(httpServer, app) {
  
  app.post("/api/findcode", async (req, res) => {
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
        res.json({ emails: results, totalCount: results.length });
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
  });

  return httpServer;
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

        imap.search(["ALL"], (err, results) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          if (!results || results.length === 0) {
            imap.end();
            return resolve([]);
          }

          const latestEmails = results.slice(-200);
          
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
            imap.end();
            reject(err);
          });

          fetch.once("end", async () => {
            try {
              const emails = await Promise.all(emailPromises);
              
              const userEmailLower = userEmail.toLowerCase().trim();
              
              const basicFilteredEmails = emails
                .filter((email) => email !== null)
                .filter((email) => {
                  const fromAddress = (email.from?.text || "").toLowerCase();
                  return fromAddress.includes("netflix");
                })
                .filter((email) => {
                  const toAddresses = (email.to?.text || "").toLowerCase();
                  const ccAddresses = (email.cc?.text || "").toLowerCase();
                  const subject = (email.subject || "").toLowerCase();
                  const textContent = (email.text || "").toLowerCase();
                  const htmlContent = (email.html || "").toLowerCase();
                  
                  return (
                    toAddresses.includes(userEmailLower) ||
                    ccAddresses.includes(userEmailLower) ||
                    subject.includes(userEmailLower) ||
                    textContent.includes(userEmailLower) ||
                    htmlContent.includes(userEmailLower)
                  );
                });

              const sortedEmails = basicFilteredEmails.sort((a, b) => new Date(b.date) - new Date(a.date));

              imap.end();

              let householdEmail = null;
              
              for (const email of sortedEmails) {
                const subject = email.subject || "";
                const htmlContent = email.html || "";
                
                const translatedSubject = await translateToEnglish(subject);
                
                if (isHouseholdEmail(translatedSubject, htmlContent)) {
                  householdEmail = email;
                  break;
                }
              }

              if (!householdEmail) {
                resolve([]);
                return;
              }

              const htmlContent = householdEmail.html || "";
              const textContent = householdEmail.text || "";
              const combinedContent = textContent + " " + htmlContent;
              
              const translatedSubject = await translateToEnglish(householdEmail.subject || "Email");
              const contentSegments = await processContentWithLinks(htmlContent, textContent);
              const accessCode = extractAccessCode(combinedContent);
              
              let translatedHtml = htmlContent;
              try {
                translatedHtml = await translateHtmlContent(htmlContent);
              } catch (e) {
                console.log("HTML Translation error:", e);
                translatedHtml = htmlContent;
              }
              
              const formattedEmail = {
                id: householdEmail.messageId || `${Date.now()}-${Math.random()}`,
                subject: translatedSubject,
                receivedAt: householdEmail.date ? householdEmail.date.toISOString() : new Date().toISOString(),
                from: householdEmail.from?.text || "",
                to: householdEmail.to?.text || "",
                contentSegments: contentSegments,
                accessCode: accessCode,
                rawHtml: translatedHtml,
              };

              resolve([formattedEmail]);
            } catch (parseError) {
              imap.end();
              reject(parseError);
            }
          });
        });
      });
    });

    imap.once("error", (err) => {
      reject(err);
    });

    imap.connect();
  });
}
