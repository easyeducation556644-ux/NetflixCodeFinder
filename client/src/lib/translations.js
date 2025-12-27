// UI translations for supported languages
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
      welcome: "How to Fix \"This Device Is Not Part of This Netflix Household\" Issue",
      part1Title: "Only the \"Update Netflix Household\" button is displayed",
      part1Step1: "1. Click “Update Netflix Household”\nOn the prompt page, select the “Update Netflix Household” button and continue by choosing “Update my Netflix household” on the next page.",
      part1Step2: "2. Click “Send Email”\nSelect the “Send Email” button, and Netflix will send a verification email to your registered email address.",
      part1Step3: "3. Open this Link: netflix-code-finder.vercel.app\nEnter Netflix email address. Click “Find Code”. You get receive email approve your device.",
      part1Step4: "4. Complete the Update for Your Netflix Household\nGo back to the Netflix page and click “Update your Netflix household”. After updating, your device will regain access.",
      part2Title: "If You See the “I’m Traveling” or “Watch Temporarily” Button",
      part2Step1: "1. Select “I’m Traveling” or “Watch Temporarily”\nOn the prompt screen, choose either “I’m Traveling” or “Watch Temporarily” to proceed.",
      part2Step2: "2. Click the “Send Email” Button\nOn your device, select “Send Email”. A temporary access code will be sent to your email.",
      part2Step3: "3. Open this Link: netflix-code-finder.vercel.app\nEnter Netflix email address. Click “Find Code”. This process may take 1-3 minutes. You get receive mail click “Get Code”.",
      part2Step4: "4. Retrieve and Enter the Verification Code\nIf you receive a code, enter it directly into your device to restore access.",
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
      welcome: "\"This Device Is Not Part of This Netflix Household\" সমস্যাটি যেভাবে সমাধান করবেন",
      part1Title: "শুধুমাত্র \"Update Netflix Household\" বাটনটি দেখা গেলে",
      part1Step1: "১. “Update Netflix Household” এ ক্লিক করুন\nপ্রম্পট পেজে “Update Netflix Household” বাটনটি সিলেক্ট করুন এবং পরবর্তী পেজে “Update my Netflix household” পছন্দ করে এগিয়ে যান।",
      part1Step2: "২. “Send Email” এ ক্লিক করুন\n“Send Email” বাটনটি সিলেক্ট করুন, এবং Netflix আপনার নিবন্ধিত ইমেইল ঠিকানায় একটি ভেরিফিকেশন ইমেইল পাঠাবে।",
      part1Step3: "৩. এই লিঙ্কটি ওপেন করুন: netflix-code-finder.vercel.app\nআপনার Netflix ইমেইল লিখে “Find Code” এ ক্লিক করুন। আপনি একটি ইমেইল পাবেন যা আপনার ডিভাইসটি অ্যাপ্রুভ করবে।",
      part1Step4: "৪. আপনার Netflix হাউসহোল্ড আপডেট সম্পন্ন করুন\nNetflix পেজে ফিরে যান এবং “Update your Netflix household” এ ক্লিক করুন। আপডেটের পর আপনার ডিভাইসটি পুনরায় অ্যাক্সেস পাবে।",
      part2Title: "যদি আপনি “I’m Traveling” বা “Watch Temporarily” বাটনটি দেখেন",
      part2Step1: "১. “I’m Traveling” অথবা “Watch Temporarily” সিলেক্ট করুন\nপ্রম্পট স্ক্রিনে “I’m Traveling” অথবা “Watch Temporarily” পছন্দ করে এগিয়ে যান।",
      part2Step2: "২. “Send Email” বাটনে ক্লিক করুন\nআপনার ডিভাইসে “Send Email” সিলেক্ট করুন। আপনার ইমেইলে একটি সাময়িক অ্যাক্সেস কোড পাঠানো হবে।",
      part2Step3: "৩. এই লিঙ্কটি ওপেন করুন: netflix-code-finder.vercel.app\nআপনার Netflix ইমেইল লিখে “Find Code” এ ক্লিক করুন। এই প্রক্রিয়াটি ১-৩ মিনিট সময় নিতে পারে। আপনি একটি মেইল পাবেন, সেখানে “Get Code” এ ক্লিক করুন।",
      part2Step4: "৪. ভেরিফিকেশন কোডটি সংগ্রহ করুন এবং এন্টার করুন\nআপনি যদি একটি কোড পান, তবে অ্যাক্সেস ফিরে পেতে এটি সরাসরি আপনার ডিভাইসে এন্টার করুন।",
      gotIt: "বুঝতে পেরেছি, শুরু করি!",
      backToGuide: "নির্দেশিকা দেখুন"
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
      welcome: "Code Getter में आपका स्वागत है",
      step1Title: "Netflix खोलें",
      step1Desc: "अपने Netflix ऐप पर जाएं और अस्थायी एक्सेस कोड या हाउसहोल्ड अपडेट का अनुरोध करें।",
      step2Title: "ईमेल दर्ज करें",
      step2Desc: "कोड खोजने के लिए इस वेबसाइट पर अपना पंजीकृत ईमेल पता दर्ज करें।",
      step3Title: "अपना कोड प्राप्त करें",
      step3Desc: "हमारा सिस्टम नवीनतम Netflix ईमेल ढूंढेगा और आपके लिए कोड तुरंत प्रदर्शित करेगा।",
      gotIt: "समझ गया, शुरू करें!",
      backToGuide: "निर्देश देखें"
    }
  },
  es: {
    title: "CODE GETTER",
    subtitle: "Acceso Hogar de Netflix y Codigos Temporales",
    findLatestEmail: "Encuentra tu correo de Household o Temporal",
    enterEmailDescription: "Ingresa el correo para buscar el ultimo email de Netflix",
    enterNetflixEmail: "Ingresa Correo de Netflix",
    emailPlaceholder: "user@example.com",
    findCode: "Buscar Codigo",
    searching: "Buscando...",
    emailFound: "Correo Encontrado",
    foundLatestEmail: "Se encontro el ultimo correo de Netflix.",
    latestNetflixEmail: "Ultimo correo de Netflix",
    showsLatestOnly: "Muestra solo el ultimo correo de Netflix",
    searchFailed: "Busqueda Fallida",
    noContent: "Sin contenido disponible",
    validEmailError: "Por favor ingresa una direccion de correo valida.",
    guide: {
      welcome: "Bienvenido a Code Getter",
      step1Title: "Abrir Netflix",
      step1Desc: "Ve a tu aplicación de Netflix y solicita un código de acceso temporal o actualización de hogar.",
      step2Title: "Ingresar Correo",
      step2Desc: "Ingresa tu dirección de correo registrada en este sitio para buscar el código.",
      step3Title: "Obtén tu Código",
      step3Desc: "Nuestro sistema encontrará el último correo de Netflix y te mostrará el código al instante.",
      gotIt: "¡Entendido, vamos!",
      backToGuide: "Ver Instrucciones"
    }
  },
  fr: {
    title: "CODE GETTER",
    subtitle: "Acces Foyer Netflix et Codes Temporaires",
    findLatestEmail: "Trouvez votre email Household ou Temporaire",
    enterEmailDescription: "Entrez l'email pour rechercher le dernier email Netflix",
    enterNetflixEmail: "Entrez l'Email Netflix",
    emailPlaceholder: "user@example.com",
    findCode: "Trouver le Code",
    searching: "Recherche...",
    emailFound: "Email Trouve",
    foundLatestEmail: "Le dernier email Netflix a ete trouve.",
    latestNetflixEmail: "Dernier email Netflix",
    showsLatestOnly: "Affiche uniquement le dernier email Netflix",
    searchFailed: "Recherche Echouee",
    noContent: "Aucun contenu disponible",
    validEmailError: "Veuillez entrer une adresse email valide."
  },
  ar: {
    title: "CODE GETTER",
    subtitle: "رموز الوصول المنزلي والمؤقتة لـ Netflix",
    findLatestEmail: "ابحث عن بريدك المنزلي أو المؤقت",
    enterEmailDescription: "أدخل البريد الإلكتروني للبحث عن آخر بريد Netflix",
    enterNetflixEmail: "أدخل بريد Netflix",
    emailPlaceholder: "user@example.com",
    findCode: "البحث عن الرمز",
    searching: "جارٍ البحث...",
    emailFound: "تم العثور على البريد",
    foundLatestEmail: "تم العثور على آخر بريد Netflix.",
    latestNetflixEmail: "آخر بريد Netflix",
    showsLatestOnly: "يعرض فقط آخر بريد Netflix",
    searchFailed: "فشل البحث",
    noContent: "لا يوجد محتوى متاح",
    validEmailError: "الرجاء إدخال عنوان بريد إلكتروني صالح."
  },
  pt: {
    title: "CODE GETTER",
    subtitle: "Acesso Residencial Netflix e Codigos Temporarios",
    findLatestEmail: "Encontre seu email Household ou Temporário",
    enterEmailDescription: "Digite o email para buscar o ultimo email da Netflix",
    enterNetflixEmail: "Digite o Email Netflix",
    emailPlaceholder: "user@example.com",
    findCode: "Encontrar Codigo",
    searching: "Buscando...",
    emailFound: "Email Encontrado",
    foundLatestEmail: "O ultimo email da Netflix foi encontrado.",
    latestNetflixEmail: "Ultimo email Netflix",
    showsLatestOnly: "Mostra apenas o ultimo email Netflix",
    searchFailed: "Busca Falhou",
    noContent: "Nenhum conteudo disponivel",
    validEmailError: "Por favor, insira um endereco de email valido."
  },
  de: {
    title: "CODE GETTER",
    subtitle: "Netflix Haushaltszugang und Temporare Codes",
    findLatestEmail: "Finden Sie Ihre Household- oder temporäre E-Mail",
    enterEmailDescription: "Geben Sie die E-Mail ein um die neueste Netflix E-Mail zu suchen",
    enterNetflixEmail: "Netflix E-Mail Eingeben",
    emailPlaceholder: "user@example.com",
    findCode: "Code Finden",
    searching: "Suche...",
    emailFound: "E-Mail Gefunden",
    foundLatestEmail: "Die neueste Netflix E-Mail wurde gefunden.",
    latestNetflixEmail: "Neueste Netflix E-Mail",
    showsLatestOnly: "Zeigt nur die neueste Netflix E-Mail",
    searchFailed: "Suche Fehlgeschlagen",
    noContent: "Kein Inhalt verfugbar",
    validEmailError: "Bitte geben Sie eine gultige E-Mail-Adresse ein."
  },
  ko: {
    title: "CODE GETTER",
    subtitle: "Netflix 가구 액세스 및 임시 코드",
    findLatestEmail: "하우스홀드 또는 임시 이메일을 찾기",
    enterEmailDescription: "최신 Netflix 이메일을 검색하려면 이메일을 입력하세요",
    enterNetflixEmail: "Netflix 이메일 입력",
    emailPlaceholder: "user@example.com",
    findCode: "코드 찾기",
    searching: "검색 중...",
    emailFound: "이메일 발견",
    foundLatestEmail: "최신 Netflix 이메일을 찾았습니다.",
    latestNetflixEmail: "최신 Netflix 이메일",
    showsLatestOnly: "최신 Netflix 이메일만 표시",
    searchFailed: "검색 실패",
    noContent: "사용 가능한 콘텐츠 없음",
    validEmailError: "유효한 이메일 주소를 입력해 주세요."
  },
  it: {
    title: "CODE GETTER",
    subtitle: "Accesso Domestico Netflix e Codici Temporanei",
    findLatestEmail: "Trova la tua email Household o Temporanea",
    enterEmailDescription: "Inserisci l'email per cercare l'ultima email Netflix",
    enterNetflixEmail: "Inserisci Email Netflix",
    emailPlaceholder: "user@example.com",
    findCode: "Trova Codice",
    searching: "Ricerca...",
    emailFound: "Email Trovata",
    foundLatestEmail: "L'ultima email Netflix e stata trovata.",
    latestNetflixEmail: "Ultima email Netflix",
    showsLatestOnly: "Mostra solo l'ultima email Netflix",
    searchFailed: "Ricerca Fallita",
    noContent: "Nessun contenuto disponibile",
    validEmailError: "Inserisci un indirizzo email valido."
  }
};

