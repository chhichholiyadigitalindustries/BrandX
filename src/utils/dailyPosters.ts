import { DailyCalendarItem, TemplateItem } from '../types';
import { APP_IMAGES, POSTER_IMAGES } from '../data/mockData';

// Weekday Hindi & English names
export const HINDI_DAYS = [
  'रविवार',
  'सोमवार',
  'मंगलवार',
  'बुधवार',
  'गुरुवार',
  'शुक्रवार',
  'शनिवार',
];

export const ENG_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const HINDI_MONTHS = [
  'जनवरी',
  'फरवरी',
  'मार्च',
  'अप्रैल',
  'मई',
  'जून',
  'जुलाई',
  'अगस्त',
  'सितम्बर',
  'अक्टूबर',
  'नवम्बर',
  'दिसम्बर',
];

export const ENG_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// Rich Curated Day-Specific Themes
interface DayTheme {
  godTitle: string;
  godSubtitle: string;
  godQuote: string;
  godBadge: string;
  godImage: string;
  vyaparTitle: string;
  vyaparSubtitle: string;
  vyaparQuote: string;
  vyaparBadge: string;
  offerTitle: string;
  offerSubtitle: string;
  offerQuote: string;
  offerBadge: string;
}

const DAY_THEMES: Record<number, DayTheme> = {
  // 0: Sunday (रविवार) - Lord Surya Dev
  0: {
    godTitle: 'शुभ रविवार ☀️✨',
    godSubtitle: 'OM SURYAYA NAMAH | सुख-समृद्धि व आरोग्य',
    godQuote: 'भगवान सूर्य देव आपके जीवन और व्यापार को नई ऊर्जा, आरोग्य और सफलता के प्रकाश से आलोकित करें। आपका रविवार मंगलमय हो! 🙏',
    godBadge: 'SUNDAY SPECIAL',
    godImage: POSTER_IMAGES.suryadev,
    vyaparTitle: 'Sunday Family & Vyapar Thanks ☕',
    vyaparSubtitle: 'WE APPRECIATE YOUR TRUST',
    vyaparQuote: 'व्यापार में सबसे बड़ी पूंजी ग्राहक का विश्वास है। हमारे सभी आदरणीय ग्राहकों को सप्रेम धन्यवाद! New Goals, Fresh Start.',
    vyaparBadge: 'GRATITUDE',
    offerTitle: 'Sunday Mega Family Sale 🛍️🔥',
    offerSubtitle: 'FLAT 35% OFF • TODAY ONLY',
    offerQuote: 'रविवार विशेष महा बचत ऑफर! आज ही अपने परिवार के साथ पधारें और बेहतरीन प्रोडक्ट्स पर आकर्षक छूट का लाभ उठाएं।',
    offerBadge: 'SUNDAY SALE',
  },
  // 1: Monday (सोमवार) - Lord Shiva
  1: {
    godTitle: 'शुभ सोमवार 🔱🌸',
    godSubtitle: 'HAR HAR MAHADEV | ॐ नमः शिवाय',
    godQuote: 'देवाधिदेव महादेव की असीम कृपा से आपके समस्त कष्ट दूर हों और आपका व्यापार दिन-दूनी रात-चौगुनी तरक्की करे। हर हर महादेव! 🙏',
    godBadge: 'SHIV KRIPA',
    godImage: POSTER_IMAGES.shiva,
    vyaparTitle: 'New Week Motivation 🚀',
    vyaparSubtitle: 'START STRONG • THINK BIG',
    vyaparQuote: 'कर्म ही पूजा है और सच्चाई ही व्यापार की नींव है। नए सप्ताह में नए संकल्प के साथ आगे बढ़ें और सफलता पाएं!',
    vyaparBadge: 'NEW WEEK',
    offerTitle: 'Monday Kickstart Offer 🔥',
    offerSubtitle: 'SPECIAL 25% DISCOUNT',
    offerQuote: 'सप्ताह की शानदार शुरुआत! नए स्टॉक पर आज विशेष छूट। आज ही विजिट करें या ऑनलाइन ऑर्डर करें।',
    offerBadge: 'WEEKLY DEAL',
  },
  // 2: Tuesday (मंगलवार) - Lord Hanuman
  2: {
    godTitle: 'शुभ मंगलवार 🚩✨',
    godSubtitle: 'JAI BAJRANGBALI | संकटमोचन कृपा',
    godQuote: 'पवनपुत्र हनुमान जी की कृपा से आपके जीवन में मंगल ही मंगल हो। समस्त बाधाएं दूर हों और व्यापार में अपार वृद्धि हो। जय श्री राम! 🙏',
    godBadge: 'HANUMAN JI',
    godImage: POSTER_IMAGES.hanuman,
    vyaparTitle: 'मंगलकारी व्यापार सुविचार 💼',
    vyaparSubtitle: 'HONESTY & DEDICATION',
    vyaparQuote: 'सच्ची लगन और निस्वार्थ सेवा से किया गया व्यापार हमेशा फलता-फूलता है। अपने ग्राहकों को सदैव सर्वोत्तम सेवा दें।',
    vyaparBadge: 'SHUBH VICHAR',
    offerTitle: 'Tuesday Super Saver Deal 💥',
    offerSubtitle: 'FLAT 30% OFF STOREWIDE',
    offerQuote: 'मंगलवार महा बचत सेल! सीमित समय के लिए चुनिंदा प्रोडक्ट्स पर विशेष बंपर डिस्काउंट। अभी लाभ उठाएं।',
    offerBadge: 'MEGA DEAL',
  },
  // 3: Wednesday (बुधवार) - Lord Ganesha
  3: {
    godTitle: 'शुभ बुधवार 🐘🪔',
    godSubtitle: 'GANPATI BAPPA MORYA | रिद्धि-सिद्धि दाता',
    godQuote: 'विघ्नहर्ता भगवान श्री गणेश जी आपके व्यापार के सभी विघ्न हर लें और आपके घर में सुख, समृद्धि और रिद्धि-सिद्धि का वास करें। 🌸',
    godBadge: 'GANESH JI',
    godImage: POSTER_IMAGES.ganesha,
    vyaparTitle: 'बुधवार बुद्धि व व्यापार वृद्धि 📈',
    vyaparSubtitle: 'GROW WITH EXCELLENCE',
    vyaparQuote: 'ग्राहक संतुष्टि ही हर सफल व्यापारी की असली पहचान है। हमेशा गुणवत्ता और विश्वास को प्राथमिकता दें।',
    vyaparBadge: 'GROWTH',
    offerTitle: 'Mid-Week Dhamaka Offer 🔥',
    offerSubtitle: 'BUY MORE SAVE MORE',
    offerQuote: 'बुधवार विशेष ऑफर! अपनी पसंदीदा खरीदारी पर पाएं अतिरिक्त छूट और आकर्षक गिफ्ट। आज ही संपर्क करें!',
    offerBadge: 'LIMITED TIME',
  },
  // 4: Thursday (गुरुवार) - Sai Baba
  4: {
    godTitle: 'शुभ गुरुवार ✨🪔',
    godSubtitle: 'OM SAI RAM | श्री हरि विष्णु कृपा',
    godQuote: 'सद्गुरु साईं नाथ और जगत के पालनहार श्री हरि विष्णु जी का आशीर्वाद आप पर सदा बना रहे। आपका दिन शुभ और मंगलमय हो! 🙏',
    godBadge: 'GURU KRIPA',
    godImage: POSTER_IMAGES.saibaba,
    vyaparTitle: 'गुरुवार प्रेरणादायक सुविचार 🌟',
    vyaparSubtitle: 'TRUST IS EVERYTHING',
    vyaparQuote: 'जो व्यापारी गुणवत्ता और समय का आदर करता है, ग्राहक उसका आजीवन साथ निभाते हैं। विश्वास ही सबसे बड़ा धन है।',
    vyaparBadge: 'MOTIVATION',
    offerTitle: 'Thursday Flash Clearance ⚡',
    offerSubtitle: 'UP TO 40% OFF',
    offerQuote: 'गुरुवार फ्लैश सेल! ताज़ा स्टॉक और प्रीमियम वैरायटी पर सीमित समय की भारी छूट। देर न करें, आज ही पधारें।',
    offerBadge: 'FLASH SALE',
  },
  // 5: Friday (शुक्रवार) - Goddess Lakshmi
  5: {
    godTitle: 'शुभ शुक्रवार 🪙🌸',
    godSubtitle: 'MAA LAKSHMI KRIPA | ॐ महालक्ष्म्यै नमः',
    godQuote: 'धन, धान्य और ऐश्वर्य की अधिष्ठात्री मां लक्ष्मी जी की असीम कृपा आपके घर, परिवार और व्यापार पर सदा बनी रहे। शुभ लाभ! 💰',
    godBadge: 'LAKSHMI JI',
    godImage: POSTER_IMAGES.lakshmi,
    vyaparTitle: 'शुक्रवार शुभ लाभ विचार 💎',
    vyaparSubtitle: 'CUSTOMER FIRST ALWAYS',
    vyaparQuote: 'ग्राहक की मुस्कान ही एक व्यापारी का सबसे बड़ा मुनाफा है। ईमानदारी और मधुर व्यवहार से हर दिल जीता जा सकता है।',
    vyaparBadge: 'SHUBH LABH',
    offerTitle: 'Friday Weekend Kickoff Sale 🎁',
    offerSubtitle: 'WEEKEND SPECIAL DISCOUNT',
    offerQuote: 'शुक्रवार स्पेशल बंपर छूट! वीकेंड खरीदारी का मज़ा लें हमारे साथ विशेष डिस्काउंट और आकर्षक ऑफर्स के साथ।',
    offerBadge: 'WEEKEND SPECIAL',
  },
  // 6: Saturday (शनिवार) - Lord Shani Dev
  6: {
    godTitle: 'शुभ शनिवार ⚖️🛡️',
    godSubtitle: 'JAI SHANI DEV | कष्ट निवारण व शक्ति',
    godQuote: 'न्याय के देवता भगवान श्री शनि देव जी की कृपा से आपके जीवन में न्याय, शांति और संपन्नता आए। समस्त विघ्न-बाधाएं दूर हों! 🙏',
    godBadge: 'SHANI DEV',
    godImage: POSTER_IMAGES.shanidev,
    vyaparTitle: 'शनिवार कर्म व परिश्रम संदेश 🛠️',
    vyaparSubtitle: 'HARD WORK PAYS OFF',
    vyaparQuote: 'कठिन परिश्रम और अटूट विश्वास ही सफलता की असली बुनियाद है। अपने सपनों को सच करने के लिए निरंतर प्रयास करते रहें।',
    vyaparBadge: 'HARD WORK',
    offerTitle: 'Saturday Super Weekend Dhamaka 🔥',
    offerSubtitle: 'FLAT 50% DISCOUNT',
    offerQuote: 'शनिवार महा सेल! सभी श्रेणियों पर फ्लैट डिस्काउंट और विशेष उपहार। सीमित स्टॉक, आज ही स्टोर विजिट करें।',
    offerBadge: 'DHAMAKA',
  },
};

