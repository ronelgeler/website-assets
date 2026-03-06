module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { Name, Phone } = req.body;

  // Format the request for Brevo
  const brevoData = {
    sender: { 
      name: "האתר שלי", 
      email: "noreply@ronelgeler.site" 
    },
    to: [{ 
      email: "ronelgeler@gmail.com", 
      name: "רונאל גלר" 
    }],
    subject: "קיבלת פנייה חדשה מבעל עסק!",
    htmlContent: `
      <h2 dir="rtl">ליד חדש מהאתר:</h2>
      <p dir="rtl"><strong>שם:</strong> ${Name}</p>
      <p dir="rtl"><strong>טלפון:</strong> ${Phone}</p>
    `
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        // This pulls your key SECURELY from Vercel's Environment Variables
        'api-key': process.env.BREVO_API_KEY, 
        'content-type': 'application/json'
      },
      body: JSON.stringify(brevoData)
    });

    if (response.ok) {
      res.status(200).json({ success: true });
    } else {
      const errorData = await response.json();
      res.status(500).json({ error: 'Failed to send to Brevo', details: errorData });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
}