export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', countries: ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'SG'] },
  { code: 'es', name: 'Español', flag: '🇪🇸', countries: ['ES', 'MX', 'AR', 'CO', 'CL', 'PE'] },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩', countries: ['BD'] },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', countries: ['IN'] },
  { code: 'fr', name: 'Français', flag: '🇫🇷', countries: ['FR', 'BE', 'CH'] },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', countries: ['SA', 'AE', 'EG', 'MA', 'DZ'] },
  { code: 'pt', name: 'Português', flag: '🇵🇹', countries: ['PT', 'BR'] },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', countries: ['DE', 'AT', 'CH'] },
  { code: 'ko', name: '한국어', flag: '🇰🇷', countries: ['KR'] },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', countries: ['IT'] }
];

export function getTranslations(langCode) {
  return translations[langCode] || translations.en;
}

export function detectLanguageFromCountry(countryCode) {
  if (!countryCode) return 'en';
  
  for (const lang of LANGUAGES) {
    if (lang.countries.includes(countryCode)) {
      return lang.code;
    }
  }
  
  return 'en';
}

export function detectLanguageFromBrowser() {
  const browserLang = navigator.language || navigator.userLanguage || 'en';
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  const supportedLang = LANGUAGES.find(l => l.code === langCode);
  if (supportedLang) {
    return supportedLang.code;
  }
  
  return 'en';
}

export async function detectCountry() {
  const ipApis = [
    { url: 'https://ipwho.is/', field: 'country_code' },
    { url: 'https://api.country.is/', field: 'country' },
    { url: 'https://ipapi.co/json/', field: 'country_code' }
  ];
  
  for (const api of ipApis) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(api.url, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      const country = data[api.field];
      
      if (country) {
        console.log('Detected country:', country, 'from', api.url);
        return country;
      }
    } catch (e) {
      console.log('IP API failed:', api.url);
    }
  }
  
  console.log('All IP detection failed, using browser language');
  return null;
}
