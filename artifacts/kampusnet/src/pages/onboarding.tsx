import { useLocation } from "wouter";
import { useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const schema = z.object({
  firstName: z.string().min(1, "Ad gerekli"),
  lastName: z.string().min(1, "Soyad gerekli"),
  university: z.string().min(2, "Üniversite adı gerekli"),
  department: z.string().min(2, "Bölüm adı gerekli"),
  year: z.coerce.number().min(1).max(8),
});

type FormData = z.infer<typeof schema>;

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useGetMyProfile({
    query: { queryKey: getGetMyProfileQueryKey() },
  });

  useEffect(() => {
    if (profile?.firstName) {
      setLocation("/feed");
    }
  }, [profile, setLocation]);

  const upsert = useUpsertMyProfile();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      university: "",
      department: "",
      year: 1,
    },
  });

  async function onSubmit(data: FormData) {
    try {
      await upsert.mutateAsync({ data });
      await qc.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      toast({ title: "Profil oluşturuldu!", description: "Kampüsnet'e hoş geldin." });
      setLocation("/feed");
    } catch {
      toast({ title: "Hata", description: "Profil oluşturulamadı. Tekrar dene.", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/30">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/30 px-4">
      <div className="w-full max-w-md animate-scale-in">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <img src={`${basePath}/logo.svg`} alt="Kampüsnet" className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Profilini Oluştur</h1>
              <p className="text-sm text-muted-foreground">Kampüsnet'e katılmak için bir adım kaldı</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ad</FormLabel>
                      <FormControl>
                        <Input placeholder="Ahmet" data-testid="input-first-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Soyad</FormLabel>
                      <FormControl>
                        <Input placeholder="Yılmaz" data-testid="input-last-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="university"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Üniversite</FormLabel>
                    <FormControl>
                      <Input placeholder="Boğaziçi Üniversitesi" data-testid="input-university" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bölüm</FormLabel>
                    <FormControl>
                      <Input placeholder="Bilgisayar Mühendisliği" data-testid="input-department" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sınıf</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-year">
                          <SelectValue placeholder="Sınıfını seç" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}. Sınıf
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full mt-2 font-semibold"
                disabled={upsert.isPending}
                data-testid="button-submit-onboarding"
              >
                {upsert.isPending ? "Kaydediliyor..." : "Kampüsnet'e Katıl"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
