import type { Intent, ServiceCategory } from './types';

// Simple helper to detect language
function detectLanguage(text: string): 'English' | 'Urdu' | 'Roman Urdu' | 'Unknown' {
  const lowercase = text.toLowerCase();
  
  // Urdu script regex (Arabic/Urdu unicode range)
  const urduScriptRegex = /[\u0600-\u06FF]/;
  if (urduScriptRegex.test(text)) {
    return 'Urdu';
  }

  // Common Roman Urdu keywords
  const romanUrduKeywords = [
    'mujhe', 'chahiye', 'chahye', 'kal', 'subah', 'dophar', 'shaam', 'aaj', 'abhi', 'baje', 
    'krwana', 'karwana', 'hai', 'kaam', 'wala', 'ko', 'mein', 'me', 'ke', 'ki', 'he', 'se'
  ];
  
  const words = lowercase.split(/\s+/);
  const romanMatchCount = words.filter(word => romanUrduKeywords.includes(word)).length;
  
  if (romanMatchCount >= 2) {
    return 'Roman Urdu';
  }

  // English keywords or default to English if letters are Latin
  const englishKeywords = [
    'need', 'want', 'tomorrow', 'morning', 'afternoon', 'evening', 'today', 'now', 'asap', 
    'plumber', 'electrician', 'tutor', 'teacher', 'beautician', 'salon', 'repair', 'service'
  ];
  const englishMatchCount = words.filter(word => englishKeywords.includes(word)).length;

  if (englishMatchCount >= 1 || /^[a-zA-Z0-9\s,.-]+$/.test(text)) {
    return 'English';
  }

  return 'Unknown';
}

// Local parser fallback
export function parseIntentLocally(text: string): Intent {
  const lowercase = text.toLowerCase();
  const language = detectLanguage(text);

  let serviceCategory: ServiceCategory | null = null;
  let serviceType = '';
  
  // 1. Extract Service Category
  if (
    lowercase.includes('ac') || 
    lowercase.includes('air conditioner') || 
    lowercase.includes('cooling') || 
    lowercase.includes('اے سی') || 
    lowercase.includes('ایسی') ||
    lowercase.includes('ac wala')
  ) {
    serviceCategory = 'ac_technician';
    serviceType = 'AC Technician';
  } else if (
    lowercase.includes('plumber') || 
    lowercase.includes('pipe') || 
    lowercase.includes('leak') || 
    lowercase.includes('tap') || 
    lowercase.includes('null') || 
    lowercase.includes('nal') || 
    lowercase.includes('پلمبر') || 
    lowercase.includes('نل')
  ) {
    serviceCategory = 'plumber';
    serviceType = 'Plumber';
  } else if (
    lowercase.includes('electrician') || 
    lowercase.includes('bijli') || 
    lowercase.includes('fan') || 
    lowercase.includes('light') || 
    lowercase.includes('board') || 
    lowercase.includes('wiring') || 
    lowercase.includes('switches') || 
    lowercase.includes('الیکٹریشن') || 
    lowercase.includes('بجلی')
  ) {
    serviceCategory = 'electrician';
    serviceType = 'Electrician';
  } else if (
    lowercase.includes('tutor') || 
    lowercase.includes('teacher') || 
    lowercase.includes('math') || 
    lowercase.includes('physics') || 
    lowercase.includes('chemistry') || 
    lowercase.includes('study') || 
    lowercase.includes('class') || 
    lowercase.includes('tuition') || 
    lowercase.includes('parhana') || 
    lowercase.includes('ٹیوٹر') || 
    lowercase.includes('ٹیچر') || 
    lowercase.includes('پڑھانا')
  ) {
    serviceCategory = 'tutor';
    serviceType = 'Tutor';
  } else if (
    lowercase.includes('beautician') || 
    lowercase.includes('makeup') || 
    lowercase.includes('hair') || 
    lowercase.includes('salon') || 
    lowercase.includes('parlor') || 
    lowercase.includes('facial') || 
    lowercase.includes('threading') || 
    lowercase.includes('waxing') || 
    lowercase.includes('dulhan') || 
    lowercase.includes('بیوٹیشن') || 
    lowercase.includes('میک اپ')
  ) {
    serviceCategory = 'beautician';
    serviceType = 'Beautician';
  } else {
    // Default fallback or smart guess
    serviceCategory = 'ac_technician';
    serviceType = 'AC Technician';
  }

  // 2. Extract Location Sector
  let location = 'G-13'; // Default sector if not found
  const sectors = ['G-13', 'F-11', 'I-8', 'H-12', 'E-11', 'DHA', 'F-6', 'F-7', 'G-10', 'BAHRIA'];
  
  for (const s of sectors) {
    // Check various representations: "g13", "g-13", "g 13"
    const cleanedSector = s.toLowerCase().replace('-', '');
    const regex = new RegExp(`\\b${cleanedSector}\\b|\\b${s.toLowerCase()}\\b|\\b${s.toLowerCase().replace('-', ' ')}\\b`, 'i');
    if (regex.test(lowercase)) {
      location = s;
      break;
    }
  }

  // Extra check for Urdu script sectors (if user typed in Urdu)
  if (text.includes('جی ۱۳') || text.includes('جی-۱۳') || text.includes('جی تیرا')) location = 'G-13';
  else if (text.includes('ایف ۱۱') || text.includes('ایف-۱۱')) location = 'F-11';
  else if (text.includes('آئی ۸') || text.includes('آئی-۸')) location = 'I-8';
  else if (text.includes('ڈی ایچ اے')) location = 'DHA';

  // 3. Extract Time
  let time = 'Tomorrow morning';
  if (
    lowercase.includes('kal subah') || 
    lowercase.includes('tomorrow morning') || 
    lowercase.includes('kal 10 baje') ||
    text.includes('کل صبح')
  ) {
    time = 'Tomorrow morning (10:00 AM)';
  } else if (
    lowercase.includes('kal dophar') || 
    lowercase.includes('tomorrow afternoon') || 
    lowercase.includes('kal 2 baje') ||
    text.includes('کل دوپہر')
  ) {
    time = 'Tomorrow afternoon (02:00 PM)';
  } else if (
    lowercase.includes('kal sham') || 
    lowercase.includes('tomorrow evening') || 
    lowercase.includes('kal 5 baje') ||
    text.includes('کل شام')
  ) {
    time = 'Tomorrow evening (05:00 PM)';
  } else if (
    lowercase.includes('aaj') || 
    lowercase.includes('today') ||
    text.includes('آج')
  ) {
    time = 'Today (04:00 PM)';
  } else if (
    lowercase.includes('abhi') || 
    lowercase.includes('now') || 
    lowercase.includes('fauri') || 
    lowercase.includes('asap') || 
    lowercase.includes('urgent') ||
    text.includes('ابھی') || 
    text.includes('فوری')
  ) {
    time = 'Immediate / Now';
  }

  return {
    serviceType,
    serviceCategory,
    location,
    time,
    confidence: serviceCategory ? 0.9 : 0.4,
    language
  };
}

