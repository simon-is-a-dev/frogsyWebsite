"use client";

import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

type AnnouncementBannerProps = {
  userId: string | null;
};

export default function AnnouncementBanner({ userId }: AnnouncementBannerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const loadAnnouncements = async () => {
      setIsLoading(true);

      const [{ data: activeAnnouncements, error: announcementsError }, { data: views, error: viewsError }] =
        await Promise.all([
          supabase
            .from("announcements")
            .select("id, title, body, created_at")
            .eq("is_active", true)
            .order("created_at", { ascending: false }),
          supabase
            .from("announcement_views")
            .select("announcement_id")
            .eq("user_id", userId),
        ]);

      if (announcementsError || viewsError) {
        console.error("Failed to load announcements", announcementsError || viewsError);
        setIsLoading(false);
        return;
      }

      const viewedIds = new Set((views ?? []).map((view) => view.announcement_id));
      setAnnouncements((activeAnnouncements ?? []).filter((announcement) => !viewedIds.has(announcement.id)));
      setIsLoading(false);
    };

    loadAnnouncements();
  }, [userId]);

  const dismissAnnouncement = async (announcementId: string) => {
    if (!userId) return;

    setAnnouncements((current) => current.filter((announcement) => announcement.id !== announcementId));

    const { error } = await supabase.from("announcement_views").insert({
      user_id: userId,
      announcement_id: announcementId,
    });

    if (error) {
      console.error("Failed to dismiss announcement", error);
    }
  };

  if (isLoading || announcements.length === 0) return null;

  const announcement = announcements[0];

  return (
    <div className="announcement-backdrop" role="presentation">
      <section
        className="announcement-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
      >
        <div className="announcement-kicker">FROGSY UPDATE</div>
        <h2 id="announcement-title">{announcement.title}</h2>
        <p className="announcement-body">{announcement.body}</p>
        <div className="announcement-footer">
          <span className="announcement-count">
            {announcements.length > 1 ? `${announcements.length} updates waiting` : "New update"}
          </span>
          <button
            type="button"
            className="btn-primary announcement-dismiss"
            onClick={() => dismissAnnouncement(announcement.id)}
          >
            Got it
          </button>
        </div>
      </section>
    </div>
  );
}