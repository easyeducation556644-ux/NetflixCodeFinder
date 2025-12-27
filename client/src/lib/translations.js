// UI translations for supported languages
export const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "sk", name: "Slovenčina", flag: "🇸🇰" },
  { code: "ro", name: "Română", flag: "🇷🇴" },
  { code: "zh", name: "简体中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "bn", name: "Bengali", flag: "🇧🇩" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" }
];

const translations = {
  en: {
    title: "CODE GETTER",
    subtitle: "Netflix Household Access & Temporary Codes",
    findLatestEmail: "Find Your Household or Temporary mail",
    enterEmailDescription: "Enter the email to search for the latest Netflix email",
    enterNetflixEmail: "Enter Netflix Email",
    emailPlaceholder: "user@example.com",
    findCode: "Find Code",
    searching: "Searching...",
    emailFound: "Email Found",
    foundLatestEmail: "Found the latest Netflix email.",
    latestNetflixEmail: "Latest Netflix email",
    showsLatestOnly: "Shows the latest Netflix email only",
    searchFailed: "Search Failed",
    noContent: "No content available",
    validEmailError: "Please enter a valid email address.",
    guide: {
      welcome: "【Netflix】 How to Fix \"This Device Is Not Part of This Netflix Household\" Issue",
      welcomeSubtitle: "If your TV or device shows the message \"This device is not part of this account's Netflix household,\" follow these steps to regain access:",
      partATitle: "A. Only the \"Update Netflix Household\" button is displayed",
      partAStep1: "1. Click \"Update Netflix Household\"\nOn the prompt page, select the \"Update Netflix Household\" button and continue by choosing \"Update my Netflix household\" on the next page.",
      partAStep2: "2. Click \"Send Email\"\nSelect the \"Send Email\" button, and Netflix will send a verification email to your registered email address.",
      partAStep3: "3. Click next\nEnter Netflix email address. Click \"Find Code\". You get receive email approve your device.",
      partAStep4: "4. Complete the Update for Your Netflix Household\nGo back to the Netflix page and click \"Update your Netflix household\". After updating, your device will regain access.",
      partBTitle: "B. If You See the \"I’m Traveling\" or \"Watch Temporarily\" Button",
      partBStep1: "1. Select \"I’m Traveling\" or \"Watch Temporarily\"\nOn the prompt screen, choose either \"I’m Traveling\" or \"Watch Temporarily\" to proceed.",
      partBStep2: "2. Click the \"Send Email\" Button\nOn your device, select \"Send Email\". A temporary access code will be sent to your email.",
      partBStep3: "3. Click next\nEnter Netflix email address. Click \"Find Code\". This process may take 1-3 minutes. You get receive mail click \"Get Code\".",
      partBStep4: "4. Retrieve and Enter the Verification Code\nIf you receive a code, enter it directly into your device to restore access.",
      troubleshootingTitle: "Still unable to obtain the verification link after following the process?",
      troubleshootingMethod1: "Try these two methods:\nChange networks (Suggested✅)\nLog out of your account\nRestart the TV router (you will get a new IP address)\nLog in again",
      troubleshootingMethod2: "Or change devices\nEach device can obtain the link a maximum of 4 times within 24 hours\n😊Then try to obtain the verification link again.\nOn your Netflix: Click \"I'm Traveling\" or \"Watch Temporarily\" > \"Send email\"",
      troubleshootingFooter: "If these methods still do not work, please temporarily use a web browser to log in and watch, and attempt to retrieve the verification link again after 24 hours.\nIs your device indicating that you can no longer request codes?\nPlease request the code again after changing devices, as each device can obtain the link a maximum of four times within 24 hours.\nIf you still cannot obtain it, you can temporarily use a web browser to log in and watch.",
      gotIt: "Got It, Let's Start!",
      backToGuide: "View Instructions"
    }
  },
  bn: {
    title: "CODE GETTER",
    subtitle: "Netflix হাউসহোল্ড অ্যাক্সেস ও টেম্পোরারি কোড",
    findLatestEmail: "আপনার হাউসহোল্ড বা টেম্পোরারি মেইল খুঁজুন",
    enterEmailDescription: "সর্বশেষ Netflix ইমেইল খুঁজতে ইমেইল লিখুন",
    enterNetflixEmail: "Netflix ইমেইল লিখুন",
    emailPlaceholder: "user@example.com",
    findCode: "কোড খুঁজুন",
    searching: "খোঁজা হচ্ছে...",
    emailFound: "ইমেইল পাওয়া গেছে",
    foundLatestEmail: "সর্বশেষ Netflix ইমেইল পাওয়া গেছে।",
    latestNetflixEmail: "সর্বশেষ Netflix ইমেইল",
    showsLatestOnly: "শুধুমাত্র সর্বশেষ Netflix ইমেইল দেখায়",
    searchFailed: "অনুসন্ধান ব্যর্থ",
    noContent: "কোনো কন্টেন্ট নেই",
    validEmailError: "অনুগ্রহ করে একটি বৈধ ইমেইল ঠিকানা লিখুন।",
    guide: {
      welcome: "【Netflix】 \"This Device Is Not Part of This Netflix Household\" সমস্যাটি যেভাবে সমাধান করবেন",
      welcomeSubtitle: "আপনার টিভি বা ডিভাইসে যদি \"This device is not part of this account's Netflix household\" মেসেজটি আসে, তবে নিচের ধাপগুলো অনুসরণ করুন:",
      partATitle: "A. শুধুমাত্র \"Update Netflix Household\" বাটনটি দেখা গেলে",
      partAStep1: "১. \"Update Netflix Household\" এ ক্লিক করুন\nপ্রম্পট পেজে \"Update Netflix Household\" বাটনটি সিলেক্ট করুন এবং পরবর্তী পেজে \"Update my Netflix household\" পছন্দ করে এগিয়ে যান।",
      partAStep2: "২. \"Send Email\" এ ক্লিক করুন\n\"Send Email\" বাটনটি সিলেক্ট করুন, এবং Netflix আপনার নিবন্ধিত ইমেইল ঠিকানায় একটি ভেরিফিকেশন ইমেইল পাঠাবে।",
      partAStep3: "৩. Click next\nআপনার Netflix ইমেইল লিখে \"Find Code\" এ ক্লিক করুন। আপনি একটি ইমেইল পাবেন যা আপনার ডিভাইসটি অ্যাপ্রুভ করবে।",
      partAStep4: "৪. আপনার Netflix হাউসহোল্ড আপডেট সম্পন্ন করুন\nNetflix পেজে ফিরে যান এবং \"Update your Netflix household\" এ ক্লিক করুন। আপডেটের পর আপনার ডিভাইসটি পুনরায় অ্যাক্সেস পাবে।",
      partBTitle: "B. যদি আপনি \"I’m Traveling\" বা \"Watch Temporarily\" বাটনটি দেখেন",
      partBStep1: "১. \"I’m Traveling\" অথবা \"Watch Temporarily\" সিলেক্ট করুন\nপ্রম্পট স্ক্রিনে \"I’m Traveling\" অথবা \"Watch Temporarily\" পছন্দ করে এগিয়ে যান।",
      partBStep2: "২. \"Send Email\" বাটন ক্লিক করুন\nআপনার ডিভাইসে \"Send Email\" সিলেক্ট করুন। আপনার ইমেইলে একটি সাময়িক অ্যাক্সেস কোড পাঠানো হবে।",
      partBStep3: "৩. Click next\nআপনার Netflix ইমেইল লিখে \"Find Code\" এ ক্লিক করুন। এই প্রক্রিয়াটি ১-৩ মিনিট সময় নিতে পারে। আপনি একটি মেইল পাবেন, সেখানে \"Get Code\" এ ক্লিক করুন।",
      partBStep4: "৪. ভেরিফিকেশন কোডটি সংগ্রহ করুন এবং এন্টার করুন\nআপনি যদি একটি কোড পান, তবে অ্যাক্সেস ফিরে পেতে এটি সরাসরি আপনার ডিভাইসে এন্টার করুন।",
      troubleshootingTitle: "উপরের প্রক্রিয়াগুলো অনুসরণ করার পরেও ভেরিফিকেশন লিঙ্ক পাচ্ছেন না?",
      troubleshootingMethod1: "এই দুটি পদ্ধতি চেষ্টা করুন:\nনেটওয়ার্ক পরিবর্তন করুন (Suggested✅)\nআপনার অ্যাকাউন্ট থেকে লগ আউট করুন\nটিভি রাউটার রিস্টার্ট দিন (আপনি একটি নতুন আইপি পাবেন)\nআবার লগ ইন করুন",
      troubleshootingMethod2: "অথবা ডিভাইস পরিবর্তন করুন\nপ্রতিটি ডিভাইস ২৪ ঘণ্টার মধ্যে সর্বোচ্চ ৪ বার লিঙ্ক পেতে পারে\n😊তারপর আবার ভেরিফিকেশন লিঙ্ক পাওয়ার চেষ্টা করুন।\nআপনার Netflix-এ: \"I'm Traveling\" বা \"Watch Temporarily\" > \"Send email\" এ ক্লিক করুন।",
      troubleshootingFooter: "যদি এই পদ্ধতিগুলো কাজ না করে, তবে সাময়িকভাবে দেখার জন্য ওয়েব ব্রাউজার ব্যবহার করুন এবং ২৪ ঘণ্টা পর আবার চেষ্টা করুন।\nআপনার ডিভাইস কি দেখাচ্ছে যে আপনি আর কোড অনুরোধ করতে পারবেন না?\nদয়া করে অন্য ডিভাইস ব্যবহার করে আবার কোড অনুরোধ করুন।\nযদি তাও কাজ না করে, তবে সাময়িকভাবে ওয়েব ব্রাউজার ব্যবহার করুন।",
      gotIt: "বুঝতে পেরেছি, শুরু করি!",
      backToGuide: "নির্দেশিকা দেখুন"
    }
  },
  es: {
    title: "CODE GETTER",
    subtitle: "Acceso Hogar de Netflix y Códigos Temporales",
    findLatestEmail: "Encuentra tu correo de Hogar o Temporal",
    enterEmailDescription: "Ingresa el correo para buscar el último email de Netflix",
    enterNetflixEmail: "Ingresa Correo de Netflix",
    emailPlaceholder: "user@example.com",
    findCode: "Buscar Código",
    searching: "Buscando...",
    emailFound: "Correo Encontrado",
    foundLatestEmail: "Se encontró el último correo de Netflix.",
    latestNetflixEmail: "Último correo de Netflix",
    showsLatestOnly: "Muestra solo el último correo de Netflix",
    searchFailed: "Búsqueda Fallida",
    noContent: "Sin contenido disponible",
    validEmailError: "Por favor ingresa una dirección de correo válida.",
    guide: {
      welcome: "【Netflix】 Cómo solucionar el problema \"Este dispositivo no forma parte de tu hogar Netflix\"",
      welcomeSubtitle: "Si tu TV o dispositivo muestra el mensaje \"Este dispositivo no forma parte del hogar Netflix de esta cuenta\", sigue estos pasos para recuperar el acceso:",
      partATitle: "A. Solo se muestra el botón \"Actualizar hogar Netflix\"",
      partAStep1: "1. Haz clic en \"Actualizar hogar Netflix\"\nEn la página de aviso, selecciona el botón \"Actualizar hogar Netflix\" y continúa eligiendo \"Actualizar mi hogar Netflix\" en la página siguiente.",
      partAStep2: "2. Haz clic en \"Enviar correo\"\nSelecciona el botón \"Enviar correo\" y Netflix enviará un correo de verificación a tu dirección registrada.",
      partAStep3: "3. Click next\nIngresa el correo de Netflix. Haz clic en \"Buscar código\". Recibirás un correo para aprobar tu dispositivo.",
      partAStep4: "4. Completa la actualización de tu hogar Netflix\nVuelve a la página de Netflix y haz clic en \"Actualizar tu hogar Netflix\". Después de actualizar, tu dispositivo recuperará el acceso.",
      partBTitle: "B. Si ves el botón \"Estoy de viaje\" o \"Ver temporalmente\"",
      partBStep1: "1. Selecciona \"Estoy de viaje\" o \"Ver temporalmente\"\nEn la pantalla de aviso, elige \"Estoy de viaje\" o \"Ver temporalmente\" para proceder.",
      partBStep2: "2. Haz clic en el botón \"Enviar correo\"\nEn tu dispositivo, selecciona \"Enviar correo\". Se enviará un código de acceso temporal a tu correo.",
      partBStep3: "3. Click next\nIngresa el correo de Netflix. Haz clic en \"Buscar código\". Este proceso puede tardar 1-3 minutos. Recibirás un correo, haz clic en \"Obtener código\".",
      partBStep4: "4. Recupera e ingresa el código de verificación\nSi recibes un código, ingrésalo directamente en tu dispositivo para restaurar el acceso.",
      troubleshootingTitle: "¿Aún no puedes obtener el enlace de verificación después de seguir el proceso?",
      troubleshootingMethod1: "Prueba estos dos métodos:\nCambiar de red (Sugerido✅)\nCierra sesión en tu cuenta\nReinicia el router de la TV (obtendrás una nueva dirección IP)\nInicia sesión de nuevo",
      troubleshootingMethod2: "Or change devices\nCada dispositivo puede obtener el enlace un máximo de 4 veces cada 24 horas\n😊Luego intenta obtener el enlace de verificación de nuevo.\nEn tu Netflix: Haz clic en 'Estoy de viaje' o 'Ver temporalmente' > 'Enviar correo'",
      troubleshootingFooter: "Si estos métodos aún no funcionan, utiliza temporalmente un navegador web para iniciar sesión y ver, e intenta recuperar el enlace de verificación de nuevo después de 24 horas.\n¿Tu dispositivo indica que ya no puedes solicitar códigos?\nSolicita el código de nuevo después de cambiar de dispositivo.\nSi aún no puedes obtenerlo, puedes usar temporalmente un navegador web para iniciar sesión y ver.",
      gotIt: "¡Entendido, vamos!",
      backToGuide: "Ver Instrucciones"
    }
  },
  hi: {
    title: "CODE GETTER",
    subtitle: "Netflix हाउसहोल्ड एक्सेस और टेम्पररी कोड",
    findLatestEmail: "अपना हाउसहोल्ड या टेम्पररी मेल खोजें",
    enterEmailDescription: "नवीनतम Netflix ईमेल खोजने के लिए ईमेल दर्ज करें",
    enterNetflixEmail: "Netflix ईमेल दर्ज करें",
    emailPlaceholder: "user@example.com",
    findCode: "कोड खोजें",
    searching: "खोज रहा है...",
    emailFound: "ईमेल मिला",
    foundLatestEmail: "नवीनतम Netflix ईमेल मिल गया।",
    latestNetflixEmail: "नवीनतम Netflix ईमेल",
    showsLatestOnly: "केवल नवीनतम Netflix ईमेल दिखाता है",
    searchFailed: "खोज विफल",
    noContent: "कोई सामग्री उपलब्ध नहीं",
    validEmailError: "कृपया एक वैध ईमेल पता दर्ज करें।",
    guide: {
      welcome: "【Netflix】 \"This Device Is Not Part of This Netflix Household\" समस्या को कैसे हल करें",
      welcomeSubtitle: "यदि आपका टीवी या डिवाइस \"This device is not part of this account's Netflix household\" संदेश दिखाता है, तो पहुंच पुनः प्राप्त करने के लिए इन चरणों का पालन करें:",
      partATitle: "A. केवल \"Update Netflix Household\" बटन प्रदर्शित होता है",
      partAStep1: "1. \"Update Netflix Household\" पर क्लिक करें\nप्रॉम्ट पेज पर, \"Update Netflix Household\" बटन चुनें और अगले पेज पर \"Update my Netflix household\" चुनकर जारी रखें।",
      partAStep2: "2. \"Send Email\" पर क्लिक करें\n\"Send Email\" बटन चुनें, এবং Netflix আপনার নিবন্ধিত ইমেইল ঠিকানায় একটি ভেরিফিকেশন ইমেইল পাঠাবে।",
      partAStep3: "3. Click next\nNetflix ईमेल पता दर्ज करें। \"Find Code\" पर क्लिक करें। आपको अपने डिवाइस को स्वीकृत करने के लिए ईमेल प्राप्त होगा।",
      partAStep4: "4. अपने Netflix हाउसहोल्ड के लिए अपडेट पूरा करें\nNetflix पेज पर वापस जाएं और \"Update your Netflix household\" पर क्लिक करें। अपडेट करने के बाद, आपका डिवाइस फिर से पहुंच प्राप्त कर लेगा।",
      partBTitle: "B. यदि आप \"I’m Traveling\" या \"Watch Temporarily\" बटन देखते हैं",
      partBStep1: "1. \"I’m Traveling\" या \"Watch Temporarily\" चुनें\nप्रॉम्ट स्क्रीन पर, आगे बढ़ने के लिए \"I’m Traveling\" या \"Watch Temporarily\" चुनें।",
      partBStep2: "2. \"Send Email\" बटन पर क्लिक करें\nअपने डिवाइस पर, \"Send Email\" चुनें। आपके ईमेल पर un अस्थायी एक्सेस कोड भेजा जाएगा।",
      partBStep3: "3. Click next\nNetflix ईमेल पता दर्ज करें। \"Find Code\" पर क्लिक करें। इस प्रक्रिया में 1-3 मिनट लग सकते हैं। आपको मेल प्राप्त होगा, \"Get Code\" पर क्लिक करें।",
      partBStep4: "4. सत्यापन कोड प्राप्त करें और दर्ज करें\nयदि आपको कोड प्राप्त होता है, तो पहुंच बहाल करने के लिए इसे सीधे अपने डिवाइस में दर्ज करें।",
      troubleshootingTitle: "प्रक्रिया का पालन करने के बाद भी सत्यापन लिंक प्राप्त करने में असमर्थ हैं?",
      troubleshootingMethod1: "इन दो तरीकों को आजमाएं:\nनेटवर्क बदलें (सुझाया गया✅)\nअपने खाते से लॉग आउट करें\nটিভি রাউটার রিস্টার্ট দিন (আপনি un নতুন আইপি পাবেন)\nআবার লগ ইন করুন",
      troubleshootingMethod2: "অথবা ডিভাইস পরিবর্তন করুন\nপ্রতিটি ডিভাইস ২৪ ঘণ্টার মধ্যে সর্বোচ্চ ৪ বার লিঙ্ক পেতে পারে\n😊তারপর আবার ভেরিফিকেশন লিঙ্ক পাওয়ার চেষ্টা করুন।\nআপনার Netflix-এ: 'I'm Traveling' বা 'Watch Temporarily' > 'Send email' এ ক্লিক করুন",
      troubleshootingFooter: "যদি এই পদ্ধতিগুলো কাজ না করে, তবে সাময়িকভাবে দেখার জন্য ওয়েব ব্রাউজার ব্যবহার করুন এবং ২৪ ঘণ্টা পর আবার চেষ্টা করুন।\nআপনার ডিভাইস কি দেখাচ্ছে যে আপনি আর কোড অনুরোধ করতে পারবেন না?\nদয়া করে অন্য ডিভাইস ব্যবহার করে আবার কোড অনুরোধ করুন।\nযদি তাও কাজ না করে, তবে সাময়িকভাবে ওয়েব ব্রাউজার ব্যবহার করুন।",
      gotIt: "বুঝতে পেরেছি, শুরু করি!",
      backToGuide: "নির্দেশিকা দেখুন"
    }
  }
};

