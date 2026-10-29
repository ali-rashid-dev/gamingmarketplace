"use client";

import { useState } from "react";

type FieldKind = "TEXT" | "NUMBER" | "BOOLEAN" | "SELECT" | "MULTI_SELECT";
type GameStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type CatalogField = {
  id?: string;
  key: string;
  label: string;
  type: FieldKind;
  isRequired: boolean;
  options: string[];
  sortOrder: number;
};

type CatalogCategory = {
  id: string;
  gameId: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  platforms: string[];
  isActive: boolean;
  fields: CatalogField[];
};

type CatalogGame = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: GameStatus;
  listingCount: number;
  categories: CatalogCategory[];
};

type GameForm = Omit<CatalogGame, "id" | "listingCount" | "categories">;
type CategoryForm = Omit<CatalogCategory, "id" | "gameId">;

const emptyGame: GameForm = {
  name: "",
  slug: "",
  description: "",
  logoUrl: "",
  coverImageUrl: "",
  seoTitle: "",
  seoDescription: "",
  status: "DRAFT",
};

const emptyCategory: CategoryForm = {
  name: "",
  slug: "",
  type: "",
  description: "",
  platforms: [],
  isActive: true,
  fields: [],
};

const inputClass =
  "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";
const labelClass = "block text-sm font-medium text-foreground";
const buttonClass =
  "rounded-md border border-border px-3 py-2 text-sm font-medium transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";

