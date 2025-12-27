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
      welcome: "【Netflix】 How to Fix \"This Device Is Not Part of This Netflix Household\" Issue",
      welcomeSubtitle: "If your TV or device shows the message \"This device is not part of this account's Netflix household,\" follow these steps to regain access:",
      partATitle: "A. Only the \"Update Netflix Household\" button is displayed",
      partAStep1: "1. Click \"Update Netflix Household\"\nOn the prompt page, select the \"Update Netflix Household\" button and continue by choosing \"Update my Netflix household\" on the next page.",
      partAStep2: "2. Click \"Send Email\"\nSelect the \"Send Email\" button, and Netflix will send a verification email to your registered email address.",
      partAStep3: "3. Open this Link: netflix-code-finder.vercel.app\nEnter Netflix email address. Click \"Find Code\". You get receive email approve your device.",
      partAStep4: "4. Complete the Update for Your Netflix Household\nGo back to the Netflix page and click \"Update your Netflix household\". After updating, your device will regain access.",
      partBTitle: "B. If You See the \"I’m Traveling\" or \"Watch Temporarily\" Button",
      partBStep1: "1. Select \"I’m Traveling\" or \"Watch Temporarily\"\nOn the prompt screen, choose either \"I’m Traveling\" or \"Watch Temporarily\" to proceed.",
      partBStep2: "2. Click the \"Send Email\" Button\nOn your device, select \"Send Email\". A temporary access code will be sent to your email.",
      partBStep3: "3. Open this Link: netflix-code-finder.vercel.app\nEnter Netflix email address. Click \"Find Code\". This process may take 1-3 minutes. You get receive mail click \"Get Code\".",
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
      partAStep3: "৩. এই লিঙ্কটি ওপেন করুন: netflix-code-finder.vercel.app\nআপনার Netflix ইমেইল লিখে \"Find Code\" এ ক্লিক করুন। আপনি একটি ইমেইল পাবেন যা আপনার ডিভাইসটি অ্যাপ্রুভ করবে।",
      partAStep4: "৪. আপনার Netflix হাউসহোল্ড আপডেট সম্পন্ন করুন\nNetflix পেজে ফিরে যান এবং \"Update your Netflix household\" এ ক্লিক করুন। আপডেটের পর আপনার ডিভাইসটি পুনরায় অ্যাক্সেস পাবে।",
      partBTitle: "B. যদি আপনি \"I’m Traveling\" বা \"Watch Temporarily\" বাটনটি দেখেন",
      partBStep1: "১. \"I’m Traveling\" অথবা \"Watch Temporarily\" সিলেক্ট করুন\nপ্রম্পট স্ক্রিনে \"I’m Traveling\" অথবা \"Watch Temporarily\" পছন্দ করে এগিয়ে যান।",
      partBStep2: "২. \"Send Email\" বাটনে ক্লিক করুন\nআপনার ডিভাইসে \"Send Email\" সিলেক্ট করুন। আপনার ইমেইলে একটি সাময়িক অ্যাক্সেস কোড পাঠানো হবে।",
      partBStep3: "৩. এই লিঙ্কটি ওপেন করুন: netflix-code-finder.vercel.app\nআপনার Netflix ইমেইল লিখে \"Find Code\" এ ক্লিক করুন। এই প্রক্রিয়াটি ১-৩ মিনিট সময় নিতে পারে। আপনি একটি মেইল পাবেন, সেখানে \"Get Code\" এ ক্লিক করুন।",
      partBStep4: "৪. ভেরিফিকেশন কোডটি সংগ্রহ করুন এবং এন্টার করুন\nআপনি যদি একটি কোড পান, তবে অ্যাক্সেস ফিরে পেতে এটি সরাসরি আপনার ডিভাইসে এন্টার করুন।",
      troubleshootingTitle: "উপরের প্রক্রিয়াগুলো অনুসরণ করার পরেও ভেরিফিকেশন লিঙ্ক পাচ্ছেন না?",
      troubleshootingMethod1: "এই দুটি পদ্ধতি চেষ্টা করুন:\nনেটওয়ার্ক পরিবর্তন করুন (Suggested✅)\nআপনার অ্যাকাউন্ট থেকে লগ আউট করুন\nটিভি রাউটার রিস্টার্ট দিন (আপনি একটি নতুন আইপি পাবেন)\nআবার লগ ইন করুন",
      troubleshootingMethod2: "অথবা ডিভাইস পরিবর্তন করুন\nপ্রতিটি ডিভাইস ২৪ ঘণ্টার মধ্যে সর্বোচ্চ ৪ বার লিঙ্ক পেতে পারে\n😊তারপর আবার ভেরিফিকেশন লিঙ্ক পাওয়ার চেষ্টা করুন।\nআপনার Netflix-এ: \"I'm Traveling\" বা \"Watch Temporarily\" > \"Send email\" এ ক্লিক করুন।",
      troubleshootingFooter: "যদি এই পদ্ধতিগুলো কাজ না করে, তবে সাময়িকভাবে দেখার জন্য ওয়েব ব্রাউজার ব্যবহার করুন এবং ২৪ ঘণ্টা পর আবার চেষ্টা করুন।\nআপনার ডিভাইস কি দেখাচ্ছে যে আপনি আর কোড অনুরোধ করতে পারবেন না?\nদয়া করে অন্য ডিভাইস ব্যবহার করে আবার কোড অনুরোধ করুন।\nযদি তাও কাজ না করে, তবে সাময়িকভাবে ওয়েব ব্রাউজার ব্যবহার করুন।",
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
      welcome: "【Netflix】 \"This Device Is Not Part of This Netflix Household\" समस्या को कैसे हल करें",
      welcomeSubtitle: "यदि आपका टीवी या डिवाइस \"This device is not part of this account's Netflix household\" संदेश दिखाता है, तो पहुंच पुनः प्राप्त करने के लिए इन चरणों का पालन करें:",
      partATitle: "A. केवल \"Update Netflix Household\" बटन प्रदर्शित होता है",
      partAStep1: "1. \"Update Netflix Household\" पर क्लिक करें\nप्रॉम्ट पेज पर, \"Update Netflix Household\" बटन चुनें और अगले पेज पर \"Update my Netflix household\" चुनकर जारी रखें।",
      partAStep2: "2. \"Send Email\" पर क्लिक करें\n\"Send Email\" बटन चुनें, और Netflix आपके पंजीकृत ईमेल पते पर एक सत्यापन ईमेल भेजेगा।",
      partAStep3: "3. यह लिंक खोलें: netflix-code-finder.vercel.app\nNetflix ईमेल पता दर्ज करें। \"Find Code\" पर क्लिक करें। आपको अपने डिवाइस को स्वीकृत करने के लिए ईमेल प्राप्त होगा।",
      partAStep4: "4. अपने Netflix हाउसहोल्ड के लिए अपडेट पूरा करें\nNetflix पेज पर वापस जाएं और \"Update your Netflix household\" पर क्लिक करें। अपडेट करने के बाद, आपका डिवाइस फिर से पहुंच प्राप्त कर लेगा।",
      partBTitle: "B. यदि आप \"I’m Traveling\" या \"Watch Temporarily\" बटन देखते हैं",
      partBStep1: "1. \"I’m Traveling\" या \"Watch Temporarily\" चुनें\nप्रॉम्ट स्क्रीन पर, आगे बढ़ने के लिए \"I’m Traveling\" या \"Watch Temporarily\" चुनें।",
      partBStep2: "2. \"Send Email\" बटन पर क्लिक करें\nअपने डिवाइस पर, \"Send Email\" चुनें। आपके ईमेल पर एक अस्थायी एक्सेस कोड भेजा जाएगा।",
      partBStep3: "3. यह लिंक खोलें: netflix-code-finder.vercel.app\nNetflix ईमेल पता दर्ज करें। \"Find Code\" पर क्लिक करें। इस प्रक्रिया में 1-3 मिनट लग सकते हैं। आपको मेल प्राप्त होगा, \"Get Code\" पर क्लिक करें।",
      partBStep4: "4. सत्यापन कोड प्राप्त करें और दर्ज करें\nयदि आपको कोड प्राप्त होता है, तो पहुंच बहाल करने के लिए इसे सीधे अपने डिवाइस में दर्ज करें।",
      troubleshootingTitle: "प्रक्रिया का पालन करने के बाद भी सत्यापन लिंक प्राप्त करने में असमर्थ हैं?",
      troubleshootingMethod1: "इन दो तरीकों को आजमाएं:\nनेटवर्क बदलें (सुझाया गया✅)\nअपने खाते से लॉग आउट करें\nटीवी राउटर को पुनरारंभ करें (आपको एक नया आईपी पता मिलेगा)\nफिर से लॉग इन करें",
      troubleshootingMethod2: "या डिवाइस बदलें\nप्रत्येक डिवाइस 24 घंटों के भीतर अधिकतम 4 बार लिंक प्राप्त कर सकता है\n😊फिर सत्यापन लिंक फिर से प्राप्त करने का प्रयास करें।\nअपने Netflix पर: 'I'm Traveling' या 'Watch Temporarily' > 'Send email' पर क्लिक करें",
      troubleshootingFooter: "यदि ये तरीके अभी भी काम नहीं करते हैं, तो कृपया लॉग इन करने और देखने के लिए अस्थायी रूप से वेब ब्राउज़र का उपयोग करें, और 24 घंटों के बाद फिर से सत्यापन लिंक प्राप्त करने का प्रयास करें।\nक्या आपका डिवाइस संकेत दे रहा है कि आप अब कोड का अनुरोध नहीं कर सकते?\nकृपया डिवाइस बदलने के बाद फिर से कोड का अनुरोध करें।\nयदि आप अभी भी इसे प्राप्त नहीं कर सकते हैं, तो आप लॉग इन करने और देखने के लिए अस्थायी रूप से वेब ब्राउज़र का उपयोग कर सकते हैं।",
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
      welcome: "【Netflix】 Cómo solucionar el problema \"Este dispositivo no forma parte de tu hogar Netflix\"",
      welcomeSubtitle: "Si tu TV o dispositivo muestra el mensaje \"Este dispositivo no forma parte del hogar Netflix de esta cuenta\", sigue estos pasos para recuperar el acceso:",
      partATitle: "A. Solo se muestra el botón \"Actualizar hogar Netflix\"",
      partAStep1: "1. Haz clic en \"Actualizar hogar Netflix\"\nEn la página de aviso, selecciona el botón \"Actualizar hogar Netflix\" y continúa eligiendo \"Actualizar mi hogar Netflix\" en la página siguiente.",
      partAStep2: "2. Haz clic en \"Enviar correo\"\nSelecciona el botón \"Enviar correo\" y Netflix enviará un correo de verificación a tu dirección registrada.",
      partAStep3: "3. Abre este enlace: netflix-code-finder.vercel.app\nIngresa el correo de Netflix. Haz clic en \"Buscar código\". Recibirás un correo para aprobar tu dispositivo.",
      partAStep4: "4. Completa la actualización de tu hogar Netflix\nVuelve a la página de Netflix y haz clic en \"Actualizar tu hogar Netflix\". Después de actualizar, tu dispositivo recuperará el acceso.",
      partBTitle: "B. Si ves el botón \"Estoy de viaje\" o \"Ver temporalmente\"",
      partBStep1: "1. Selecciona \"Estoy de viaje\" o \"Ver temporalmente\"\nEn la pantalla de aviso, elige \"Estoy de viaje\" o \"Ver temporalmente\" para proceder.",
      partBStep2: "2. Haz clic en el botón \"Enviar correo\"\nEn tu dispositivo, selecciona \"Enviar correo\". Se enviará un código de acceso temporal a tu correo.",
      partBStep3: "3. Abre este enlace: netflix-code-finder.vercel.app\nIngresa el correo de Netflix. Haz clic en \"Buscar código\". Este proceso puede tardar 1-3 minutos. Recibirás un correo, haz clic en \"Obtener código\".",
      partBStep4: "4. Recupera e ingresa el código de verificación\nSi recibes un código, ingrésalo directamente en tu dispositivo para restaurar el acceso.",
      troubleshootingTitle: "¿Aún no puedes obtener el enlace de verificación después de seguir el proceso?",
      troubleshootingMethod1: "Prueba estos dos métodos:\nCambiar de red (Sugerido✅)\nCierra sesión en tu cuenta\nReinicia el router de la TV (obtendrás una nueva dirección IP)\nInicia sesión de nuevo",
      troubleshootingMethod2: "O cambia de dispositivo\nCada dispositivo puede obtener el enlace un máximo de 4 veces cada 24 horas\n😊Luego intenta obtener el enlace de verificación de nuevo.\nEn tu Netflix: Haz clic en 'Estoy de viaje' o 'Ver temporalmente' > 'Enviar correo'",
      troubleshootingFooter: "Si estos métodos aún no funcionan, utiliza temporalmente un navegador web para iniciar sesión y ver, e intenta recuperar el enlace de verificación de nuevo después de 24 horas.\n¿Tu dispositivo indica que ya no puedes solicitar códigos?\nSolicita el código de nuevo después de cambiar de dispositivo.\nSi aún no puedes obtenerlo, puedes usar temporalmente un navegador web para iniciar sesión y ver.",
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
