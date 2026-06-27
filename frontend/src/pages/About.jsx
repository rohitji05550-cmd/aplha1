import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Sparkles, ShieldCheck, HandCoins, Eye, Rocket, Phone, Mail, MapPin, Quote } from 'lucide-react';
import { COMPANY_INFO } from '../data/zones';

const VALUES = [
  { i: ShieldCheck, t: 'Pure neutrality', d: 'We earn no commission from any freezone. Our recommendation engine ranks zones purely on your activity, budget, visa quota and processing time.' },
  { i: Eye, t: 'Official prices only', d: 'We publish the exact government / authority fee + a single transparent service fee. No artificially inflated starting prices, no hidden processing markup.' },
  { i: HandCoins, t: 'Founder-friendly', d: 'Honest pricing, no oversell, no high-pressure follow-ups. Free advisory for the first 500 founders — we are building trust before we grow.' },
  { i: Rocket, t: 'Faster & transparent', d: 'We submit directly to freezone portals, track applications in real time and send proactive WhatsApp / email updates. No more chasing the consultant for status.' },
];

const DIFFERENTIATORS = [
  { title: 'AI-Powered Research', body: 'Our AI Activity Search instantly maps any business activity to the correct DED / authority code and the best-suited freezone across 12,719 indexed records. Something no other UAE advisory platform currently offers.' },
  { title: 'Real People, Real Advice', body: 'Every client gets a dedicated advisor who stays with them through the entire process — from activity code confirmation to Emirates ID dispatch and beyond.' },
  { title: 'Lifetime renewal & compliance reminders', body: 'Founder Club members get 90 / 60 / 30 / 7-day reminders for every renewal, VAT filing, ESR / UBO declaration and visa expiry. Never get fined for a missed deadline.' },
  { title: 'Single platform for everything', body: 'Activity search, freezone compare, cost calculator, founder portal, document vault, compliance hub and renewal engine — all in one dashboard so a founder has one source of truth.' },
];

const TEAM = [
  { initials: 'PC', name: 'Pankaj Choudhary', title: 'Founder', body: 'Nanotechnology engineer at heart — earlier years spent in deep research alongside scientists from IIT Bombay, Amity University, NSIC, Rajasthan University and the Centre for Converging Technologies (CCT). Years of guiding businesses through scale-up taught him that founders rarely need more advice — they need honest pricing, real deadlines and one person who picks up the phone. SmartSetupUAE.ae is that platform.' },
  { initials: 'SJ', name: 'Sarah Jenkins', title: 'Senior Setup Consultant', body: 'Specialist in investor visa applications, Emirates ID, freezone documentation and post-incorporation banking. UAE regulatory experience across IFZA, RAKEZ, DMCC and ANCFZ.' },
  { initials: 'MA', name: 'Mohammed Alam', title: 'Compliance & Legal Advisor', body: 'UAE commercial law, MOA drafting, corporate compliance, VAT / Corporate Tax registration and AML/UBO filings. Fluent in Arabic, English, Hindi and Urdu.' },
];

