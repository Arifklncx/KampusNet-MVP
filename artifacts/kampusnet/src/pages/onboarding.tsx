import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetMyProfile,
  useUpsertMyProfile,
  getGetMyProfileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const TURKISH_UNIVERSITIES = [
  "Boğaziçi Üniversitesi",
  "Orta Doğu Teknik Üniversitesi (ODTÜ)",
  "İstanbul Teknik Üniversitesi (İTÜ)",
  "Hacettepe Üniversitesi",
  "Ankara Üniversitesi",
  "İstanbul Üniversitesi",
  "Marmara Üniversitesi",
  "Ege Üniversitesi",
  "Dokuz Eylül Üniversitesi",
  "Gazi Üniversitesi",
  "Bilkent Üniversitesi",
  "Koç Üniversitesi",
  "Sabancı Üniversitesi",
  "Bahçeşehir Üniversitesi",
  "Yıldız Teknik Üniversitesi",
  "Gebze Teknik Üniversitesi",
  "İzmir Yüksek Teknoloji Enstitüsü",
  "Karadeniz Teknik Üniversitesi",
  "Çukurova Üniversitesi",
  "Selçuk Üniversitesi",
  "Erciyes Üniversitesi",
  "Fırat Üniversitesi",
  "İnönü Üniversitesi",
  "Mersin Üniversitesi",
  "Pamukkale Üniversitesi",
  "Süleyman Demirel Üniversitesi",
  "Anadolu Üniversitesi",
  "Osmangazi Üniversitesi",
  "Uludağ Üniversitesi",
  "Celal Bayar Üniversitesi",
  "Balıkesir Üniversitesi",
  "Muğla Sıtkı Koçman Üniversitesi",
  "Trakya Üniversitesi",
  "Kocaeli Üniversitesi",
  "Sakarya Üniversitesi",
  "Abant İzzet Baysal Üniversitesi",
  "Düzce Üniversitesi",
  "İstanbul Medeniyet Üniversitesi",
  "Yalova Üniversitesi",
  "Tekirdağ Namık Kemal Üniversitesi",
  "Çanakkale Onsekiz Mart Üniversitesi",
  "Muş Alparslan Üniversitesi",
  "Atatürk Üniversitesi",
  "Sivas Cumhuriyet Üniversitesi",
  "Malatya Turgut Özal Üniversitesi",
  "Adıyaman Üniversitesi",
  "Gaziantep Üniversitesi",
  "Harran Üniversitesi",
  "Dicle Üniversitesi",
  "Yüzüncü Yıl Üniversitesi",
  "Karamanoğlu Mehmetbey Üniversitesi",
  "Kırıkkale Üniversitesi",
  "Kırklareli Üniversitesi",
  "Kırşehir Ahi Evran Üniversitesi",
  "Kastamonu Üniversitesi",
  "Nevşehir Hacı Bektaş Veli Üniversitesi",
  "Niğde Ömer Halisdemir Üniversitesi",
  "Sinop Üniversitesi",
  "Bartın Üniversitesi",
  "Bingöl Üniversitesi",
  "Bitlis Eren Üniversitesi",
  "Hakkari Üniversitesi",
  "Iğdır Üniversitesi",
  "Siirt Üniversitesi",
  "Şırnak Üniversitesi",
  "Ağrı İbrahim Çeçen Üniversitesi",
  "Ardahan Üniversitesi",
  "Artvin Çoruh Üniversitesi",
  "Bayburt Üniversitesi",
  "Giresun Üniversitesi",
  "Gümüşhane Üniversitesi",
  "Ordu Üniversitesi",
  "Rize Üniversitesi",
  "Trabzon Üniversitesi",
  "Aksaray Üniversitesi",
  "Afyon Kocatepe Üniversitesi",
  "Burdur Mehmet Akif Ersoy Üniversitesi",
  "Isparta Uygulamalı Bilimler Üniversitesi",
  "Manisa Celal Bayar Üniversitesi",
  "Aydın Adnan Menderes Üniversitesi",
  "Denizli Pamukkale Üniversitesi",
  "Eskişehir Osmangazi Üniversitesi",
  "Eskişehir Teknik Üniversitesi",
  "Bursa Uludağ Üniversitesi",
  "Bursa Teknik Üniversitesi",
  "Bilecik Şeyh Edebali Üniversitesi",
  "Bolu Abant İzzet Baysal Üniversitesi",
  "İstanbul Medipol Üniversitesi",
  "İstanbul Bilgi Üniversitesi",
  "İstanbul Kültür Üniversitesi",
  "Özyeğin Üniversitesi",
  "TOBB Ekonomi ve Teknoloji Üniversitesi",
  "Atılım Üniversitesi",
  "Başkent Üniversitesi",
  "Çankaya Üniversitesi",
  "TED Üniversitesi",
];