// 365 Days Suvichar Pool (Rotating by day of the year)
export const SUVICHAR_POOL = [
  {
    title: 'व्यापार धर्म व ईमानदारी',
    headline: 'सत्य और सेवा ही व्यापार की आत्मा है 🌸',
    quote: 'जो व्यापारी ग्राहक के लाभ को अपना लाभ समझता है, उसका व्यापार कभी मन्द नहीं होता। सदा ईमानदार रहें और आगे बढ़ें। 🙏',
    badge: 'VYAPAR DHARMA',
    category: 'Daily Suvichar' as const,
    image: POSTER_IMAGES.morningSuvichar,
  },
  {
    title: 'सफलता और साहस',
    headline: 'लगातार प्रयास और अटूट हौसला ही सफलता की कुंजी है 🚀',
    quote: 'मंजिल उन्हीं को मिलती है जिनके सपनों में जान होती है, पंखों से कुछ नहीं होता हौसलों से उड़ान होती है। New Day, New Energy!',
    badge: 'SUCCESS MOTIVATION',
    category: 'Motivation' as const,
    image: POSTER_IMAGES.hanuman,
  },
  {
    title: 'शुभ शुरुआत व ग्राहक विश्वास',
    headline: 'ग्राहक संतुष्टि ही हमारा सर्वोच्च लक्ष्य है 🤝',
    quote: 'एक संतुष्ट ग्राहक सौ नए ग्राहकों को साथ लाता है। सर्वोत्तम सेवा और अटूट विश्वास ही हमारे व्यापार की पहचान है।',
    badge: 'CUSTOMER TRUST',
    category: 'Daily Suvichar' as const,
    image: POSTER_IMAGES.ganesha,
  },
  {
    title: 'सकारात्मक सोच व ऊर्जा',
    headline: 'सकारात्मक सोच से हर दिन नया सवेरा ✨',
    quote: 'ईश्वर पर भरोसा और अपने काम से प्यार ही हर मुश्किल को आसान बना देता है। आपका आज का दिन अत्यधिक लाभकारी हो! 🙏',
    badge: 'DAILY BLESSINGS',
    category: 'Daily Suvichar' as const,
    image: POSTER_IMAGES.suryadev,
  },
  {
    title: 'व्यापार वृद्धि व समृद्धि',
    headline: 'गुणवत्ता कभी दुर्घटना नहीं, निरंतर प्रयास है 💡',
    quote: 'उत्कृष्टता कोई एक दिन का काम नहीं, बल्कि हर दिन की आदत है। अपने ग्राहकों को हमेशा सर्वश्रेष्ठ देने का संकल्प लें।',
    badge: 'EXCELLENCE',
    category: 'Motivation' as const,
    image: POSTER_IMAGES.lakshmi,
  },
  {
    title: 'कठिन परिश्रम व अनुशासन',
    headline: 'समय और अनुशासन की कद्र करने वाले कभी असफल नहीं होते ⏰',
    quote: 'जो व्यक्ति समय का सही उपयोग करता है, समय उसे सफलता का सबसे अनमोल उपहार देता है। आज ही अपने लक्ष्यों की ओर बढ़ें!',
    badge: 'TIME DISCIPLINE',
    category: 'Motivation' as const,
    image: POSTER_IMAGES.shiva,
  },
  {
    title: 'सुख, शांति व संतोष',
    headline: 'संतोष और सच्चाई ही सबसे बड़ा धन है 🌿',
    quote: 'जब मन में संतोष और हृदय में सच्चाई हो, तो हर दिन एक उत्सव बन जाता है। आपका परिवार सदा खुशहाल और समृद्ध रहे। 🙏',
    badge: 'PEACE & JOY',
    category: 'Daily Suvichar' as const,
    image: POSTER_IMAGES.saibaba,
  },
];

