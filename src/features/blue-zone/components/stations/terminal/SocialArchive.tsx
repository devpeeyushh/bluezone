"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  Heart,
  MessageCircle,
  Send,
} from "lucide-react";
import { ECHO_PROFILE, ProfilePost } from "../../../data/ctf/communicationTerminal";
import motion from "../../ui/hudMotion.module.css";

// CTF 01 social evidence: an in-universe reconstruction of a dead social platform (fictional, local,
// read-only), not a copy of any real product. Profile header → post grid → post viewer. The two
// DAY 214 posts share caption and time on purpose; only the photographs differ.

// Faint CRT treatment laid over photographs (static: no motion to respect or disable)
const Scanlines: React.FC = () => (
  <>
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.22)_0px,rgba(0,0,0,0.22)_1px,transparent_1px,transparent_3px)]"
    />
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(2,6,15,0.55)_100%)] mix-blend-multiply"
    />
    <span aria-hidden className="pointer-events-none absolute inset-0 bg-cyan-400/[0.04]" />
  </>
);

const Avatar: React.FC<{ size?: "sm" | "lg" }> = ({ size = "sm" }) => (
  <span
    aria-hidden
    className={`shrink-0 rounded-full border border-radio-cyan/40 bg-[radial-gradient(circle_at_35%_30%,#16405f,#040a16)] flex items-center justify-center text-radio-textBright ${
      size === "lg" ? "w-16 h-16 sm:w-20 sm:h-20 text-2xl" : "w-8 h-8 text-xs"
    }`}
  >
    ☾
  </span>
);

// Hashtags and @mentions highlighted the way the platform showed them
const RichText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/([#@][\w.]+)/).map((part, i) =>
      /^[#@][\w.]+$/.test(part) ? (
        <span key={i} className="text-radio-cyan">
          {part}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    )}
  </>
);

const PostTile = React.forwardRef<HTMLButtonElement, { post: ProfilePost; onOpen: () => void }>(
  ({ post, onOpen }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-label={`Open post from ${post.timestamp}${post.image ? ", photo" : ""}, ${post.likes} likes, ${post.comments.length} comments`}
      className="group relative aspect-square overflow-hidden bg-[#050c19] border border-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-radio-cyan focus-visible:z-10"
    >
      {post.image ? (
        <>
          <Image
            src={post.image.src}
            alt=""
            fill
            sizes="(min-width: 768px) 220px, 33vw"
            placeholder="blur"
            className="object-cover"
          />
          <Scanlines />
        </>
      ) : (
        <span className="absolute inset-0 p-2 sm:p-3 flex flex-col justify-between text-left bg-[linear-gradient(160deg,#0b1a30,#050c19)]">
          <span className="text-[9px] sm:text-[11px] leading-snug text-slate-300 line-clamp-4">
            <RichText text={post.text} />
          </span>
          <span className="text-[8px] sm:text-[9px] tracking-wider text-radio-textMuted">{post.timestamp}</span>
        </span>
      )}
      {/* Hover / focus summary */}
      <span className="absolute inset-0 flex items-center justify-center gap-3 bg-black/60 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="flex items-center gap-1">
          <Heart className="w-3 h-3" aria-hidden /> {post.likes}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="w-3 h-3" aria-hidden /> {post.comments.length}
        </span>
      </span>
    </button>
  )
);
PostTile.displayName = "PostTile";