const schema = z.object({
  firstName: z.string().min(1, "Ad gerekli"),
  lastName: z.string().min(1, "Soyad gerekli"),
  university: z.string().min(2, "Üniversite seçimi gerekli"),
  department: z.string().min(2, "Bölüm adı gerekli"),
  year: z.coerce.number().min(1).max(8),
});

type FormData = z.infer<typeof schema>;

const STEPS = ["Kişisel Bilgiler", "Üniversite", "Tamamla"];

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: "14px", height: "14px" }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "18px", height: "18px" }}>
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "18px", height: "18px" }}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "18px", height: "18px" }}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [uniOpen, setUniOpen] = useState(false);
  const [uniSearch, setUniSearch] = useState("");

  const { data: profile, isLoading } = useGetMyProfile({
    query: { queryKey: getGetMyProfileQueryKey(), retry: false },
  });

  useEffect(() => {
    if (profile?.firstName) {
      setLocation("/feed");
    }
  }, [profile, setLocation]);

  const upsert = useUpsertMyProfile();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "", university: "", department: "", year: 1 },
  });

  async function onSubmit(data: FormData) {
    try {
      await upsert.mutateAsync({ data });
      await qc.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      toast({ title: "Profil oluşturuldu!", description: "Kampüsnet'e hoş geldin 🎉" });
      setLocation("/feed");
    } catch {
      toast({ title: "Hata", description: "Profil oluşturulamadı. Lütfen tekrar dene.", variant: "destructive" });
    }
  }

  async function goNext() {
    let fieldsToValidate: (keyof FormData)[] = [];
    if (step === 0) fieldsToValidate = ["firstName", "lastName"];
    if (step === 1) fieldsToValidate = ["university", "department", "year"];

    const valid = await form.trigger(fieldsToValidate);
    if (valid) setStep((s) => s + 1);
  }

  const filteredUniversities = TURKISH_UNIVERSITIES.filter((u) =>
    u.toLowerCase().includes(uniSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/30">
        <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/30 px-4 py-10">
      <div className="w-full max-w-md animate-scale-in">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={`${basePath}/logo.svg`} alt="Kampüsnet" className="w-12 h-12 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-foreground">Profilini Oluştur</h1>
          <p className="text-sm text-muted-foreground mt-1">Kampüsnet'e katılmak için birkaç bilgiye ihtiyacımız var</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? <CheckIcon /> : i + 1}
                </div>
                <span className={`text-xs mt-1.5 font-medium ${i <= step ? "text-primary" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-0.5 w-12 mx-1 mb-5 transition-all duration-500 ${
                    i < step ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Step 0 — Personal Info */}
              {step === 0 && (
                <div className="p-6 space-y-4 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <UserIcon />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground text-sm">Kişisel Bilgiler</h2>
                      <p className="text-xs text-muted-foreground">Adın ve soyadın profilde görünür</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Ad</FormLabel>
                          <FormControl>
                            <Input placeholder="Ahmet" autoFocus data-testid="input-first-name" {...field} />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Soyad</FormLabel>
                          <FormControl>
                            <Input placeholder="Yılmaz" data-testid="input-last-name" {...field} />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-2">
                    <Button type="button" onClick={goNext} className="w-full font-semibold">
                      Devam Et →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 1 — University Info */}
              {step === 1 && (
                <div className="p-6 space-y-4 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <BuildingIcon />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground text-sm">Üniversite Bilgileri</h2>
                      <p className="text-xs text-muted-foreground">Kampüs filtresinde kullanılacak</p>
                    </div>
                  </div>

                  {/* University Combobox */}
                  <FormField
                    control={form.control}
                    name="university"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Üniversite</FormLabel>
                        <FormControl>
                          <Popover open={uniOpen} onOpenChange={setUniOpen}>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                role="combobox"
                                data-testid="input-university"
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm border border-input rounded-lg bg-muted text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                                  !field.value ? "text-muted-foreground" : "text-foreground"
                                }`}
                              >
                                <span className="truncate">{field.value || "Üniversiteni seç veya yaz..."}</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-2 flex-shrink-0 opacity-50" style={{ width: "14px", height: "14px" }}>
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
                              <Command>
                                <CommandInput
                                  placeholder="Üniversite ara..."
                                  value={uniSearch}
                                  onValueChange={setUniSearch}
                                  className="h-9 text-sm"
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    <div className="py-2 px-3">
                                      <button
                                        type="button"
                                        className="w-full text-left text-sm text-primary hover:underline"
                                        onClick={() => {
                                          field.onChange(uniSearch);
                                          setUniOpen(false);
                                        }}
                                      >
                                        "{uniSearch}" olarak ekle
                                      </button>
                                    </div>
                                  </CommandEmpty>
                                  <CommandGroup className="max-h-56 overflow-y-auto">
                                    {filteredUniversities.map((uni) => (
                                      <CommandItem
                                        key={uni}
                                        value={uni}
                                        onSelect={() => {
                                          field.onChange(uni);
                                          setUniOpen(false);
                                          setUniSearch("");
                                        }}
                                        className="text-sm cursor-pointer"
                                      >
                                        <span className={`mr-2 ${field.value === uni ? "opacity-100" : "opacity-0"}`}>✓</span>
                                        {uni}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Bölüm</FormLabel>
                        <FormControl>
                          <Input placeholder="Bilgisayar Mühendisliği" data-testid="input-department" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Sınıf</FormLabel>
                        <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                          <FormControl>
                            <SelectTrigger data-testid="select-year" className="text-sm">
                              <SelectValue placeholder="Sınıfını seç" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6].map((y) => (
                              <SelectItem key={y} value={String(y)} className="text-sm">
                                {y}. Sınıf
                              </SelectItem>
                            ))}
                            <SelectItem value="7" className="text-sm">Yüksek Lisans</SelectItem>
                            <SelectItem value="8" className="text-sm">Doktora</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep(0)} className="flex-1">
                      ← Geri
                    </Button>
                    <Button type="button" onClick={goNext} className="flex-1 font-semibold">
                      Devam Et →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2 — Confirmation */}
              {step === 2 && (
                <div className="p-6 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center">
                      <RocketIcon />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground text-sm">Her şey hazır!</h2>
                      <p className="text-xs text-muted-foreground">Bilgilerini kontrol et</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {[
                      { label: "Ad Soyad", value: `${form.getValues("firstName")} ${form.getValues("lastName")}` },
                      { label: "Üniversite", value: form.getValues("university") },
                      { label: "Bölüm", value: form.getValues("department") },
                      { label: "Sınıf", value: (() => {
                        const y = form.getValues("year");
                        if (y === 7) return "Yüksek Lisans";
                        if (y === 8) return "Doktora";
                        return `${y}. Sınıf`;
                      })() },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                        <div className="min-w-[100px] text-xs font-medium text-muted-foreground">{label}</div>
                        <div className="text-sm font-semibold text-foreground">{value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                      ← Düzenle
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 font-semibold"
                      disabled={upsert.isPending}
                      data-testid="button-submit-onboarding"
                    >
                      {upsert.isPending ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Kaydediliyor…
                        </span>
                      ) : (
                        "Kampüsnet'e Katıl 🎉"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Sadece .edu.tr e-posta sahipleri platforma erişebilir
        </p>
      </div>
    </div>
  );
}
