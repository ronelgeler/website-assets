const crypto = require('crypto');

// פונקציית עזר להצפנת הנתונים (פייסבוק דורשת SHA256)
function hashData(data) {
  if (!data) return null;
  // ניקוי תווים שאינם מספרים מהטלפון
  let cleanData = data.replace(/\D/g, '');
  
  // פייסבוק דורשת קידומת מדינה. בהנחה שמדובר בישראל (05...)
  if (cleanData.startsWith('0')) {
    cleanData = '972' + cleanData.substring(1);
  }
  
  return crypto.createHash('sha256').update(cleanData).digest('hex');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      console.error('Error parsing body:', e);
    }
  }

  const { Name, Phone } = body || {};

  if (!Name || !Phone) {
    return res.status(400).json({ error: 'Name and Phone are required.' });
  }

  // 1. שליחת המייל דרך Brevo (הקוד המקורי שלך)
  const brevoData = {
    sender: { name: "האתר שלי", email: "ronelgeler@gmail.com" },
    to: [{ email: "ronelgeler@gmail.com", name: "רונאל גלר" }],
    subject: "קיבלת פנייה חדשה מבעל עסק!",
    htmlContent: `
      <h2 dir="rtl">ליד חדש מהאתר:</h2>
      <p dir="rtl"><strong>שם:</strong> ${Name}</p>
      <p dir="rtl"><strong>טלפון:</strong> ${Phone}</p>
    `
  };

  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY || '', 
        'content-type': 'application/json'
      },
      body: JSON.stringify(brevoData)
    });
  } catch (error) {
    console.error('Brevo API Error:', error);
    // ממשיכים בכל זאת כדי לנסות לשלוח לפייסבוק
  }

  // 2. שליחת האירוע לפייסבוק פיקסל (Conversions API)
  // מומלץ להעביר את ה-Pixel ID וה-Token למשתני סביבה ב-Vercel!
  const PIXEL_ID = process.env.FB_PIXEL_ID || 'הכנס_את_מזהה_הפיקסל_שלך_כאן'; 
  const FB_TOKEN = process.env.FB_ACCESS_TOKEN || 'EAAUvFuURnkEBQ9FhZA8vPjp6i5xfrGYGV5WGdzZBacdnoOyEVLS5vpNH6k7ZCZAtPMGd7gPMyPBo8qObUOqhRvUQUYN1Xm6f2xxcQzbSi7KTKIcrCuXY87pv4R8QZBHL39QNsKZBVOYK82IkxLlhX5iyWuZABWZCzfCd9mZAgdobi98AXdMaS3gDv1ibk5NlsBwZDZD';

  const currentTime = Math.floor(Date.now() / 1000);

  const fbPayload = {
    data: [
      {
        event_name: "Lead", // שיניתי מ-Purchase ל-Lead בהתאם לטופס שלך
        event_time: currentTime,
        action_source: "website",
        user_data: {
          ph: [hashData(Phone)] // מצפין את מספר הטלפון שהוזן בטופס
        }
      }
    ]
  };

  try {
    const fbResponse = await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${FB_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fbPayload)
    });
    
    const fbResult = await fbResponse.json();
    if (!fbResponse.ok) console.error('Facebook API Error:', fbResult);
    
    // החזרת תשובה חיובית למשתמש
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('FB Fetch Error:', error);
    res.status(500).json({ error: 'Server error', details: error.message || error.toString() });
  }
}
