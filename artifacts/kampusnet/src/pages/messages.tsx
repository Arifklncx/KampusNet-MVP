import { useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetConversationMessagesQueryKey,
  getGetConversationsQueryKey,
  getGetNotificationsQueryKey,
  getGetUserProfileQueryKey,
  useGetConversationMessages,
  useGetConversations,
  useGetUserProfile,
  useMarkConversationRead,
  useSendDirectMessage,
} from "@workspace/api-client-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronRight,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const messageSchema = z.object({
  content: z.string().trim().min(1, "Bir mesaj yazmalısın.").max(2000, "Mesaj en fazla 2000 karakter olabilir."),
});
type MessageValues = z.infer<typeof messageSchema>;

function initials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

function MessageSkeleton() {
  return (
    <div className="space-y-5 px-5 py-6" aria-label="Mesajlar yükleniyor">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className={`flex ${item % 2 ? "justify-end" : "justify-start"}`}>
          <div className={`h-14 rounded-2xl bg-muted animate-pulse ${item % 2 ? "w-2/5" : "w-3/5"}`} />
        </div>
      ))}
    </div>
  );
}

export default function Messages() {
  const params = useParams<{ userId?: string }>();
  const userId = params.userId ?? "";
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const currentUserId = user?.id ?? "";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const markedUnreadRef = useRef<string | null>(null);
  const markRead = useMarkConversationRead();
  const markReadAsyncRef = useRef(markRead.mutateAsync);
  markReadAsyncRef.current = markRead.mutateAsync;

  const conversationsQuery = useGetConversations({
    query: { queryKey: getGetConversationsQueryKey(), refetchInterval: 5000 },
  });
  const conversation = conversationsQuery.data?.find((item) => item.userId === userId);
  const profileQuery = useGetUserProfile(userId, {
    query: {
      queryKey: getGetUserProfileQueryKey(userId),
      enabled: Boolean(userId),
    },
  });
  const messagesQuery = useGetConversationMessages(userId, {
    query: {
      queryKey: getGetConversationMessagesQueryKey(userId),
      enabled: Boolean(userId),
      refetchInterval: 5000,
    },
  });
  const sendMessage = useSendDirectMessage();

  const form = useForm<MessageValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: "" },
    mode: "onChange",
  });
  const messageContent = useWatch({ control: form.control, name: "content" }) ?? "";
  const messages = messagesQuery.data ?? [];
  const recipient = profileQuery.data;
  const firstName = recipient?.firstName ?? conversation?.firstName ?? "";
  const lastName = recipient?.lastName ?? conversation?.lastName ?? "";
  const avatarUrl = recipient?.avatarUrl ?? conversation?.avatarUrl;
  const university = recipient?.university ?? conversation?.university ?? "";
  const department = recipient?.department ?? conversation?.department ?? "";
  const latestUnread = messages
    .filter((message) => message.senderId !== currentUserId && !message.readAt)
    .slice(-1)[0];
  const latestUnreadKey = latestUnread ? `${userId}:${latestUnread.id}` : null;

  async function refreshMessageRelatedQueries() {
    if (!userId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetConversationMessagesQueryKey(userId) }),
      queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }),
    ]);
  }

  useEffect(() => {
    if (!userId || !latestUnreadKey || markedUnreadRef.current === latestUnreadKey) return;
    markedUnreadRef.current = latestUnreadKey;
    markReadAsyncRef.current({ userId })
      .then(refreshMessageRelatedQueries)
      .catch(() => {
        markedUnreadRef.current = null;
      });
  }, [latestUnreadKey, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function onSubmit(values: MessageValues) {
    if (!userId) return;
    try {
      await sendMessage.mutateAsync({ userId, data: { content: values.content.trim() } });
      form.reset({ content: "" });
      await refreshMessageRelatedQueries();
    } catch {
      toast({
        title: "Mesaj gönderilemedi",
        description: "Bağlantını kontrol edip yeniden deneyebilirsin.",
        variant: "destructive",
      });
    }
  }

  const header = (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setLocation("/feed")}
          className="flex items-center gap-2.5"
          data-testid="link-messages-logo"
        >
          <img src={`${basePath}/logo.svg`} alt="" className="h-7 w-7" />
          <span className="font-bold tracking-tight text-primary">Kampüsnet</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Öğrenci ağı
          </span>
          <button
            onClick={() => setLocation("/profile")}
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
            data-testid="link-my-profile"
          >
            Profilim
          </button>
        </div>
      </div>
    </header>
  );

  return (
    <div className="min-h-[100dvh] bg-background">
      {header}
      <main className="mx-auto max-w-6xl px-0 py-0 sm:px-4 sm:py-6">
        <div className="grid min-h-[calc(100dvh-3.5rem)] overflow-hidden bg-card sm:min-h-[min(760px,calc(100dvh-6.5rem))] sm:grid-cols-[330px_minmax(0,1fr)] sm:rounded-2xl sm:border sm:border-border sm:shadow-sm">
          <aside className={`flex min-h-0 flex-col border-r border-border ${userId ? "hidden sm:flex" : "flex"}`}>
            <div className="border-b border-border px-5 pb-4 pt-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Kampüsnet</p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Mesajlar</h1>
                </div>
                <div className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8 text-primary">
                  <MessageCircle className="h-[18px] w-[18px]" />
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Kampüsten arkadaşlarınla özel sohbet et.</p>
            </div>

            {conversationsQuery.isLoading ? (
              <div className="space-y-3 p-4" aria-label="Sohbetler yükleniyor">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl p-2">
                    <div className="h-11 w-11 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
                      <div className="h-2.5 w-4/5 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversationsQuery.isError ? (
              <div className="m-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4" data-testid="status-conversations-error">
                <p className="text-sm font-semibold text-foreground">Sohbetler yüklenemedi</p>
                <p className="mt-1 text-xs text-muted-foreground">Biraz sonra yeniden deneyebilirsin.</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => conversationsQuery.refetch()} data-testid="button-retry-conversations">
                  Yeniden dene
                </Button>
              </div>
            ) : (conversationsQuery.data ?? []).length === 0 ? (
              <div className="m-4 rounded-xl border border-dashed border-border bg-muted/35 px-4 py-8 text-center" data-testid="empty-conversations">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/8 text-primary">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">Henüz sohbetin yok</p>
                <p className="mx-auto mt-1 max-w-[220px] text-xs leading-relaxed text-muted-foreground">
                  Bir öğrencinin profiline git ve ilk mesajını gönder.
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setLocation("/feed")} data-testid="button-find-students">
                  Öğrencileri keşfet
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-2" data-testid="list-conversations">
                {(conversationsQuery.data ?? []).map((item) => {
                  const active = item.userId === userId;
                  return (
                    <button
                      key={item.userId}
                      onClick={() => setLocation(`/messages/${item.userId}`)}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${
                        active ? "bg-primary/8" : "hover:bg-muted/70"
                      }`}
                      data-testid={`conversation-${item.userId}`}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={item.avatarUrl ?? undefined} />
                          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                            {initials(item.firstName, item.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        {item.unreadCount > 0 && (
                          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card bg-primary px-1 text-[10px] font-bold text-primary-foreground" data-testid={`unread-count-${item.userId}`}>
                            {item.unreadCount > 9 ? "9+" : item.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-foreground">{item.firstName} {item.lastName}</span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {item.lastMessageAt ? formatDistanceToNow(new Date(item.lastMessageAt), { addSuffix: false, locale: tr }) : ""}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className={`truncate text-xs ${item.unreadCount ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                            {item.lastMessage || "Sohbeti başlat"}
                          </p>
                          {item.unreadCount > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-auto border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
              Mesajların yalnızca sen ve sohbet ettiğin öğrenci tarafından görülür.
            </div>
          </aside>

          <section className={`${userId ? "flex" : "hidden sm:flex"} min-h-0 min-w-0 flex-col bg-[hsl(var(--background))]`}>
            {!userId ? (
              <div className="hidden flex-1 flex-col items-center justify-center px-8 text-center sm:flex" data-testid="messages-welcome">
                <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-[30px] bg-primary/8 text-primary">
                  <MessageCircle className="h-10 w-10 stroke-[1.6]" />
                  <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-background bg-primary/70" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Özel sohbet alanı</p>
                <h2 className="mt-2 max-w-sm text-2xl font-bold tracking-tight text-foreground">Konuşma burada başlar.</h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Soldan bir sohbet seç ya da bir öğrencinin profilinden yeni bir mesaj gönder.
                </p>
              </div>
            ) : (
              <>
                <div className="flex min-h-[72px] items-center gap-3 border-b border-border bg-card px-3 sm:px-5">
                  <button
                    onClick={() => setLocation("/messages")}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted sm:hidden"
                    aria-label="Sohbet listesine dön"
                    data-testid="button-back-to-inbox"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  {profileQuery.isLoading ? (
                    <div className="h-11 w-11 animate-pulse rounded-full bg-muted" />
                  ) : (
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                        {initials(firstName, lastName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="min-w-0 flex-1">
                    {profileQuery.isLoading ? (
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    ) : profileQuery.isError ? (
                      <p className="text-sm font-medium text-destructive" data-testid="status-recipient-error">Öğrenci bilgisi yüklenemedi</p>
                    ) : (
                      <>
                        <button onClick={() => setLocation(`/profile/${userId}`)} className="block max-w-full truncate text-left text-sm font-semibold text-foreground hover:text-primary" data-testid="link-chat-recipient-profile">
                          {firstName} {lastName}
                        </button>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {[department, university].filter(Boolean).join(" · ") || "Kampüsnet öğrencisi"}
                        </p>
                      </>
                    )}
                  </div>
                  <span className="hidden items-center gap-1.5 rounded-full bg-primary/5 px-2.5 py-1.5 text-[11px] font-medium text-primary md:flex">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Özel sohbet
                  </span>
                  <button
                    onClick={() => setLocation(`/profile/${userId}`)}
                    aria-label="Öğrenci profilini görüntüle"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                    data-testid="button-recipient-profile"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6" data-testid="message-thread">
                  {profileQuery.isError ? (
                    <div className="flex h-full min-h-48 flex-col items-center justify-center text-center" data-testid="empty-recipient">
                      <p className="font-semibold text-foreground">Öğrenci bulunamadı</p>
                      <p className="mt-1 text-sm text-muted-foreground">Bu sohbet şu anda açılamıyor.</p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => setLocation("/messages")}>Mesajlara dön</Button>
                    </div>
                  ) : messagesQuery.isLoading ? (
                    <MessageSkeleton />
                  ) : messagesQuery.isError ? (
                    <div className="flex h-full min-h-48 flex-col items-center justify-center text-center" data-testid="status-messages-error">
                      <p className="font-semibold text-foreground">Mesajlar yüklenemedi</p>
                      <p className="mt-1 text-sm text-muted-foreground">Bağlantını kontrol edip yeniden deneyebilirsin.</p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => messagesQuery.refetch()} data-testid="button-retry-messages">Yeniden dene</Button>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full min-h-52 flex-col items-center justify-center text-center" data-testid="empty-messages">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/10 bg-card text-primary shadow-sm">
                        <MessageCircle className="h-6 w-6" />
                      </div>
                      <p className="mt-4 text-sm font-semibold text-foreground">Sohbeti sen başlat</p>
                      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                        {firstName} ile burada yapacağınız konuşma size özel kalır.
                      </p>
                    </div>
                  ) : (
                    <div className="mx-auto flex max-w-2xl flex-col gap-3">
                      <div className="py-2 text-center">
                        <span className="rounded-full border border-border bg-card px-3 py-1 text-[10px] font-medium text-muted-foreground">Sohbetin başlangıcı</span>
                      </div>
                      {messages.map((message, index) => {
                        const mine = message.senderId === currentUserId;
                        const previous = messages[index - 1];
                        const showDate = !previous || new Date(message.createdAt).toDateString() !== new Date(previous.createdAt).toDateString();
                        return (
                          <div key={message.id} className="animate-fade-in-up" data-testid={`message-${message.id}`}>
                            {showDate && (
                              <div className="my-3 text-center">
                                <span className="rounded-full bg-card/80 px-3 py-1 text-[10px] text-muted-foreground">
                                  {new Date(message.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                                </span>
                              </div>
                            )}
                            <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[88%] sm:max-w-[72%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                                <div className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                                  mine
                                    ? "rounded-br-md bg-primary text-primary-foreground"
                                    : "rounded-bl-md border border-border bg-card text-foreground"
                                }`}>
                                  {message.content}
                                </div>
                                <div className={`mt-1 flex items-center gap-1 text-[10px] text-muted-foreground ${mine ? "mr-1" : "ml-1"}`}>
                                  <span>{new Date(message.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
                                  {mine && (message.readAt ? <CheckCheck className="h-3.5 w-3.5 text-primary" /> : <Check className="h-3 w-3" />)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={bottomRef} />
                    </div>
                  )}
                </div>

                <div className="border-t border-border bg-card px-3 py-3 sm:px-5 sm:py-4">
                  {messagesQuery.isError || profileQuery.isError ? null : (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-2xl">
                        <FormField
                          control={form.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-end gap-2 rounded-2xl border border-input bg-background px-2 py-2 shadow-sm transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    rows={1}
                                    maxLength={2000}
                                    placeholder="Mesajını yaz..."
                                    className="max-h-36 min-h-10 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0"
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter" && !event.shiftKey) {
                                        event.preventDefault();
                                        void form.handleSubmit(onSubmit)();
                                      }
                                    }}
                                    data-testid="input-message"
                                  />
                                </FormControl>
                                <Button
                                  type="submit"
                                  size="icon"
                                  className="mb-0.5 h-9 w-9 shrink-0 rounded-xl"
                                  disabled={!form.formState.isValid || !messageContent.trim() || sendMessage.isPending}
                                  aria-label="Mesaj gönder"
                                  data-testid="button-send-message"
                                >
                                  {sendMessage.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                              </div>
                              <div className="mt-1.5 flex items-start justify-between gap-2 px-2">
                                <FormMessage />
                                <span className="ml-auto text-[10px] text-muted-foreground">{messageContent.length}/2000</span>
                              </div>
                            </FormItem>
                          )}
                        />
                        <p className="mt-1 text-center text-[10px] text-muted-foreground">
                          Enter ile gönder · Shift + Enter ile yeni satır
                        </p>
                      </form>
                    </Form>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}