async function responseError(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `Request failed (${response.status})`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CatalogClient({
  initialGames,
}: {
  initialGames: CatalogGame[];
}) {
  const [games, setGames] = useState(initialGames);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [gameForm, setGameForm] = useState<GameForm>(emptyGame);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategory);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [savingGame, setSavingGame] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [uploading, setUploading] = useState<"logoUrl" | "coverImageUrl" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedGame = games.find((game) => game.id === selectedGameId) ?? null;

  function startNewGame() {
    setSelectedGameId(null);
    setGameForm(emptyGame);
    setCategoryForm(emptyCategory);
    setEditingCategoryId(null);
    setError("");
    setNotice("");
  }

  function selectGame(game: CatalogGame) {
    setSelectedGameId(game.id);
    setGameForm({
      name: game.name,
      slug: game.slug,
      description: game.description ?? "",
      logoUrl: game.logoUrl ?? "",
      coverImageUrl: game.coverImageUrl ?? "",
      seoTitle: game.seoTitle ?? "",
      seoDescription: game.seoDescription ?? "",
      status: game.status,
    });
    setCategoryForm(emptyCategory);
    setEditingCategoryId(null);
    setError("");
    setNotice("");
  }

  async function reloadGames() {
    const response = await fetch("/api/admin/catalog/games");
    if (!response.ok) throw new Error(await responseError(response));
    const body = (await response.json()) as { games: CatalogGame[] };
    setGames(body.games);
  }

  async function saveGame(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingGame(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        selectedGameId
          ? `/api/admin/catalog/games/${selectedGameId}`
          : "/api/admin/catalog/games",
        {
          method: selectedGameId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...gameForm,
            description: gameForm.description || null,
            logoUrl: gameForm.logoUrl || null,
            coverImageUrl: gameForm.coverImageUrl || null,
            seoTitle: gameForm.seoTitle || null,
            seoDescription: gameForm.seoDescription || null,
          }),
        }
      );
      if (!response.ok) throw new Error(await responseError(response));
      const body = (await response.json()) as { game: { id: string } };
      await reloadGames();
      setSelectedGameId(body.game.id);
      setNotice(selectedGameId ? "Game changes saved." : "Game created.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save game.");
    } finally {
      setSavingGame(false);
    }
  }

  async function changeStatus(status: GameStatus) {
    if (!selectedGameId) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/catalog/games/${selectedGameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setGameForm((current) => ({ ...current, status }));
      await reloadGames();
      setNotice(
        status === "PUBLISHED"
          ? "Game published."
          : status === "ARCHIVED"
            ? "Game archived."
            : "Game moved to draft."
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update game status.");
    }
  }

  async function uploadImage(
    field: "logoUrl" | "coverImageUrl",
    file: File | undefined
  ) {
    if (!file) return;
    setUploading(field);
    setError("");
    setNotice("");
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/admin/catalog/upload", {
        method: "POST",
        body: data,
      });
      if (!response.ok) throw new Error(await responseError(response));
      const result = (await response.json()) as { url: string };
      setGameForm((current) => ({ ...current, [field]: result.url }));
      setNotice(field === "logoUrl" ? "Logo uploaded." : "Cover image uploaded.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload image.");
    } finally {
      setUploading(null);
    }
  }

  function startCategory(category?: CatalogCategory) {
    setEditingCategoryId(category?.id ?? null);
    setCategoryForm(
      category
        ? {
            name: category.name,
            slug: category.slug,
            type: category.type,
            description: category.description ?? "",
            platforms: category.platforms,
            isActive: category.isActive,
            fields: category.fields.map((field) => ({
              key: field.key,
              label: field.label,
              type: field.type,
              isRequired: field.isRequired,
              options: field.options,
              sortOrder: field.sortOrder,
            })),
          }
        : emptyCategory
    );
    setError("");
    setNotice("");
  }

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGameId) return;
    setSavingCategory(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        editingCategoryId
          ? `/api/admin/catalog/categories/${editingCategoryId}`
          : `/api/admin/catalog/games/${selectedGameId}/categories`,
        {
          method: editingCategoryId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...categoryForm,
            description: categoryForm.description || null,
            platforms: categoryForm.platforms.map((platform) => platform.trim()).filter(Boolean),
            fields: categoryForm.fields.map((field, index) => ({
              ...field,
              options: field.options.map((option) => option.trim()).filter(Boolean),
              sortOrder: index,
            })),
          }),
        }
      );
      if (!response.ok) throw new Error(await responseError(response));
      await reloadGames();
      setCategoryForm(emptyCategory);
      setEditingCategoryId(null);
      setNotice(editingCategoryId ? "Category changes saved." : "Category created.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save category.");
    } finally {
      setSavingCategory(false);
    }
  }

  function updateField(index: number, patch: Partial<CatalogField>) {
    setCategoryForm((current) => ({
      ...current,
      fields: current.fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field
      ),
    }));
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Marketplace administration
          </p>
          <h1 className="text-4xl font-semibold">Game catalog</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage games, product types, visibility, and listing requirements.
          </p>
        </div>
        <button className={buttonClass} type="button" onClick={startNewGame}>
          Add game
        </button>
      </header>

      {(error || notice) && (
        <div
          role={error ? "alert" : "status"}
          className={`mb-5 rounded-md border px-4 py-3 text-sm ${
            error
              ? "border-destructive/50 text-destructive"
              : "border-primary/40 text-primary"
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="h-fit rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">Games ({games.length})</h2>
          <div className="space-y-2">
            {games.map((game) => (
              <button
                type="button"
                key={game.id}
                onClick={() => selectGame(game)}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  selectedGameId === game.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-accent"
                }`}
              >
                <span className="flex items-center justify-between gap-2 font-medium">
                  {game.name}
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {game.status}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {game.categories.length} categories · {game.listingCount} listings
                </span>
              </button>
            ))}
            {games.length === 0 && (
              <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                No games have been added yet.
              </p>
            )}
          </div>
        </aside>

        <section className="space-y-6">
          <form onSubmit={saveGame} className="rounded-xl border border-border bg-card p-5 sm:p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">
                  {selectedGame ? "Game details" : "Create a game"}
                </h2>
                {selectedGame && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedGame.listingCount} marketplace listings use this game.
                  </p>
                )}
              </div>
              {selectedGame && (
                <div className="flex flex-wrap gap-2">
                  {gameForm.status !== "PUBLISHED" && (
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => void changeStatus("PUBLISHED")}
                    >
                      Publish
                    </button>
                  )}
                  {gameForm.status !== "DRAFT" && (
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => void changeStatus("DRAFT")}
                    >
                      Unpublish
                    </button>
                  )}
                  {gameForm.status !== "ARCHIVED" && (
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => void changeStatus("ARCHIVED")}
                    >
                      Archive
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                Game name
                <input
                  required
                  maxLength={100}
                  className={inputClass}
                  value={gameForm.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setGameForm((current) => ({
                      ...current,
                      name,
                      ...(selectedGameId ? {} : { slug: slugify(name) }),
                    }));
                  }}
                  placeholder="Fortnite"
                />
              </label>
              <label className={labelClass}>
                URL slug
                <input
                  required
                  maxLength={100}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  className={inputClass}
                  value={gameForm.slug}
                  onChange={(event) =>
                    setGameForm((current) => ({ ...current, slug: event.target.value }))
                  }
                  placeholder="fortnite"
                />
              </label>
              <label className={`${labelClass} sm:col-span-2`}>
                Description
                <textarea
                  rows={3}
                  maxLength={5000}
                  className={inputClass}
                  value={gameForm.description ?? ""}
                  onChange={(event) =>
                    setGameForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Describe the game and marketplace..."
                />
              </label>
              {(
                [
                  ["logoUrl", "Game logo"],
                  ["coverImageUrl", "Cover image"],
                ] as const
              ).map(([field, title]) => (
                <div key={field} className={labelClass}>
                  {title}
                  <input
                    type="url"
                    className={inputClass}
                    value={gameForm[field] ?? ""}
                    onChange={(event) =>
                      setGameForm((current) => ({ ...current, [field]: event.target.value }))
                    }
                    placeholder="https://..."
                  />
                  <div className="mt-2 flex items-center gap-3">
                    <label className={`${buttonClass} inline-flex cursor-pointer items-center`}>
                      {uploading === field ? "Uploading..." : "Upload image"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="sr-only"
                        disabled={uploading !== null}
                        onChange={(event) => {
                          void uploadImage(field, event.target.files?.[0]);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                    <span className="text-xs text-muted-foreground">JPEG, PNG, WebP or AVIF · 8 MB max</span>
                  </div>
                </div>
              ))}
              <label className={labelClass}>
                SEO title
                <input
                  maxLength={70}
                  className={inputClass}
                  value={gameForm.seoTitle ?? ""}
                  onChange={(event) =>
                    setGameForm((current) => ({ ...current, seoTitle: event.target.value }))
                  }
                  placeholder="Up to 70 characters"
                />
              </label>
              <label className={labelClass}>
                SEO description
                <input
                  maxLength={160}
                  className={inputClass}
                  value={gameForm.seoDescription ?? ""}
                  onChange={(event) =>
                    setGameForm((current) => ({
                      ...current,
                      seoDescription: event.target.value,
                    }))
                  }
                  placeholder="Up to 160 characters"
                />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button className={`${buttonClass} border-primary bg-primary text-primary-foreground hover:bg-primary/90`} disabled={savingGame || uploading !== null}>
                {savingGame ? "Saving..." : selectedGame ? "Save game" : "Create game"}
              </button>
              <span className="text-sm text-muted-foreground">
                Status: {gameForm.status.toLowerCase()}
              </span>
            </div>
          </form>

          {selectedGame && (
            <section className="rounded-xl border border-border bg-card p-5 sm:p-7">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">Categories</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Define product types, supported platforms, and listing fields.
                  </p>
                </div>
                <button className={buttonClass} type="button" onClick={() => startCategory()}>
                  Add category
                </button>
              </div>

              <div className="mb-6 space-y-3">
                {selectedGame.categories.map((category) => (
                  <article
                    key={category.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
                  >
                    <div>
                      <h3 className="font-medium">
                        {category.name}
                        {!category.isActive && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            Hidden
                          </span>
                        )}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {category.type} · {category.fields.length} listing fields
                        {category.platforms.length
                          ? ` · ${category.platforms.join(", ")}`
                          : " · All platforms"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => startCategory(category)}
                    >
                      Edit category
                    </button>
                  </article>
                ))}
                {selectedGame.categories.length === 0 && (
                  <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Add product categories such as Accounts, Items, Points, Top-ups, Gold, or Boosting.
                  </p>
                )}
              </div>

              <form onSubmit={saveCategory} className="rounded-lg border border-border bg-background p-4 sm:p-5">
                <h3 className="mb-4 text-lg font-semibold">
                  {editingCategoryId ? "Edit category" : "New category"}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>
                    Category name
                    <input
                      required
                      maxLength={100}
                      className={inputClass}
                      value={categoryForm.name}
                      onChange={(event) => {
                        const name = event.target.value;
                        setCategoryForm((current) => ({
                          ...current,
                          name,
                          ...(editingCategoryId ? {} : { slug: slugify(name) }),
                        }));
                      }}
                      placeholder="Accounts"
                    />
                  </label>
                  <label className={labelClass}>
                    URL slug
                    <input
                      required
                      maxLength={100}
                      pattern="[a-z0-9]+(-[a-z0-9]+)*"
                      className={inputClass}
                      value={categoryForm.slug}
                      onChange={(event) =>
                        setCategoryForm((current) => ({ ...current, slug: event.target.value }))
                      }
                      placeholder="accounts"
                    />
                  </label>
                  <label className={labelClass}>
                    Product type
                    <input
                      required
                      maxLength={64}
                      className={inputClass}
                      value={categoryForm.type}
                      onChange={(event) =>
                        setCategoryForm((current) => ({ ...current, type: event.target.value }))
                      }
                      placeholder="Currency, Points, Top-ups..."
                    />
                  </label>
                  <label className={labelClass}>
                    Supported platforms
                    <input
                      className={inputClass}
                      value={categoryForm.platforms.join(", ")}
                      onChange={(event) =>
                        setCategoryForm((current) => ({
                          ...current,
                          platforms: event.target.value.split(","),
                        }))
                      }
                      placeholder="PC, PlayStation, Xbox"
                    />
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Leave empty to allow all platforms.
                    </span>
                  </label>
                  <label className={`${labelClass} sm:col-span-2`}>
                    Description
                    <textarea
                      rows={2}
                      maxLength={2000}
                      className={inputClass}
                      value={categoryForm.description ?? ""}
                      onChange={(event) =>
                        setCategoryForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={categoryForm.isActive}
                      onChange={(event) =>
                        setCategoryForm((current) => ({
                          ...current,
                          isActive: event.target.checked,
                        }))
                      }
                    />
                    Category visible to sellers
                  </label>
                </div>

                <div className="mt-6 border-t border-border pt-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold">Required listing fields</h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Add game-specific attributes without changing the database schema.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() =>
                        setCategoryForm((current) => ({
                          ...current,
                          fields: [
                            ...current.fields,
                            {
                              key: "",
                              label: "",
                              type: "TEXT",
                              isRequired: true,
                              options: [],
                              sortOrder: current.fields.length,
                            },
                          ],
                        }))
                      }
                    >
                      Add field
                    </button>
                  </div>

                  <div className="space-y-3">
                    {categoryForm.fields.map((field, index) => (
                      <div key={index} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2 xl:grid-cols-4">
                        <label className={labelClass}>
                          Field label
                          <input
                            required
                            className={inputClass}
                            value={field.label}
                            onChange={(event) => {
                              const label = event.target.value;
                              updateField(index, {
                                label,
                                ...(field.key ? {} : { key: slugify(label).replace(/-/g, "_") }),
                              });
                            }}
                            placeholder="Account level"
                          />
                        </label>
                        <label className={labelClass}>
                          Attribute key
                          <input
                            required
                            pattern="[a-zA-Z][a-zA-Z0-9_]*"
                            className={inputClass}
                            value={field.key}
                            onChange={(event) => updateField(index, { key: event.target.value })}
                            placeholder="account_level"
                          />
                        </label>
                        <label className={labelClass}>
                          Field type
                          <select
                            className={inputClass}
                            value={field.type}
                            onChange={(event) => {
                              const type = event.target.value as FieldKind;
                              updateField(index, {
                                type,
                                options:
                                  type === "SELECT" || type === "MULTI_SELECT"
                                    ? field.options
                                    : [],
                              });
                            }}
                          >
                            <option value="TEXT">Text</option>
                            <option value="NUMBER">Number</option>
                            <option value="BOOLEAN">Yes / No</option>
                            <option value="SELECT">Single choice</option>
                            <option value="MULTI_SELECT">Multiple choice</option>
                          </select>
                        </label>
                        <div className="flex items-end justify-between gap-3">
                          <label className="flex items-center gap-2 pb-2 text-sm">
                            <input
                              type="checkbox"
                              checked={field.isRequired}
                              onChange={(event) =>
                                updateField(index, { isRequired: event.target.checked })
                              }
                            />
                            Required
                          </label>
                          <button
                            type="button"
                            className={`${buttonClass} text-destructive`}
                            onClick={() =>
                              setCategoryForm((current) => ({
                                ...current,
                                fields: current.fields.filter((_, fieldIndex) => fieldIndex !== index),
                              }))
                            }
                          >
                            Remove
                          </button>
                        </div>
                        {(field.type === "SELECT" || field.type === "MULTI_SELECT") && (
                          <label className={`${labelClass} sm:col-span-2 xl:col-span-4`}>
                            Options (comma separated)
                            <input
                              required
                              className={inputClass}
                              value={field.options.join(", ")}
                              onChange={(event) =>
                                updateField(index, {
                                  options: event.target.value.split(",").map((option) => option.trim()),
                                })
                              }
                              placeholder="Bronze, Silver, Gold"
                            />
                          </label>
                        )}
                      </div>
                    ))}
                    {categoryForm.fields.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No custom listing fields. Add fields like rank, server, region, or item rarity.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    className={`${buttonClass} border-primary bg-primary text-primary-foreground hover:bg-primary/90`}
                    disabled={savingCategory}
                  >
                    {savingCategory ? "Saving..." : editingCategoryId ? "Save category" : "Create category"}
                  </button>
                  {editingCategoryId && (
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => startCategory()}
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
              </form>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