// Special National & Festival Days Library
export interface FestivalSpecialDay {
  month: number; // 0-indexed (8 = September)
  date: number; // Day of month
  title: string;
  headline: string;
  subheadline: string;
  quote: string;
  badge: string;
  image: string;
}

export const FESTIVAL_CALENDAR: FestivalSpecialDay[] = [
  {
    month: 8, // September
    date: 14,
    title: 'हिन्दी दिवस (Hindi Diwas)',
    headline: 'हिन्दी दिवस की हार्दिक शुभकामनाएं 🇮🇳📖',
    subheadline: 'हमारी भाषा • हमारा गौरव • हमारी पहचान',
    quote: 'निज भाषा उन्नति अहै, सब उन्नति को मूल। बिन निज भाषा-ज्ञान के, मिटत न हिय को सूल। गर्व से कहें - हिन्दी हमारी शान है!',
    badge: 'TODAY SPECIAL',
    image: POSTER_IMAGES.hindiDiwas,
  },
  {
    month: 8, // September
    date: 15,
    title: 'इंजीनियर्स दिवस (Engineers Day)',
    headline: 'Happy Engineers Day ⚙️🏗️',
    subheadline: 'INNOVATION & DEDICATION',
    quote: 'देश के निर्माण और विकास में महत्वपूर्ण योगदान देने वाले सभी मेहनती इंजीनियर्स व कारीगरों को शत-शत नमन!',
    badge: 'ENGINEERS DAY',
    image: POSTER_IMAGES.morningSuvichar,
  },
  {
    month: 8, // September
    date: 17,
    title: 'विश्वकर्मा जयंती (Vishwakarma Jayanti)',
    headline: 'भगवान विश्वकर्मा जयंती की शुभकामनाएं 🛠️⚙️',
    subheadline: 'शिल्प व सृजन के देव की जय',
    quote: 'समस्त शिल्पकला, निर्माण और व्यापार के आराध्य देव भगवान श्री विश्वकर्मा जी आपके व्यापार और औजारों को निरंतर प्रगति प्रदान करें।',
    badge: 'VISHWAKARMA PUJA',
    image: POSTER_IMAGES.shanidev,
  },
  {
    month: 9, // October
    date: 2,
    title: 'गांधी जयंती व शास्त्री जयंती',
    headline: 'गांधी जयंती व लाल बहादुर शास्त्री जयंती 🇮🇳🕊️',
    subheadline: 'सत्य, अहिंसा और जय जवान जय किसान',
    quote: 'सत्य और अहिंसा के मार्ग पर चलकर ही समाज और राष्ट्र प्रगति कर सकता है। राष्ट्रपिता महात्मा गांधी और लाल बहादुर शास्त्री जी को कोटि-कोटि नमन।',
    badge: 'NATIONAL HEROES',
    image: POSTER_IMAGES.morningSuvichar,
  },
  {
    month: 9, // October
    date: 11,
    title: 'शारदीय नवरात्रि प्रारंभ',
    headline: 'शुभ नवरात्रि महोत्सव 🌸🙏',
    subheadline: 'जय माता दी • नव दुर्गा आशीर्वाद',
    quote: 'मां दुर्गा आपके घर और व्यापार में सुख, शांति, समृद्धि और विजय का वास करें। नवरात्रि के पावन पर्व की मंगलकामनाएं!',
    badge: 'NAVRATRI SPECIAL',
    image: POSTER_IMAGES.lakshmi,
  },
  {
    month: 9, // October
    date: 12,
    title: 'विजयादशमी (Dussehra)',
    headline: 'विजयादशमी - दशहरा की शुभकामनाएं 🏹🔥',
    subheadline: 'सत्य की विजय • बुराई का अंत',
    quote: 'बुराई पर अच्छाई और असत्य पर सत्य की विजय के पावन पर्व विजयादशमी की आप सभी को हार्दिक बधाई। जय श्री राम!',
    badge: 'DUSSEHRA SPECIAL',
    image: POSTER_IMAGES.hanuman,
  },
  {
    month: 9, // October
    date: 29,
    title: 'शुभ धनतेरस (Dhanteras)',
    headline: 'धनतेरस की हार्दिक शुभकामनाएं 🪙🪔',
    subheadline: 'धन्वंतरि व लक्ष्मी कृपा • सुख समृद्धि',
    quote: 'भगवान धन्वंतरि आपको आरोग्य और मां लक्ष्मी आपको अटूट धन-संपत्ति प्रदान करें। आपका व्यापार चौगुनी गति से बढ़े!',
    badge: 'DHANTERAS SALE',
    image: POSTER_IMAGES.lakshmi,
  },
  {
    month: 9, // October
    date: 31,
    title: 'दीपावली महापर्व (Diwali)',
    headline: 'दीपावली महापर्व की हार्दिक बधाई 🪔✨',
    subheadline: 'शुभ दीपावली • लक्ष्मी-गणेश कृपा',
    quote: 'दीपों का यह पावन पर्व आपके जीवन और व्यापार में खुशियों, समृद्धि और सफलता की अविरल रोशनी भर दे। शुभ दीपावली!',
    badge: 'DIWALI SPECIAL',
    image: POSTER_IMAGES.lakshmi,
  },
];