// Fill in other languages with English as fallback to prevent blank screens
LANGUAGES.forEach(lang => {
  if (!translations[lang.code]) {
    translations[lang.code] = translations.en;
  }
});

export function getTranslations(lang) {
  return translations[lang] || translations.en;
}

export function detectLanguageFromCountry(countryCode) {
  const map = {
    'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'CL': 'es', 'PE': 'es',
    'FR': 'fr', 'DE': 'de', 'IT': 'it', 'KR': 'ko', 'JP': 'ja', 'CN': 'zh',
    'BD': 'bn', 'IN': 'hi', 'BR': 'pt', 'PT': 'pt', 'PL': 'pl', 'NL': 'nl',
    'SK': 'sk', 'RO': 'ro', 'SA': 'ar', 'EG': 'ar', 'AE': 'ar'
  };
  return map[countryCode] || 'en';
}

export async function detectCountry() {
  try {
    const res = await fetch('https://ipwho.is/');
    const data = await res.json();
    return data.success ? data.country_code : null;
  } catch (e) {
    return null;
  }
}

export function detectLanguageFromBrowser() {
  if (typeof navigator === 'undefined') return 'en';
  const browserLang = navigator.language.split('-')[0];
  const supported = LANGUAGES.map(l => l.code);
  return supported.includes(browserLang) ? browserLang : 'en';
}