import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  FileText,
  KanbanSquare,
  Mail,
  MessageCircle,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface LandingPageProps {
  onLogin: () => void;
}

const DEFAULT_WHATSAPP_MESSAGE = encodeURIComponent('Bonjour, je souhaite commencer gratuitement avec Telxia.');
const WHATSAPP_URL = import.meta.env.VITE_WHATSAPP_URL || `https://wa.me/33600000000?text=${DEFAULT_WHATSAPP_MESSAGE}`;

const navItems = [
  ['Fonctionnalités', '#fonctionnalites'],
  ['Workflow', '#workflow'],
  ['Documents', '#documents'],
  ['Campagnes', '#campagnes'],
  ['FAQ', '#faq'],
];

export function LandingPage({ onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#F5F8F9] text-[#1C2A32]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-12rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-[#C2D1D5]/70 blur-3xl" />
        <div className="absolute right-[-14rem] top-24 h-[38rem] w-[38rem] rounded-full bg-[#4B8491]/20 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-[rgba(52,77,92,0.12)] bg-[#F5F8F9]/82 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="#top" className="flex items-center gap-3">
            <img src="/logo-talexia.png" alt="Telxia" className="h-10 w-10 rounded-2xl object-contain shadow-sm" />
            <div>
              <div className="font-display text-lg font-bold tracking-tight text-[#1C2A32]">Telxia.fr</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B7F89]">Career OS</div>
            </div>
          </a>
          <div className="hidden items-center gap-7 text-sm font-semibold text-[#6B7F89] lg:flex">
            {navItems.map(([label, href]) => (
              <a key={label} href={href} className="transition-colors hover:text-[#344D5C]">{label}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onLogin} className="hidden rounded-2xl px-4 py-2.5 text-sm font-bold text-[#344D5C] transition-colors hover:bg-white sm:block">
              Se connecter
            </button>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-[#344D5C] px-4 py-2.5 text-sm font-bold text-white shadow-xl shadow-[#344D5C]/15 transition-all hover:-translate-y-0.5 hover:bg-[#4B8491]">
              Commencer gratuitement
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </nav>
      </header>

      <main id="top" className="relative z-10">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-24 lg:pt-24">
          <div className="fade-in-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(52,77,92,0.14)] bg-white/70 px-3 py-1.5 text-xs font-bold text-[#4B8491] shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Career Operating System francophone
            </div>
            <h1 className="font-display text-5xl font-bold leading-[0.98] tracking-tight text-[#1C2A32] md:text-7xl">
              Pilotez vos candidatures avec clarté.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#526A75]">
              Telxia centralise vos candidatures, documents, relances et campagnes email pour vous aider à rester organisé et avancer plus vite vers votre prochaine opportunité.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#4B8491] px-6 py-4 text-sm font-bold text-white shadow-2xl shadow-[#4B8491]/25 transition-all hover:-translate-y-1 hover:bg-[#3F7481]">
                Commencer gratuitement
                <ArrowRight className="h-4 w-4" />
              </a>
              <button onClick={onLogin} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[rgba(52,77,92,0.16)] bg-white/75 px-6 py-4 text-sm font-bold text-[#344D5C] shadow-sm transition-all hover:-translate-y-1 hover:bg-white">
                Voir la plateforme
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-8 grid gap-3 text-sm font-semibold text-[#526A75] sm:grid-cols-3">
              {['Organisation en quelques minutes', 'Suivi clair de vos candidatures', 'Documents et relances centralisés'].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-2xl border border-[rgba(52,77,92,0.12)] bg-white/65 px-3 py-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4B8491]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <HeroMockup />
        </section>

        <ProblemSolution />
        <Workflow />
        <Features />
        <DocumentsSection />
        <CampaignsSection />
        <AnalyticsSection />
        <WhatsAppBand />
        <FAQ />
        <FinalCTA />
      </main>

      <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-2xl shadow-[#25D366]/25 transition-all hover:-translate-y-1" title="Demander un accès gratuit sur WhatsApp">
        <MessageCircle className="h-6 w-6" />
      </a>

      <footer className="relative z-10 border-t border-[rgba(52,77,92,0.14)] bg-white/55 px-5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-talexia.png" alt="Telxia" className="h-10 w-10 rounded-2xl object-contain" />
            <div>
              <div className="font-display font-bold text-[#1C2A32]">Telxia.fr</div>
              <p className="text-sm text-[#6B7F89]">Pilotez vos candidatures avec clarté.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-5 text-sm font-semibold text-[#6B7F89]">
            {navItems.map(([label, href]) => <a key={label} href={href} className="hover:text-[#344D5C]">{label}</a>)}
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="hover:text-[#344D5C]">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HeroMockup() {
  const columns = ['À cibler', 'Postulé', 'Entretien', 'Offre'];
  return (
    <div className="fade-in-up relative" style={{ animationDelay: '120ms' }}>
      <div className="absolute -inset-8 rounded-[2rem] bg-[#4B8491]/10 blur-3xl" />
      <div className="relative rounded-[1.75rem] border border-[rgba(52,77,92,0.16)] bg-white/80 p-4 shadow-2xl shadow-[#344D5C]/12 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between rounded-3xl bg-[#1F313B] p-4 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C2D1D5]">Dashboard Telxia</p>
            <h2 className="mt-1 font-display text-2xl font-bold">Recherche en mouvement</h2>
          </div>
          <div className="rounded-2xl bg-[#4B8491] px-3 py-2 text-xs font-bold">+12 actions</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Candidatures', '38'],
            ['Entretiens', '6'],
            ['Réponses', '29%'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-[rgba(52,77,92,0.12)] bg-[#F5F8F9] p-4">
              <p className="text-xs font-semibold text-[#6B7F89]">{label}</p>
              <p className="mt-2 font-display text-3xl font-bold text-[#344D5C]">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          {columns.map((column, index) => (
            <div key={column} className="rounded-3xl border border-[rgba(52,77,92,0.12)] bg-[#F5F8F9] p-3">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7F89]">{column}</p>
              {[0, 1, 2].slice(0, index === 3 ? 1 : 3).map((item) => (
                <div key={item} className="mb-2 rounded-2xl bg-white p-3 shadow-sm">
                  <p className="text-sm font-bold text-[#1C2A32]">{['Data Analyst', 'Dev Backend', 'Product Ops'][item]}</p>
                  <p className="mt-1 text-xs text-[#6B7F89]">{['Capgemini', 'Doctolib', 'Qonto'][item]}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProblemSolution() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <div className="mb-10 max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#4B8491]">Problème vs solution</p>
        <h2 className="mt-3 font-display text-4xl font-bold text-[#1C2A32] md:text-5xl">Vous postulez partout, mais vous perdez le fil ?</h2>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <CompareCard title="Sans Telxia" tone="muted" items={['Candidatures dispersées', 'CV perdus dans les dossiers', 'Relances oubliées', 'Aucune vision claire']} />
        <CompareCard title="Avec Telxia" tone="brand" items={['Pipeline clair', 'Documents organisés', 'Relances suivies', 'Progression mesurable']} />
      </div>
    </section>
  );
}

function CompareCard({ title, items, tone }: { title: string; items: string[]; tone: 'muted' | 'brand' }) {
  return (
    <div className={`rounded-[1.5rem] border p-6 ${tone === 'brand' ? 'border-[#4B8491]/25 bg-[#344D5C] text-white shadow-2xl shadow-[#344D5C]/15' : 'border-[rgba(52,77,92,0.14)] bg-white/75 text-[#1C2A32]'}`}>
      <h3 className="font-display text-2xl font-bold">{title}</h3>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div key={item} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${tone === 'brand' ? 'bg-white/10 text-[#F5F8F9]' : 'bg-[#F5F8F9] text-[#526A75]'}`}>
            <CheckCircle2 className={`h-4 w-4 ${tone === 'brand' ? 'text-[#C2D1D5]' : 'text-[#4B8491]'}`} />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function Workflow() {
  const steps = [
    ['01', 'Ajoutez ou importez une candidature', 'Capturez une opportunité, une entreprise, un statut et les informations utiles.'],
    ['02', 'Associez vos CV, notes et documents', 'Gardez chaque pièce dans le bon contexte, sans chercher dans vos dossiers.'],
    ['03', 'Suivez l’évolution dans votre pipeline', 'Priorisez, relancez et mesurez votre progression jusqu’à l’entretien.'],
  ];
  return (
    <section id="workflow" className="bg-[#1F313B] px-5 py-24 text-white lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#C2D1D5]">Workflow</p>
          <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">De l’offre à l’entretien, gardez le contrôle.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map(([number, title, text]) => (
            <div key={number} className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-6">
              <div className="mb-8 inline-flex rounded-2xl bg-[#4B8491] px-3 py-2 text-sm font-bold">{number}</div>
              <h3 className="font-display text-xl font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#C2D1D5]">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    [KanbanSquare, 'Pipeline Kanban', 'Visualisez chaque candidature par étape.'],
    [FileText, 'Bibliothèque documents', 'CV, lettres, certificats et portfolios centralisés.'],
    [BriefcaseBusiness, 'Candidatures spontanées', 'Organisez vos campagnes de prospection.'],
    [Mail, 'Campagnes email', 'Destinataires, pièces jointes et logs d’envoi.'],
    [BarChart3, 'Analytics', 'Mesurez vos réponses, entretiens et progression.'],
    [NotebookPen, 'Notes et suivi', 'Gardez le contexte de chaque échange.'],
  ] as const;
  return (
    <section id="fonctionnalites" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
      <div className="mb-12 max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#4B8491]">Fonctionnalités</p>
        <h2 className="mt-3 font-display text-4xl font-bold text-[#1C2A32] md:text-5xl">Un espace sérieux pour une recherche qui avance.</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map(([Icon, title, text]) => (
          <div key={title} className="rounded-[1.5rem] border border-[rgba(52,77,92,0.14)] bg-white/75 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[#344D5C]/10">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C2D1D5]/55 text-[#344D5C]">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="font-display text-xl font-bold text-[#1C2A32]">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-[#6B7F89]">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DocumentsSection() {
  return (
    <SplitSection
      id="documents"
      eyebrow="Documents"
      title="Vos pièces prêtes au bon moment."
      text="Centralisez CV, lettres de motivation, portfolio et certificats dans un espace organisé avec stockage sécurisé."
      bullets={['CV et variantes par poste', 'Lettres de motivation', 'Portfolio et certificats', 'Stockage sécurisé Amazon S3']}
      icon={<UploadCloud className="h-5 w-5" />}
      mockup="[IMAGE À GÉNÉRER : mockup dashboard Telxia avec bibliothèque documents, CV, lettres et certificats dans une interface bleu-gris premium]"
    />
  );
}

function CampaignsSection() {
  return (
    <SplitSection
      id="campagnes"
      eyebrow="Campagnes email"
      title="Envoyez vos candidatures spontanées avec méthode."
      text="Importez vos contacts, préparez vos messages, joignez vos documents et suivez les logs d’envoi depuis Gmail connecté par utilisateur."
      bullets={['Import contacts', 'Templates de messages', 'Pièces jointes S3', 'Logs d’envoi', 'Gmail connecté par utilisateur']}
      icon={<Mail className="h-5 w-5" />}
      mockup="[IMAGE À GÉNÉRER : mockup campagnes email Telxia avec contacts, templates, pièces jointes et logs d’envoi]"
      reverse
    />
  );
}

function AnalyticsSection() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
      <div className="rounded-[1.75rem] bg-[#344D5C] p-6 text-white shadow-2xl shadow-[#344D5C]/20 md:p-10">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#C2D1D5]">Analytics</p>
            <h2 className="mt-3 font-display text-4xl font-bold">Transformez votre recherche en progression visible.</h2>
            <p className="mt-5 leading-7 text-[#C2D1D5]">Suivez candidatures par mois, taux de réponse, entretiens, types de contrats et progression pipeline.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {['Candidatures par mois', 'Taux de réponse', 'Entretiens', 'Types de contrats'].map((label, index) => (
              <div key={label} className="rounded-3xl bg-white/10 p-5">
                <p className="text-sm text-[#C2D1D5]">{label}</p>
                <p className="mt-3 font-display text-3xl font-bold">{['38', '29%', '6', '4'][index]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SplitSection(props: { id: string; eyebrow: string; title: string; text: string; bullets: string[]; icon: ReactNode; mockup: string; reverse?: boolean }) {
  return (
    <section id={props.id} className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <div className={`grid items-center gap-8 lg:grid-cols-2 ${props.reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
        <div>
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C2D1D5]/60 text-[#344D5C]">{props.icon}</div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#4B8491]">{props.eyebrow}</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-[#1C2A32]">{props.title}</h2>
          <p className="mt-5 leading-7 text-[#526A75]">{props.text}</p>
          <div className="mt-6 grid gap-3">
            {props.bullets.map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm font-semibold text-[#344D5C]">
                <ShieldCheck className="h-4 w-4 text-[#4B8491]" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-[rgba(52,77,92,0.14)] bg-white/80 p-6 text-sm font-semibold leading-7 text-[#6B7F89] shadow-xl shadow-[#344D5C]/8">
          {props.mockup}
        </div>
      </div>
    </section>
  );
}

function WhatsAppBand() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-12 text-center lg:px-8">
      <div className="rounded-[1.75rem] border border-[rgba(52,77,92,0.14)] bg-white/80 p-8 shadow-xl shadow-[#344D5C]/8">
        <h2 className="font-display text-3xl font-bold text-[#1C2A32]">Envie de tester Telxia ?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-[#6B7F89]">Échangez directement avec nous sur WhatsApp et obtenez un accès de test.</p>
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 py-4 text-sm font-bold text-white shadow-xl shadow-[#25D366]/20 transition-all hover:-translate-y-1">
          <MessageCircle className="h-5 w-5" />
          Demander un accès gratuit
        </a>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    ['Telxia est-il gratuit ?', 'Un accès de test peut être demandé gratuitement via WhatsApp.'],
    ['Est-ce adapté aux alternants ?', 'Oui, Telxia est pensé pour emploi, stage et alternance.'],
    ['Puis-je stocker mes CV ?', 'Oui, vous pouvez organiser CV, lettres, portfolio et certificats.'],
    ['Puis-je envoyer des candidatures spontanées ?', 'Oui, Telxia inclut des campagnes email avec contacts, pièces jointes et logs.'],
    ['Mes documents sont-ils sécurisés ?', 'Les documents sont stockés côté backend et peuvent être envoyés vers Amazon S3.'],
    ['Comment fonctionne la connexion Gmail ?', 'Chaque utilisateur connecte son propre Gmail. Le token est lié à son compte Telxia uniquement.'],
  ];
  return (
    <section id="faq" className="mx-auto max-w-4xl px-5 py-24 lg:px-8">
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#4B8491]">FAQ</p>
        <h2 className="mt-3 font-display text-4xl font-bold text-[#1C2A32]">Questions fréquentes</h2>
      </div>
      <div className="mt-10 grid gap-3">
        {items.map(([question, answer]) => (
          <details key={question} className="group rounded-3xl border border-[rgba(52,77,92,0.14)] bg-white/75 p-5 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold text-[#1C2A32]">
              {question}
              <BookOpenCheck className="h-5 w-5 text-[#4B8491]" />
            </summary>
            <p className="mt-3 leading-7 text-[#6B7F89]">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-5 pb-24 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-[2rem] bg-[#1F313B] p-8 text-center text-white shadow-2xl shadow-[#344D5C]/20 md:p-14">
        <h2 className="font-display text-4xl font-bold md:text-5xl">Reprenez le contrôle de votre recherche d’emploi.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-[#C2D1D5]">Centralisez, suivez et progressez avec une plateforme pensée pour les candidats modernes.</p>
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#4B8491] px-6 py-4 text-sm font-bold text-white shadow-xl shadow-[#4B8491]/25 transition-all hover:-translate-y-1">
          Commencer gratuitement sur WhatsApp
          <MessageCircle className="h-5 w-5" />
        </a>
      </div>
    </section>
  );
}