/**
 * Generates fresh, live, daily posters dynamically based on today's real date and user refresh offset.
 */
export function getDynamicDailyPosters(offset = 0): {
  todayPosters: DailyCalendarItem[];
  tomorrowPosters: DailyCalendarItem[];
  festivalPosters: DailyCalendarItem[];
  allPosters: DailyCalendarItem[];
  todayFormatted: string;
  tomorrowFormatted: string;
  todayHindiDate: string;
} {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const dayNum = now.getDate();
  const monthNum = now.getMonth();
  const year = now.getFullYear();

  // Tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowDayOfWeek = tomorrow.getDay();
  const tomorrowDayNum = tomorrow.getDate();
  const tomorrowMonthNum = tomorrow.getMonth();

  // Date labels
  const todayFormatted = `${ENG_DAYS[dayOfWeek]}, ${dayNum} ${ENG_MONTHS[monthNum]} ${year}`;
  const todayHindiDate = `${HINDI_DAYS[dayOfWeek]}, ${dayNum} ${HINDI_MONTHS[monthNum]}`;
  const tomorrowFormatted = `${ENG_DAYS[tomorrowDayOfWeek]}, ${tomorrowDayNum} ${ENG_MONTHS[tomorrowMonthNum]}`;

  // Day Theme for today & tomorrow
  const currentDayTheme = DAY_THEMES[dayOfWeek];
  const tomorrowDayTheme = DAY_THEMES[tomorrowDayOfWeek];

  // Day of year for rotating suvichar
  const startOfYear = new Date(year, 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // Rotating suvichar index with offset
  const suvicharIndex1 = (dayOfYear + offset) % SUVICHAR_POOL.length;
  const suvicharIndex2 = (dayOfYear + offset + 1) % SUVICHAR_POOL.length;
  const suvichar1 = SUVICHAR_POOL[suvicharIndex1];
  const suvichar2 = SUVICHAR_POOL[suvicharIndex2];

  // Check if today or upcoming days have festivals
  const todayFestival = FESTIVAL_CALENDAR.find(
    (f) => f.month === monthNum && f.date === dayNum
  );
  const tomorrowFestival = FESTIVAL_CALENDAR.find(
    (f) => f.month === tomorrowMonthNum && f.date === tomorrowDayNum
  );

  const todayPosters: DailyCalendarItem[] = [
    // 1. Primary Devotional / Day-specific Suvichar
    {
      id: `daily-god-${dayOfWeek}-${offset}`,
      title: `${HINDI_DAYS[dayOfWeek]} विशेष स्टेटस`,
      category: 'Daily Suvichar',
      dateLabel: `आज (${HINDI_DAYS[dayOfWeek]})`,
      imageUrl: currentDayTheme.godImage,
      headline: currentDayTheme.godTitle,
      subheadline: currentDayTheme.godSubtitle,
      quoteHindi: currentDayTheme.godQuote,
      badge: currentDayTheme.godBadge,
    },
    // 2. Today's Vyapar Motivation
    {
      id: `daily-vyapar-${dayOfWeek}-${offset}`,
      title: `${HINDI_DAYS[dayOfWeek]} व्यापार प्रेरणा`,
      category: 'Motivation',
      dateLabel: todayFormatted,
      imageUrl: POSTER_IMAGES.morningSuvichar,
      headline: currentDayTheme.vyaparTitle,
      subheadline: currentDayTheme.vyaparSubtitle,
      quoteHindi: currentDayTheme.vyaparQuote,
      badge: currentDayTheme.vyaparBadge,
    },
    // 3. Rotating Life & Business Suvichar
    {
      id: `daily-suvichar-${suvicharIndex1}-${offset}`,
      title: suvichar1.title,
      category: suvichar1.category,
      dateLabel: `सुविचार • ${HINDI_DAYS[dayOfWeek]}`,
      imageUrl: suvichar1.image,
      headline: suvichar1.headline,
      subheadline: 'HAR DIN SHUBH SHURUAT',
      quoteHindi: suvichar1.quote,
      badge: suvichar1.badge,
    },
    // 4. Today's Store Offer / Flash Sale
    {
      id: `daily-offer-${dayOfWeek}-${offset}`,
      title: `${HINDI_DAYS[dayOfWeek]} स्पेशल सेल पोस्टर`,
      category: 'Flash Sale',
      dateLabel: 'आज का ऑफर',
      imageUrl: APP_IMAGES.flashSaleTemplate,
      headline: currentDayTheme.offerTitle,
      subheadline: currentDayTheme.offerSubtitle,
      quoteHindi: currentDayTheme.offerQuote,
      badge: currentDayTheme.offerBadge,
    },
  ];

  // If today is a special festival or national day, put it at the very front!
  if (todayFestival) {
    todayPosters.unshift({
      id: `festival-today-${todayFestival.date}-${offset}`,
      title: todayFestival.title,
      category: 'Festival',
      dateLabel: `🌟 आज विशेष (${todayFestival.title})`,
      imageUrl: todayFestival.image,
      headline: todayFestival.headline,
      subheadline: todayFestival.subheadline,
      quoteHindi: todayFestival.quote,
      badge: todayFestival.badge,
    });
  }

  // Tomorrow Posters
  const tomorrowPosters: DailyCalendarItem[] = [
    {
      id: `tomorrow-god-${tomorrowDayOfWeek}-${offset}`,
      title: `कल (${HINDI_DAYS[tomorrowDayOfWeek]}) एडवांस स्टेटस`,
      category: 'Daily Suvichar',
      dateLabel: `कल (${HINDI_DAYS[tomorrowDayOfWeek]})`,
      imageUrl: tomorrowDayTheme.godImage,
      headline: tomorrowDayTheme.godTitle,
      subheadline: tomorrowDayTheme.godSubtitle,
      quoteHindi: tomorrowDayTheme.godQuote,
      badge: 'KAL KA STATUS',
    },
    {
      id: `tomorrow-vyapar-${tomorrowDayOfWeek}-${offset}`,
      title: `${HINDI_DAYS[tomorrowDayOfWeek]} बिजनेस प्लानिंग`,
      category: 'Motivation',
      dateLabel: tomorrowFormatted,
      imageUrl: POSTER_IMAGES.morningSuvichar,
      headline: tomorrowDayTheme.vyaparTitle,
      subheadline: tomorrowDayTheme.vyaparSubtitle,
      quoteHindi: tomorrowDayTheme.vyaparQuote,
      badge: 'ADVANCE PREVIEW',
    },
    {
      id: `tomorrow-suvichar-${suvicharIndex2}-${offset}`,
      title: suvichar2.title,
      category: suvichar2.category,
      dateLabel: `कल का सुविचार`,
      imageUrl: suvichar2.image,
      headline: suvichar2.headline,
      subheadline: 'ADVANCE SHARING',
      quoteHindi: suvichar2.quote,
      badge: 'INSPIRATION',
    },
  ];

  if (tomorrowFestival) {
    tomorrowPosters.unshift({
      id: `festival-tomorrow-${tomorrowFestival.date}-${offset}`,
      title: tomorrowFestival.title,
      category: 'Festival',
      dateLabel: `कल (${tomorrowFestival.title})`,
      imageUrl: tomorrowFestival.image,
      headline: tomorrowFestival.headline,
      subheadline: tomorrowFestival.subheadline,
      quoteHindi: tomorrowFestival.quote,
      badge: 'UPCOMING FESTIVAL',
    });
  }

  // Upcoming festivals list
  const festivalPosters: DailyCalendarItem[] = FESTIVAL_CALENDAR.map((f, idx) => ({
    id: `fest-item-${idx}-${offset}`,
    title: f.title,
    category: 'Festival',
    dateLabel: `${f.date} ${ENG_MONTHS[f.month]}`,
    imageUrl: f.image,
    headline: f.headline,
    subheadline: f.subheadline,
    quoteHindi: f.quote,
    badge: f.badge,
  }));

  const allPosters = [...todayPosters, ...tomorrowPosters];

  return {
    todayPosters,
    tomorrowPosters,
    festivalPosters,
    allPosters,
    todayFormatted,
    tomorrowFormatted,
    todayHindiDate,
  };
}
