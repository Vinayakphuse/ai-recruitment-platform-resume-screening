import { useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { api } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

const NotificationsBell = () => {
  const { user } = useUserProfile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const data = await api.getNotifications(user.id);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase
      .channel("notif-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const unread = items.filter(i => !i.read).length;

  const handleClick = async (n: any) => {
    if (!n.read) await api.markNotificationRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    if (!user) return;
    await api.markAllNotificationsRead(user.id);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-secondary transition"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-card z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="font-heading font-bold text-sm">Notifications</p>
                {unread > 0 && (
                  <button onClick={markAll} className="text-[11px] flex items-center gap-1 text-primary hover:underline font-medium">
                    <CheckCheck className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                ) : items.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">You're all caught up.</p>
                ) : (
                  items.map(n => (
                    <button
                      key={n.id} onClick={() => handleClick(n)}
                      className={`w-full text-left px-4 py-3 border-b border-border hover:bg-secondary/50 transition ${!n.read ? "bg-primary/5" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{n.title}</p>
                          {n.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(n.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsBell;