// Live Gemini API parser
export async function parseIntentWithGemini(text: string, apiKey: string): Promise<Intent> {
  try {
    const prompt = `You are the Intent Discovery Agent for the Antigravity Service Orchestration platform.
Your task is to parse a home service request (which can be in English, Urdu in Arabic script, or Roman Urdu like "Mujhe kal G-13 me ac repair wala chahye").

Extract the following variables:
1. Service category (must match one of these exact values: "ac_technician", "plumber", "electrician", "tutor", "beautician" or null if unrecognized).
2. Clean service name in English (e.g. "AC Technician", "Plumber", "Electrician", "Tutor", "Beautician").
3. Location sector in Islamabad (must map to one of: "G-13", "F-11", "I-8", "H-12", "E-11", "DHA", "F-6", "F-7", "G-10", "BAHRIA". If not found or not specified, choose the most likely sector or default to "G-13").
4. Requested Time/Slot in clean English (e.g., "Tomorrow morning (10:00 AM)", "Tomorrow afternoon (02:00 PM)", "Today (04:00 PM)", "Immediate / Now").
5. Language detected (must be one of: "English", "Urdu", "Roman Urdu", "Unknown").
6. Confidence level (0.0 to 1.0).

Return ONLY a JSON object with this shape:
{
  "serviceCategory": "ac_technician" | "plumber" | "electrician" | "tutor" | "beautician" | null,
  "serviceType": "string",
  "location": "string",
  "time": "string",
  "language": "English" | "Urdu" | "Roman Urdu" | "Unknown",
  "confidence": number
}

User request: "${text}"`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) {
      throw new Error('Invalid response structure from Gemini API');
    }

    const parsedResult = JSON.parse(jsonText.trim());
    
    return {
      serviceType: parsedResult.serviceType || 'AC Technician',
      serviceCategory: parsedResult.serviceCategory as ServiceCategory || 'ac_technician',
      location: parsedResult.location || 'G-13',
      time: parsedResult.time || 'Tomorrow morning',
      confidence: parsedResult.confidence || 0.8,
      language: parsedResult.language || 'English'
    };
  } catch (error) {
    console.error('Gemini parsing failed, falling back to local parsing:', error);
    // Fallback to local parsing on error
    return parseIntentLocally(text);
  }
}
