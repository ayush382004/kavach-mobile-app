/**
 * FAQs Page — KavachForWork
 */
import { useState } from 'react';
import Navbar from '../components/Navbar.jsx';

const FAQS = [
  {
    category: 'Coverage & Claims',
    items: [
      { q: 'What temperature triggers a payout?', a: 'When the temperature at your GPS location crosses 45°C, you become eligible to file a claim. The final payout depends on heat severity and your registered state or city pricing slab, so higher-risk locations can receive higher maximum payouts.' },
      { q: 'How does Kavach verify I\'m actually outdoors?', a: 'Our Sentry AI model checks 8 device signals: battery temperature (outdoor batteries heat up above 42°C), GPS network type (mobile data vs home WiFi), screen brightness, battery drain rate, and location jitter. You cannot fake being outdoors from an air-conditioned room.' },
      { q: 'How quickly is the payout credited?', a: 'Approved claims are processed immediately after verification. Depending on your selected destination, money can go to your wallet, linked bank account, or configured UPI route. Flagged claims go to admin review.' },
      { q: 'Can I file multiple claims per day?', a: 'You can file up to 3 claims per day, but typically only one payout per verified heatwave event is processed.' },
    ],
  },
  {
    category: 'Insurance & Payments',
    items: [
      { q: 'How much does weekly coverage cost?', a: 'KavachForWork uses dynamic pricing. Your weekly premium is based on your registered state and city risk profile, and the app shows the exact amount before activation.' },
      { q: 'What happens if I don\'t have enough money in my wallet on renewal day?', a: 'Your insurance is automatically deactivated until you top up and activate again. There is no penalty, but cover stays inactive until the weekly premium is paid.' },
      { q: 'Can I get a refund on my premium?', a: 'Premiums are non-refundable once activated, similar to travel insurance. However, if there was a technical error, contact support via the chatbot.' },
      { q: 'Is this real insurance?', a: 'KavachForWork is an InsurTech prototype demonstrating parametric microinsurance. In production, it would be backed by a licensed insurer under IRDAI regulations. This is a proof-of-concept.' },
    ],
  },
  {
    category: 'Technology',
    items: [
      { q: 'How does the AI detect fraud?', a: 'Our Random Forest model (trained on 8 features) checks if your device\'s battery temperature, network type, screen brightness, and movement patterns match outdoor conditions in 45°C+ heat. Someone claiming from an AC room will have cool battery (<30°C), be on WiFi, and have low screen brightness — all fraud signals.' },
      { q: 'Which weather data source do you use?', a: 'We use WeatherStack API for real-time temperature data at your exact GPS coordinates. This is our "oracle" for the payout trigger — independent of your device.' },
      { q: 'Does the app work on iOS?', a: 'The web app works on iOS Safari. The native battery temperature sensor bridge (for fraud detection) requires Android for full functionality. iOS restricts access to thermal sensors, so iOS users are verified via GPS + network type only.' },
      { q: 'Is my data secure?', a: 'All data is encrypted in transit (TLS) and at rest. We only collect location at claim time — not continuously. Aadhaar/ID data is never stored in plaintext. JWT tokens expire after 7 days.' },
    ],
  },
];

export default function FAQs() {
  const [open, setOpen] = useState({});
  const toggle = (key) => setOpen(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="min-h-screen bg-kavach-warm font-body">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-kavach-dark mb-3">Frequently Asked Questions</h1>
          <p className="text-gray-500 text-lg">Everything you need to know about KavachForWork</p>
        </div>

        <div className="space-y-8">
          {FAQS.map(section => (
            <div key={section.category}>
              <h2 className="font-display font-bold text-kavach-dark text-lg mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-kavach-orange rounded-full" />
                {section.category}
              </h2>
              <div className="space-y-2">
                {section.items.map((item, i) => {
                  const key = `${section.category}-${i}`;
                  const isOpen = open[key];
                  return (
                    <div key={i} className={`card cursor-pointer transition-all duration-200 ${isOpen ? 'border-orange-200 shadow-kavach' : 'hover:border-orange-100'}`}>
                      <button
                        className="w-full text-left flex items-start justify-between gap-3"
                        onClick={() => toggle(key)}
                      >
                        <span className="font-semibold text-kavach-dark text-sm">{item.q}</span>
                        <span className={`text-kavach-orange text-xl flex-shrink-0 transition-transform ${isOpen ? 'rotate-45' : ''}`}>+</span>
                      </button>
                      {isOpen && (
                        <div className="mt-3 pt-3 border-t border-orange-50 text-sm text-gray-600 leading-relaxed animate-fade-in">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 card bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 text-center">
          <div className="text-3xl mb-2">💬</div>
          <h3 className="font-display font-bold text-kavach-dark mb-1">Still have questions?</h3>
          <p className="text-sm text-gray-600 mb-4">Our AI chatbot can answer in your language</p>
          <a href="/chatbot" className="btn-primary text-sm py-2.5 px-6">Chat with Kavach Assistant →</a>
        </div>
      </div>
    </div>
  );
}
