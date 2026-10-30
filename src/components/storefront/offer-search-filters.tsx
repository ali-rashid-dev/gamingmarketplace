"use client";

import { useEffect, useState } from "react";
import type {
  OfferSearchFilters,
  SearchParams,
} from "@/lib/storefront-search";

type SearchOptions = {
  games: {
    id: string;
    name: string;
    categories: { id: string; name: string; platforms: string[] }[];
  }[];
  categories: { id: string; gameId: string; gameName: string; name: string }[];
  platforms: string[];
  regions: string[];
};

function inputValue(params: SearchParams, key: string) {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

export function OfferSearchFiltersForm({
  action = "/offers",
  options,
  filters,
  params,
  fixedGameId,
  fixedCategoryId,
}: {
  action?: string;
  options: SearchOptions;
  filters: OfferSearchFilters;
  params: SearchParams;
  fixedGameId?: string;
  fixedCategoryId?: string;
}) {
  const [query, setQuery] = useState(filters.q);
  const [gameId, setGameId] = useState(fixedGameId ?? filters.gameId);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    fixedCategoryId ?? inputValue(params, "categoryId")
  );
  const [currency, setCurrency] = useState(filters.currency);
  const [minPrice, setMinPrice] = useState(inputValue(params, "minPrice"));
  const [maxPrice, setMaxPrice] = useState(inputValue(params, "maxPrice"));
  const [sort, setSort] = useState(filters.sort);
  const [suggestions, setSuggestions] = useState<{ query: string; values: string[] }>({
    query: "",
    values: [],
  });
  const categories = gameId
    ? options.categories.filter((category) => category.gameId === gameId)
    : options.categories;
  const currencyRequired =
    minPrice !== "" ||
    maxPrice !== "" ||
    sort === "price_asc" ||
    sort === "price_desc";

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      fetch(`/api/search/suggestions?q=${encodeURIComponent(normalized)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) return;
          const result = (await response.json()) as { suggestions?: unknown };
          if (
            Array.isArray(result.suggestions) &&
            result.suggestions.every((value) => typeof value === "string")
          ) {
            setSuggestions({ query: normalized, values: result.suggestions });
          }
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          console.error("Search suggestions failed", error);
        });
    }, 180);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  return (
    <form
      action={action}
      method="get"
      className="mb-8 rounded-2xl border border-white/[0.09] bg-card p-4 sm:p-5"
    >
      {fixedGameId && <input type="hidden" name="gameId" value={fixedGameId} />}
      {fixedCategoryId && <input type="hidden" name="categoryId" value={fixedCategoryId} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-slate-300 sm:col-span-2">
          Search game, category, or offer
          <input
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
            list="offer-search-suggestions"
            placeholder="e.g. Fortnite, account, rare skin"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300/50 focus:outline-none"
          />
          {suggestions.query === query.trim() && suggestions.values.length > 0 && (
            <datalist id="offer-search-suggestions">
              {suggestions.values.map((suggestion) => <option key={suggestion} value={suggestion} />)}
            </datalist>
          )}
        </label>
        {fixedGameId ? (
          <div className="self-end rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-xs text-slate-300">
            {options.games.find((game) => game.id === fixedGameId)?.name ?? "Selected game"}
          </div>
        ) : (
          <label className="text-xs font-medium text-slate-300">
            Game
            <select
              name="gameId"
              value={gameId}
              onChange={(event) => {
                setGameId(event.target.value);
                setSelectedCategoryId("");
              }}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-white"
            >
              <option value="">All games</option>
              {options.games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
            </select>
          </label>
        )}
        {fixedCategoryId ? (
          <div className="self-end rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-xs text-slate-300">
            {options.categories.find((category) => category.id === fixedCategoryId)?.name ?? "Selected category"}
          </div>
        ) : (
          <label className="text-xs font-medium text-slate-300">
            Category
            <select
              name="categoryId"
              value={selectedCategoryId}
              onChange={(event) => setSelectedCategoryId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-white"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {gameId ? category.name : `${category.gameName} · ${category.name}`}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-xs font-medium text-slate-300">
          Currency
          <select name="currency" value={currency} required={currencyRequired} onChange={(event) => setCurrency(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-white">
            <option value="">{currencyRequired ? "Choose currency for price" : "Any currency"}</option>
            {["USD", "EUR", "GBP", "CAD", "AUD"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-300">
          Minimum price
          <input name="minPrice" type="number" min="0" step="0.01" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-white" />
        </label>
        <label className="text-xs font-medium text-slate-300">
          Maximum price
          <input name="maxPrice" type="number" min="0" step="0.01" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-white" />
        </label>
        <label className="text-xs font-medium text-slate-300">
          Platform
          <select name="platform" defaultValue={filters.platform} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-white">
            <option value="">All platforms</option>
            {options.platforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-300">
          Region
          <select name="region" defaultValue={filters.region} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-white">
            <option value="">All regions</option>
            {options.regions.map((region) => <option key={region} value={region}>{region}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-300">
          Seller rating
          <select name="minRating" defaultValue={inputValue(params, "minRating")} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-white">
            <option value="">Any rating</option>
            <option value="4">4 stars and up</option>
            <option value="4.5">4.5 stars and up</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-300">
          Availability
          <select name="minQuantity" defaultValue={String(filters.minQuantity)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-white">
            <option value="1">Available now</option>
            <option value="5">5 or more available</option>
            <option value="10">10 or more available</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-300">
          Sort by
          <select name="sort" value={sort} onChange={(event) => setSort(event.target.value as OfferSearchFilters["sort"])} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-white">
            <option value="relevance">Relevance</option>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="popular">Popularity</option>
          </select>
        </label>
      </div>
      {currencyRequired && (
        <p className="mt-3 text-xs text-amber-200/80">
          Select a currency to compare price ranges or sort offers by price. Amounts are not converted.
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" name="verified" value="1" defaultChecked={filters.verified} className="accent-cyan-300" />
            Verified sellers
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" name="instant" value="1" defaultChecked={filters.instant} className="accent-cyan-300" />
            Instant delivery
          </label>
          <span className="text-xs text-slate-500">Unavailable offers are always excluded.</span>
        </div>
        <div className="flex gap-2">
          <a href={action} className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.05]">Clear filters</a>
          <button type="submit" className="rounded-lg bg-cyan-300 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-200">Search offers</button>
        </div>
      </div>
    </form>
  );
}
