"use client";
import { useState, useEffect } from "react";
import { X, Star, Loader2, Check, Trash2, MessageSquare } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import Avatar from "@/components/Avatar";

function StarRow({ value, onChange, size = 28, readOnly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onChange?.(n)}
          className={readOnly ? "cursor-default" : "cursor-pointer transition-transform hover:scale-110"}
        >
          <Star
            className={`${(hover || value) >= n ? "fill-amber-400 text-amber-400" : "fill-stone-200 text-stone-200"}`}
            style={{ width: size, height: size }}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewsModal({ seller, saleId, onClose, onChanged }) {
  const { user, setShowAuth, fetchSellerReviews, getMyReviewForSeller, submitReview, deleteMyReview } = useApp();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [myExisting, setMyExisting] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const isOwnProfile = user && seller?.id === user.id;

  const load = async () => {
    setLoading(true);
    const list = await fetchSellerReviews(seller.id);
    setReviews(list);
    if (user && !isOwnProfile) {
      const mine = await getMyReviewForSeller(seller.id);
      if (mine) { setMyExisting(mine); setRating(mine.rating); setComment(mine.comment || ""); }
    }
    setLoading(false);
  };

  useEffect(() => { if (seller?.id) load(); /* eslint-disable-next-line */ }, [seller?.id]);

  const submit = async () => {
    if (!user) { setShowAuth(true); return; }
    setSubmitting(true);
    setError("");
    const res = await submitReview({ sellerId: seller.id, saleId, rating, comment });
    setSubmitting(false);
    if (res?.error) { setError(res.error); return; }
    setDone(true);
    await load();
    onChanged?.();
    setTimeout(() => setDone(false), 1800);
  };

  const removeReview = async () => {
    setSubmitting(true);
    await deleteMyReview(seller.id);
    setMyExisting(null); setRating(0); setComment("");
    setSubmitting(false);
    await load();
    onChanged?.();
  };

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;

  return (
    <div className="fixed inset-0 z-[760] flex items-end sm:items-center justify-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 text-white shrink-0" style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <Avatar name={seller.name} avatarUrl={seller.avatarUrl} avatarColor={seller.avatarColor} size={48} className="border-2 border-white/40" />
            <div>
              <h2 className="text-lg font-bold font-display">{seller.name}</h2>
              {reviews.length > 0 ? (
                <p className="text-white/90 text-sm flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-300 text-amber-300" /> {avg.toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </p>
              ) : (
                <p className="text-white/80 text-sm">No reviews yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Leave / edit your review */}
          {!isOwnProfile && (
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50">
              <p className="font-semibold text-stone-800 text-sm mb-2">{myExisting ? "Your review" : "Rate this seller"}</p>
              <StarRow value={rating} onChange={setRating} />
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Share your experience (optional)…"
                className="w-full mt-3 px-3 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
              />
              {error && <p className="text-rose-600 text-xs mt-2">{error}</p>}
              <div className="flex gap-2 mt-2">
                <button onClick={submit} disabled={submitting || !rating}
                  className="flex-1 py-2.5 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition"
                  style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <Check className="w-4 h-4" /> : null}
                  {done ? "Saved!" : myExisting ? "Update Review" : "Submit Review"}
                </button>
                {myExisting && (
                  <button onClick={removeReview} disabled={submitting}
                    className="px-3 py-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm flex items-center justify-center disabled:opacity-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Reviews list */}
          <div className="px-5 py-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8 text-stone-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 text-stone-300" />
                <p className="text-sm">Be the first to review {seller.name}.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="flex gap-3">
                    <Avatar name={r.reviewer?.name} avatarUrl={r.reviewer?.avatar_url} avatarColor={r.reviewer?.avatar_color} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-stone-800 text-sm truncate">{r.reviewer?.name || "User"}</p>
                        <span className="text-stone-400 text-[11px] shrink-0">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-0.5"><StarRow value={r.rating} readOnly size={14} /></div>
                      {r.comment && <p className="text-stone-600 text-sm mt-1">{r.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
