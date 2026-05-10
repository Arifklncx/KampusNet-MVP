import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const stats = [
  { label: "Aktif Öğrenci", value: "50K+" },
  { label: "Üniversite", value: "180+" },
  { label: "Günlük Paylaşım", value: "5K+" },
];

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Sadece Üniversite Öğrencileri",
    desc: "Yalnızca .edu.tr e-posta adresiyle kayıt — güvenilir bir kampüs topluluğu.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
    title: "Kampüs Filtresi",
    desc: "Kendi üniversitendeki paylaşımları veya tüm öğrencilerin içeriklerini görüntüle.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "Gerçek Zamanlı Etkileşim",
    desc: "Gönderi paylaş, beğen, yorum yap — kampüsünle bağlantıda kal.",
  },
];

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={`${basePath}/logo.svg`} alt="Kampüsnet" className="w-8 h-8" />
            <span className="font-bold text-xl text-primary">Kampüsnet</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setLocation("/sign-in")} data-testid="button-sign-in">
              Giriş Yap
            </Button>
            <Button onClick={() => setLocation("/sign-up")} data-testid="button-sign-up">
              Kayıt Ol
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-24 bg-gradient-to-br from-primary/5 via-background to-accent/30">
        <div className="max-w-3xl mx-auto text-center animate-fade-in-up">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary border-primary/20">
            Sadece .edu.tr e-posta ile kayıt
          </Badge>
          <h1 className="text-5xl md:text-6xl font-extrabold text-foreground leading-tight mb-6">
            Kampüsün Sosyal <span className="text-primary">Ağı</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Kampüsnet, Türkiye'deki üniversite öğrencilerinin birbirine bağlandığı, paylaştığı ve keşfettiği özel platformdur. Kampüsünün nabzını hisseden tek yer.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => setLocation("/sign-up")}
              className="text-base px-8 py-3 h-auto font-semibold shadow-lg shadow-primary/30"
              data-testid="button-hero-sign-up"
            >
              Hemen Katıl
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/sign-in")}
              className="text-base px-8 py-3 h-auto"
              data-testid="button-hero-sign-in"
            >
              Giriş Yap
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card py-12 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          {stats.map((s, i) => (
            <div key={i} className={`animate-fade-in-up stagger-${i + 1}`}>
              <div className="text-3xl font-extrabold text-primary mb-1">{s.value}</div>
              <div className="text-sm text-muted-foreground font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-14">
            Neden Kampüsnet?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div
                key={i}
                className={`p-6 rounded-xl border border-border bg-card hover:shadow-md transition-shadow animate-fade-in-up stagger-${i + 1}`}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary text-primary-foreground text-center">
        <div className="max-w-2xl mx-auto animate-fade-in-up">
          <h2 className="text-3xl font-bold mb-4">Kampüsüne Katıl</h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            .edu.tr e-postanla saniyeler içinde kaydol.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setLocation("/sign-up")}
            className="text-base px-8 py-3 h-auto font-semibold"
            data-testid="button-cta-sign-up"
          >
            Ücretsiz Kayıt Ol
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6 px-4 text-center">
        <p className="text-sm text-muted-foreground">
          © 2026 Kampüsnet — Türkiye'nin Üniversite Sosyal Platformu
        </p>
      </footer>
    </div>
  );
}