const PostViewer: React.FC<{
  posts: ProfilePost[];
  index: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}> = ({ posts, index, onNavigate, onClose }) => {
  const post = posts[index];
  const backRef = useRef<HTMLButtonElement>(null);
  const hasPrev = index > 0;
  const hasNext = index < posts.length - 1;

  useEffect(() => {
    backRef.current?.focus();
  }, []);

  // Keys handled here stop at the viewer: ESC returns to the profile instead of closing the
  // station (the hub's ESC listener sits on window, past React's root).
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowLeft" && hasPrev) onNavigate(index - 1);
    else if (e.key === "ArrowRight" && hasNext) onNavigate(index + 1);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  const navButton = "p-1.5 rounded border border-radio-border text-slate-300 hover:border-radio-cyan hover:text-white disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan";

  return (
    <section aria-label={`Post viewer, post ${index + 1} of ${posts.length}`} onKeyDown={handleKeyDown} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          ref={backRef}
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-radio-border text-[10px] font-bold tracking-[0.2em] text-radio-text hover:border-radio-cyan focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          PROFILE
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onNavigate(index - 1)} disabled={!hasPrev} aria-label="Previous post" className={navButton}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] tracking-[0.2em] text-radio-textMuted tabular-nums" aria-hidden>
            {String(index + 1).padStart(2, "0")} / {String(posts.length).padStart(2, "0")}
          </span>
          <button type="button" onClick={() => onNavigate(index + 1)} disabled={!hasNext} aria-label="Next post" className={navButton}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <article
        key={post.id}
        className={`${motion.swapIn} grid grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] rounded-lg border border-radio-border/80 bg-[#040a15]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden`}
      >
        {/* Media */}
        <div className="relative aspect-square bg-black">
          {post.image ? (
            <>
              <Image
                src={post.image.src}
                alt={post.image.alt}
                fill
                sizes="(min-width: 768px) 460px, 100vw"
                placeholder="blur"
                className="object-cover"
              />
              <Scanlines />
              <span className="absolute left-2 bottom-2 px-1.5 py-0.5 rounded-sm bg-black/60 text-[9px] tracking-wider text-slate-300">
                {post.image.file}
              </span>
            </>
          ) : (
            <div className="absolute inset-0 p-6 flex items-center bg-[linear-gradient(160deg,#0b1a30,#050c19)]">
              <p className="text-sm leading-relaxed text-slate-200">
                <RichText text={post.text} />
              </p>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col min-w-0 md:max-h-[min(30rem,60vh)]">
          <header className="flex items-center gap-2.5 px-3 py-2.5 border-b border-radio-border/70">
            <Avatar />
            <div className="min-w-0">
              <div className="text-xs font-bold text-radio-textBright truncate">{ECHO_PROFILE.handle}</div>
              <div className="text-[10px] tracking-wider text-radio-textMuted">{post.timestamp}</div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 text-[12px] leading-relaxed">
            <p className="text-slate-200">
              <span className="font-bold text-radio-textBright mr-1.5">{ECHO_PROFILE.handle}</span>
              <RichText text={post.text} />
            </p>
            {post.comments.length > 0 ? (
              <ul className="space-y-2" aria-label="Comments">
                {post.comments.map((c, i) => (
                  <li key={i} className="text-slate-400">
                    <span className={`font-bold mr-1.5 ${c.isAuthor ? "text-radio-cyan" : "text-slate-200"}`}>
                      {c.handle}
                    </span>
                    {c.isAuthor && <span className="mr-1.5 text-[9px] tracking-wider text-radio-textMuted">AUTHOR</span>}
                    <RichText text={c.text} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-radio-textMuted">No comments cached.</p>
            )}
          </div>

          <footer className="px-3 py-2.5 border-t border-radio-border/70 space-y-1">
            {/* Read-only mirror: the actions are shown, not usable */}
            <div className="flex items-center gap-3 text-slate-400" aria-hidden>
              <Heart className="w-4 h-4" />
              <MessageCircle className="w-4 h-4" />
              <Send className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-radio-textBright">{post.likes} likes</div>
            <div className="text-[9px] tracking-[0.2em] text-radio-textMuted">{post.timestamp} // ARCHIVED</div>
          </footer>
        </div>
      </article>
      <p className="text-[10px] text-radio-textMuted">← → browse posts · ESC back to profile</p>
    </section>
  );
};

export const ProfilePanel: React.FC<{ onOpenArchive: () => void }> = ({ onOpenArchive }) => {
  const p = ECHO_PROFILE;
  const [open, setOpen] = useState<number | null>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lastOpened = useRef(0);
  const restoreFocus = useRef(false);

  // After the viewer closes, return focus to the post the player was looking at
  useEffect(() => {
    if (open === null && restoreFocus.current) {
      restoreFocus.current = false;
      tileRefs.current[lastOpened.current]?.focus();
    }
  }, [open]);

  const openPost = (i: number) => {
    lastOpened.current = i;
    setOpen(i);
  };
  const closeViewer = () => {
    restoreFocus.current = true;
    setOpen(null);
  };

  if (open !== null) {
    return (
      <div className="max-w-4xl">
        <PostViewer
          posts={p.posts}
          index={open}
          onNavigate={(i) => {
            lastOpened.current = i;
            setOpen(i);
          }}
          onClose={closeViewer}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="text-[10px] tracking-[0.2em] text-amber-300/80 border border-amber-500/30 bg-amber-950/20 rounded px-3 py-1.5">
        {p.cacheNote}
      </div>

      {/* Profile header */}
      <header className="rounded-lg border border-radio-border/80 bg-[#06101f]/70 backdrop-blur-sm p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-4 sm:gap-6">
          <Avatar size="lg" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-bold text-radio-textBright truncate">{p.handle}</h3>
            <dl className="mt-2 flex gap-4 sm:gap-6 text-[11px] text-slate-400">
              {(
                [
                  ["posts", p.stats.posts],
                  ["followers", p.stats.followers],
                  ["following", p.stats.following],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex flex-col sm:flex-row sm:gap-1">
                  <dt className="order-2 sm:order-none">{label}</dt>
                  <dd className="order-1 sm:order-none font-bold text-radio-textBright">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className="mt-3 text-xs leading-relaxed">
          <div className="font-bold text-radio-textBright">{p.displayName}</div>
          {p.bio.map((line) => (
            <div key={line} className="text-slate-300">
              {line}
            </div>
          ))}
          <div className="mt-1.5 text-[11px] italic text-slate-500">&ldquo;{p.quote}&rdquo;</div>
          <button
            type="button"
            onClick={onOpenArchive}
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-radio-cyan hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan rounded"
          >
            <ArrowUpRight className="w-3 h-3" />
            AFTERFALL SURVIVOR ARCHIVE ▸ RELAY REGISTRY
          </button>
        </div>
      </header>

      {/* Post grid */}
      <section aria-labelledby="social-posts">
        <h3
          id="social-posts"
          className="flex items-center justify-center gap-1.5 border-t border-radio-border pt-2 mb-2 text-[10px] font-bold tracking-[0.3em] text-radio-textBright"
        >
          <Grid3x3 className="w-3.5 h-3.5" aria-hidden />
          POSTS
        </h3>
        <div className="grid grid-cols-3 gap-1">
          {p.posts.map((post, i) => (
            <PostTile
              key={post.id}
              ref={(el) => {
                tileRefs.current[i] = el;
              }}
              post={post}
              onOpen={() => openPost(i)}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
