# Kampüsnet

Türkiye'deki üniversite öğrencilerine özel sosyal medya platformu — sadece .edu.tr e-posta adresiyle kayıt olunabilir.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API sunucusunu başlat (port 8080)
- `pnpm --filter @workspace/kampusnet run dev` — Frontend'i başlat (port 24225)
- `pnpm run typecheck` — Tüm paketlerde tip kontrolü
- `pnpm run build` — Tüm paketleri derle
- `pnpm --filter @workspace/api-spec run codegen` — OpenAPI spec'inden hook ve Zod şemalarını yeniden üret
- `pnpm --filter @workspace/db run push` — DB şemasını güncelle (sadece geliştirme)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4 + shadcn/ui
- Backend: Express 5
- Auth: Clerk (sadece .edu.tr e-posta kısıtlaması)
- DB: PostgreSQL + Drizzle ORM
- Validasyon: Zod (zod/v4), drizzle-zod
- API codegen: Orval (OpenAPI spec'inden)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API kontratının tek kaynağı (source of truth)
- `lib/db/src/schema/` — Drizzle DB şemaları (users, posts, comments, likes)
- `artifacts/api-server/src/routes/` — Express route handler'ları
- `artifacts/kampusnet/src/pages/` — React sayfaları (landing, feed, profile, onboarding)
- `lib/api-client-react/src/generated/` — Codegen çıktıları (doğrudan düzenleme yapma)

## Architecture decisions

- OpenAPI-first yaklaşım: Spec değiştirilince `codegen` komutu çalıştırılmalı
- Clerk proxy middleware: `CLERK_PROXY_PATH` üzerinden Clerk API'si proxy'leniyor
- .edu.tr kısıtlaması: Kullanıcı profili oluşturma/güncelleme sırasında email kontrolü yapılıyor
- Kampüs filtresi: `filter=my_university` ile aynı üniversitedeki kullanıcıların postları gösteriliyor
- Demo seed data: 3 kullanıcı ve 4 gönderi önceden eklenmiş

## Product

- Landing sayfası: Platform tanıtımı, kayıt/giriş CTA'ları
- Onboarding: İlk kayıt sonrası profil oluşturma formu (ad, üniversite, bölüm, sınıf)
- Feed: Tüm gönderiler veya sadece kendi üniversitesi filtrelenebilir, beğeni/yorum
- Profil: Kendi profili düzenleme, gönderiler listesi
- Kullanıcı profili: Diğer öğrencilerin profil sayfaları

## User preferences

- Platform dili: Türkçe
- Auth kısıtlaması: Sadece .edu.tr uzantılı e-postalar
- Python backend isteği: Mevcut Express altyapısı kullanıldı; Python AI entegrasyonu ilerleyen aşamada eklenebilir

## Gotchas

- Codegen sonrası mutlaka `pnpm run typecheck:libs` çalıştır
- `tailwindcss({ optimize: false })` vite.config.ts'de Clerk CSS katmanlarının prod'da doğru çalışması için gerekli
- Clerk dev keys kullanıldığında konsolda uyarı mesajı normal

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
