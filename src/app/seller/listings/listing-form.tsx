"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CategoryFieldType } from "@/generated/prisma/enums";
import { saveSellerListing, uploadSellerListingImage } from "./actions";
import type { getListingCatalog, getSellerListingForEdit } from "./listing-data";

type GameOptions = Awaited<ReturnType<typeof getListingCatalog>>;
type EditListing = Awaited<ReturnType<typeof getSellerListingForEdit>>;
type AttributeValue = string | number | boolean | string[];

const fieldClass =
  "mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-cyan-300/50 focus:outline-none";
const labelClass = "block text-xs font-medium text-slate-300";

export function ListingForm({
  games,
  listing,
}: {
  games: GameOptions;
  listing?: EditListing;
}) {
  const router = useRouter();
  const [gameId, setGameId] = useState(listing?.gameId ?? "");
  const [categoryId, setCategoryId] = useState(listing?.categoryId ?? "");
  const [title, setTitle] = useState(listing?.title ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [price, setPrice] = useState(listing?.price ?? "");
  const [currency, setCurrency] = useState(listing?.currency ?? "USD");
  const [quantity, setQuantity] = useState(String(listing?.quantity ?? 1));
  const [platform, setPlatform] = useState(listing?.platform ?? "");
  const [region, setRegion] = useState(listing?.region ?? "");
  const [deliveryType, setDeliveryType] = useState(listing?.deliveryType ?? "MANUAL");
  const [deliveryEstimate, setDeliveryEstimate] = useState(listing?.deliveryEstimate ?? "");
  const [expiresAt, setExpiresAt] = useState(() => {
    if (!listing?.expiresAt) return "";
    const date = new Date(listing.expiresAt);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  });
  const [images, setImages] = useState<string[]>(listing?.images ?? []);
  const [attributes, setAttributes] = useState<Record<string, AttributeValue>>(
    (listing?.attributes ?? {}) as Record<string, AttributeValue>
  );
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, startTransition] = useTransition();

  const selectedGame = games.find((game) => game.id === gameId);
  const categories = selectedGame?.categories ?? [];
  const category = categories.find((item) => item.id === categoryId);

  function updateAttribute(key: string, value: AttributeValue | undefined) {
    setAttributes((current) => {
      const next = { ...current };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const result = await uploadSellerListingImage(file);
      if (!result.success) throw new Error(result.error);
      setImages((current) => [...current, result.data.url].slice(0, 5));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  function save(submitForReview: boolean) {
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const result = await saveSellerListing(
          {
            gameId,
            categoryId,
            title,
            description,
            price: Number(price),
            currency,
            quantity: Number(quantity),
            platform,
            region,
            deliveryType,
            deliveryEstimate,
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : "",
            images,
            attributes,
            submitForReview,
          },
          listing?.id
        );
        if (!result.success) throw new Error(result.error);
        if (submitForReview) {
          setNotice("Submitted for review. Buyers will see the offer after approval.");
          router.push("/seller/listings");
          router.refresh();
        } else if (listing) {
          setNotice("Draft saved.");
          router.refresh();
        } else {
          router.push(`/seller/listings/${result.data.listingId}`);
          router.refresh();
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to save listing");
      }
    });
  }

  return (
    <div>
      <Link href="/seller/listings" className="text-xs font-semibold text-cyan-200 hover:text-white">← Your listings</Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Seller studio</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white">
            {listing ? "Edit listing" : "Create a listing"}
          </h1>
          {listing && <p className="mt-2 text-sm text-slate-400">Current status: {listing.status.replaceAll("_", " ").toLowerCase()}</p>}
        </div>
        <button type="button" onClick={() => setPreview((current) => !current)} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/[0.05]">
          {preview ? "Edit details" : "Preview"}
        </button>
      </div>

      {preview ? (
        <section className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-[#111a2b]">
          {images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[0]} alt="" className="aspect-[2.4] w-full object-cover" />
          )}
          <div className="p-6">
            <p className="text-xs uppercase tracking-wide text-cyan-300">{selectedGame?.name ?? "Game"} · {category?.name ?? "Category"}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-white">{title || "Your listing title"}</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">{description || "Your product description will appear here."}</p>
            <p className="mt-5 text-2xl font-semibold text-white">{currency} {price || "0.00"}</p>
            <p className="mt-1 text-xs text-slate-400">{quantity || "0"} available · {platform || "Platform not specified"} · {region || "Region not specified"}</p>
            <p className="mt-1 text-xs text-slate-400">
              {deliveryType === "INSTANT" ? "Instant delivery" : "Manual delivery"}
              {deliveryEstimate && ` · ${deliveryEstimate}`}
              {expiresAt && ` · Expires ${new Date(expiresAt).toLocaleDateString()}`}
            </p>
            {category?.fields.some((field) => attributes[field.key] !== undefined) && (
              <dl className="mt-5 grid gap-2 border-t border-white/[0.08] pt-4 sm:grid-cols-2">
                {category.fields.map((field) => {
                  const value = attributes[field.key];
                  if (value === undefined || value === "") return null;
                  return (
                    <div key={field.key}>
                      <dt className="text-xs text-slate-500">{field.label}</dt>
                      <dd className="mt-1 text-sm text-slate-200">
                        {Array.isArray(value) ? value.join(", ") : String(value)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </div>
        </section>
      ) : (
        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-white/[0.09] bg-[#111a2b] p-5 sm:p-6">
              <h2 className="font-semibold text-white">Product type</h2>
              <p className="mt-1 text-xs text-slate-400">Choose the game and its configured category, such as accounts, currency, items, top-ups, or services.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>Game
                  <select value={gameId} onChange={(event) => {
                    setGameId(event.target.value);
                    setCategoryId("");
                    setAttributes({});
                    setPlatform("");
                  }} className={fieldClass}>
                    <option value="">Select a published game</option>
                    {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
                  </select>
                </label>
                <label className={labelClass}>Category
                  <select value={categoryId} onChange={(event) => {
                    setCategoryId(event.target.value);
                    setAttributes({});
                    setPlatform("");
                  }} disabled={!selectedGame} className={fieldClass}>
                    <option value="">Select a category</option>
                    {categories.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.type}</option>)}
                  </select>
                </label>
              </div>
              {category?.description && <p className="mt-3 text-xs text-slate-500">{category.description}</p>}
            </section>

            <section className="rounded-2xl border border-white/[0.09] bg-[#111a2b] p-5 sm:p-6">
              <h2 className="font-semibold text-white">Listing details</h2>
              <div className="mt-4 space-y-4">
                <label className={labelClass}>Title
                  <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} className={fieldClass} placeholder="Describe what the buyer will receive" />
                </label>
                <label className={labelClass}>Description
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={6} className={fieldClass} placeholder="Explain what is included, limitations, and any requirements." />
                </label>
                <p className="-mt-2 text-xs text-amber-200/80">Never enter passwords, recovery codes, or other sensitive account credentials here. Secure credential handover is not available.</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className={labelClass}>Price
                    <input type="number" min="0.01" max="9999999999.99" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className={fieldClass} />
                  </label>
                  <label className={labelClass}>Currency
                    <select value={currency} onChange={(event) => setCurrency(event.target.value)} className={fieldClass}>
                      {["USD", "EUR", "GBP", "CAD", "AUD"].map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className={labelClass}>Available quantity
                    <input type="number" min="0" max="100000" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className={fieldClass} />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>Platform
                    {category?.platforms.length ? (
                      <select value={platform} onChange={(event) => setPlatform(event.target.value)} className={fieldClass}>
                        <option value="">Select a platform</option>
                        {category.platforms.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    ) : (
                      <input value={platform} onChange={(event) => setPlatform(event.target.value)} maxLength={80} className={fieldClass} placeholder="PC, PlayStation, Xbox..." />
                    )}
                  </label>
                  <label className={labelClass}>Region
                    <input value={region} onChange={(event) => setRegion(event.target.value)} maxLength={80} className={fieldClass} placeholder="Global, North America..." />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>Delivery type
                    <select value={deliveryType} onChange={(event) => setDeliveryType(event.target.value as "INSTANT" | "MANUAL")} className={fieldClass}>
                      <option value="INSTANT">Instant</option>
                      <option value="MANUAL">Manual</option>
                    </select>
                  </label>
                  <label className={labelClass}>Delivery estimate
                    <input value={deliveryEstimate} onChange={(event) => setDeliveryEstimate(event.target.value)} maxLength={120} className={fieldClass} placeholder="e.g. Within 2 hours" />
                  </label>
                </div>
                <label className={labelClass}>Expiration (optional)
                  <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className={fieldClass} />
                </label>
              </div>
            </section>

            {category?.fields.length ? (
              <section className="rounded-2xl border border-white/[0.09] bg-[#111a2b] p-5 sm:p-6">
                <h2 className="font-semibold text-white">Category details</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {category.fields.map((field) => {
                    const value = attributes[field.key];
                    return (
                      <div key={field.key}>
                        {field.type === CategoryFieldType.BOOLEAN ? (
                          <label className="flex items-center gap-2 text-sm text-slate-300">
                            <input type="checkbox" checked={value === true} onChange={(event) => updateAttribute(field.key, event.target.checked)} />
                            {field.label}{field.isRequired && " *"}
                          </label>
                        ) : field.type === CategoryFieldType.MULTI_SELECT ? (
                          <fieldset>
                            <legend className={labelClass}>{field.label}{field.isRequired && " *"}</legend>
                            <div className="mt-2 flex flex-wrap gap-3">
                              {field.options.map((option) => (
                                <label key={option} className="flex items-center gap-1.5 text-xs text-slate-300">
                                  <input type="checkbox" checked={Array.isArray(value) && value.includes(option)} onChange={(event) => {
                                    const current = Array.isArray(value) ? value : [];
                                    updateAttribute(field.key, event.target.checked ? [...current, option] : current.filter((entry) => entry !== option));
                                  }} />
                                  {option}
                                </label>
                              ))}
                            </div>
                          </fieldset>
                        ) : (
                          <label className={labelClass}>{field.label}{field.isRequired && " *"}
                            {field.type === CategoryFieldType.SELECT ? (
                              <select value={typeof value === "string" ? value : ""} onChange={(event) => updateAttribute(field.key, event.target.value || undefined)} className={fieldClass}>
                                <option value="">Select</option>
                                {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                              </select>
                            ) : (
                              <input
                                type={field.type === CategoryFieldType.NUMBER ? "number" : "text"}
                                value={typeof value === "number" || typeof value === "string" ? value : ""}
                                onChange={(event) => {
                                  const next = event.target.value;
                                  updateAttribute(field.key, next === "" ? undefined : field.type === CategoryFieldType.NUMBER ? Number(next) : next);
                                }}
                                maxLength={500}
                                className={fieldClass}
                              />
                            )}
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-white/[0.09] bg-[#111a2b] p-5">
              <h2 className="font-semibold text-white">Images</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">Up to 5 JPEG, PNG, WebP, or AVIF images. Maximum 8 MB each.</p>
              <label className="mt-4 flex cursor-pointer justify-center rounded-lg border border-dashed border-white/20 px-3 py-4 text-center text-xs font-semibold text-cyan-100 hover:border-cyan-300/40">
                {uploading ? "Uploading..." : "Choose image"}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading || images.length >= 5} onChange={(event) => {
                  void uploadImage(event.target.files?.[0]);
                  event.target.value = "";
                }} className="sr-only" />
              </label>
              {images.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {images.map((image, index) => (
                    <li key={image} className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt={`Listing image ${index + 1}`} className="h-12 w-16 rounded object-cover" />
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-400">Image {index + 1}</span>
                      <button type="button" onClick={() => setImages((current) => current.filter((_, position) => position !== index))} aria-label={`Remove image ${index + 1}`} className="text-xs text-rose-200">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.04] p-5">
              <h2 className="font-semibold text-white">Review before publishing</h2>
              <p className="mt-2 text-xs leading-5 text-slate-400">Submitting sends your listing to moderation. It becomes visible to buyers only after approval. Changes to listing details require a new review.</p>
              <div className="mt-4 space-y-2">
                <button type="button" onClick={() => save(false)} disabled={busy || uploading} className="w-full rounded-lg border border-white/15 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                  Save draft
                </button>
                <button type="button" onClick={() => save(true)} disabled={busy || uploading} className="w-full rounded-lg bg-cyan-300 px-3 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50">
                  Submit for review
                </button>
              </div>
            </section>
          </aside>
        </div>
      )}
      {!preview && listing?.revisions.length ? (
        <details className="mt-6 rounded-xl border border-white/[0.09] bg-[#111a2b] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-200">Revision history ({listing.revisions.length} latest)</summary>
          <ol className="mt-3 space-y-2">
            {listing.revisions.map((revision) => (
              <li key={revision.id} className="flex flex-wrap justify-between gap-2 text-xs text-slate-400">
                <span>Revision {revision.revisionNumber} · {revision.changedBy.name}</span>
                <time dateTime={revision.createdAt.toISOString()}>{revision.createdAt.toLocaleString()}</time>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
      {error && <p role="alert" className="mt-5 rounded-lg border border-rose-300/20 bg-rose-300/[0.06] p-3 text-sm text-rose-200">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] p-3 text-sm text-cyan-100">{notice}</p>}
    </div>
  );
}