export default function About() {
  return (
    <div data-testid="about-page">
      <Navbar />

      <section className="hero-gradient grain">
        <div className="max-w-[1480px] mx-auto px-5 lg:px-8 pt-3 lg:pt-6 pb-10 text-center">
          <div className="inline-flex items-center gap-2 fade-up justify-center">
            <Sparkles className="h-4 w-4 brand-bronze" />
            <span className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">Our Story</span>
          </div>
          <h1 className="mt-3 font-display font-semibold text-slate-900 fade-up delay-100" style={{ fontSize: 'clamp(1.9rem, 4vw, 3.6rem)', lineHeight: 1.06 }}>
            UAE business setup—<span className="shine-text">made honest again.</span>
          </h1>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto fade-up delay-200" style={{ fontSize: 'clamp(0.95rem, 1.05vw, 1.05rem)' }}>
            Built by a founder, for founders. No hidden agenda. No freezone commissions. Just honest, data-driven advice for entrepreneurs who deserve a fair starting point.
          </p>
        </div>
      </section>

      {/* FOUNDER STORY */}
      <section className="py-12 lg:py-16 bg-[#FFFCF5]">
        <div className="max-w-[1480px] mx-auto px-5 lg:px-8 grid lg:grid-cols-[260px_1fr] gap-10 items-start">
          <div>
            <div className="h-40 w-40 rounded-3xl bg-gradient-to-br from-emerald-700 to-emerald-900 grid place-items-center text-white font-display text-5xl font-bold shadow-xl">PC</div>
            <div className="mt-5 font-display text-xl font-semibold text-slate-900">Pankaj Choudhary</div>
            <div className="text-sm text-slate-500">Founder · Engineer · Researcher</div>
            <div className="text-xs text-slate-500 mt-1">{COMPANY_INFO.legalName}</div>
            <a href={`https://wa.me/${COMPANY_INFO.whatsappNumber}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 px-4 h-10 rounded-full bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800">
              <Phone className="h-4 w-4" /> Book a call with Pankaj
            </a>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] font-bold brand-bronze">Founder’s Vision</div>
            <h2 className="font-display text-2xl lg:text-3xl font-semibold text-slate-900 mt-2">Why I built SmartSetupUAE.ae</h2>
            <div className="mt-5 space-y-4 text-slate-700 leading-relaxed text-[15px]">
              <p className="flex gap-3"><Quote className="h-5 w-5 brand-emerald shrink-0 mt-1" /><span>“I am not a typical consultant — I am a founder. I started as a nanotechnology engineer in India and fell in love with deep research, working alongside scientists from IIT Bombay, Amity University, NSIC, Rajasthan University and the Centre for Converging Technologies (CCT). I have spent years helping businesses scale up — guiding founders through product, operations and growth. That is the world I come from.”</span></p>
              <p className="flex gap-3"><Quote className="h-5 w-5 brand-emerald shrink-0 mt-1" /><span>“When I moved to the UAE I saw the exact problem I had been solving for others — but this time for myself. Every consultant quoted a different price. VAT registration, Corporate Tax registration, visa renewal, medical, Emirates ID, MOA drafting, bank-opening documents — five different numbers from five different people. Nobody could tell me clearly which freezone fit my activity, where I should live, what the real renewal cost would be, or what compliance deadline was coming next. There was no single, honest source of truth.”</span></p>
              <p className="flex gap-3"><Quote className="h-5 w-5 brand-emerald shrink-0 mt-1" /><span>“I thought — if I am confused, hundreds of first-time founders with limited budgets must be drowning. So I decided to stop waiting for someone else to fix it. I have always believed: see the issue, solve the issue. SmartSetupUAE.ae is my answer — one platform where every founder gets honest, data-driven advice on which jurisdiction fits, what it actually costs, where to live and stay, when the next renewal is due, and how to stay compliant. No commissions from any freezone. Free advisory for the first 500 founders. A single place where peace of mind lives, so a founder can build instead of chasing reminders.”</span></p>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-slate-500">Company</div>
                <div className="font-semibold text-slate-900 mt-1">{COMPANY_INFO.legalName}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-slate-500">Licence</div>
                <div className="font-semibold text-slate-900 mt-1">{COMPANY_INFO.license}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-slate-500">Established</div>
                <div className="font-semibold text-slate-900 mt-1">August 2025</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-slate-500">Registered office</div>
                <div className="font-semibold text-slate-900 mt-1">{COMPANY_INFO.address}</div>
              </div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 brand-emerald" /> <span className="font-semibold text-slate-900">{COMPANY_INFO.phone}</span></div>
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 brand-emerald" /> <span className="font-semibold text-slate-900">{COMPANY_INFO.email}</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY DIFFERENT */}
      <section className="py-16 bg-[#F8F3E8]">
        <div className="max-w-[1480px] mx-auto px-5 lg:px-8">
          <div className="max-w-2xl">
            <div className="text-[10px] uppercase tracking-[0.22em] font-bold brand-bronze">Why SmartSetupUAE.ae</div>
            <h2 className="mt-2 font-display text-2xl lg:text-4xl font-semibold text-slate-900">What makes us genuinely different</h2>
            <p className="mt-3 text-slate-600 text-base">Pure neutrality, official prices, a real human advisor, lifelong compliance reminders — and the only AI-powered activity search in the UAE setup industry.</p>
          </div>
          <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {VALUES.map((v, i) => (
              <div key={i} className="card-elevated rounded-2xl p-6">
                <div className="h-11 w-11 rounded-xl bg-emerald-50 grid place-items-center"><v.i className="h-5 w-5 brand-emerald" /></div>
                <div className="font-display text-lg font-semibold text-slate-900 mt-4">{v.t}</div>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{v.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid md:grid-cols-2 gap-5">
            {DIFFERENTIATORS.map((d, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="font-semibold text-slate-900">{d.title}</div>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="py-16 bg-[#FFFCF5]">
        <div className="max-w-[1480px] mx-auto px-5 lg:px-8">
          <div className="text-[10px] uppercase tracking-[0.22em] font-bold brand-bronze">Our Team</div>
          <h2 className="mt-2 font-display text-2xl lg:text-4xl font-semibold text-slate-900">The people behind SmartSetupUAE.ae</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {TEAM.map((m) => (
              <div key={m.name} className="card-elevated rounded-2xl p-6 text-center">
                <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 text-white font-display text-2xl font-bold grid place-items-center">{m.initials}</div>
                <div className="font-display text-lg font-semibold text-slate-900 mt-4">{m.name}</div>
                <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">{m.title}</div>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{m.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">To update team photos: contact director@axiscrestglobal.com with a 800×800 photo and a short bio.</p>
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 bg-[#F8F3E8]">
        <div className="max-w-[1480px] mx-auto px-5 lg:px-8 grid lg:grid-cols-4 gap-8 items-start">
          {[
            { n: '40+', l: 'UAE jurisdictions compared' },
            { n: '12,719', l: 'Business activities indexed' },
            { n: 'AED 4,888', l: 'Lowest verified freezone licence' },
            { n: '500', l: 'Free-advisory founders served' },
          ].map((s) => (
            <div key={s.l}>
              <div className="font-display text-4xl font-bold brand-emerald">{s.n}</div>
              <div className="mt-2 text-slate-600 max-w-xs">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT STRIP */}
      <section className="py-12 bg-[#0F2A2A] text-white">
        <div className="max-w-[1480px] mx-auto px-5 lg:px-8 grid md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#F0C674]" /> {COMPANY_INFO.phone}</div>
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#F0C674]" /> {COMPANY_INFO.email}</div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#F0C674]" /> {COMPANY_INFO.address}</div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
