"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import qs from "query-string";
import toast from "@/app/libs/toast";
import { IconBell, IconBellOff, IconBookmark, IconSearch, IconTrash } from "@tabler/icons-react";

import type { IListingsParams } from "../actions/getListings";
import type { SavedSearchFilters, SavedSearchFrequency } from "../libs/savedSearch";

interface SavedSearchRecord {
  id: string;
  name: string;
  filters: SavedSearchFilters;
  alertFrequency: SavedSearchFrequency;
  active: boolean;
  updatedAt: string;
}

interface SavedSearchManagerProps {
  currentFilters: IListingsParams;
  hasFilters: boolean;
}

const describe = (filters: SavedSearchFilters) => {
  const parts: string[] = [];
  if (filters.suburb) parts.push(`${filters.suburb}${filters.state ? `, ${filters.state}` : ""}`);
  else if (filters.state) parts.push(String(filters.state));
  if (filters.category) parts.push(String(filters.category));
  if (filters.startDate && filters.endDate) parts.push("Selected dates");
  if (filters.guestCount) parts.push(`${filters.guestCount} people`);
  return parts.length ? parts.join(" · ") : "Custom vehicle search";
};

const SavedSearchManager: React.FC<SavedSearchManagerProps> = ({ currentFilters, hasFilters }) => {
  const router = useRouter();
  const [searches, setSearches] = useState<SavedSearchRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<SavedSearchFrequency>("WEEKLY");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get("/api/saved-searches")
      .then((response) => setSearches(response.data || []))
      .catch(() => setSearches([]))
      .finally(() => setLoading(false));
  }, []);

  const filters = useMemo(() => Object.fromEntries(
    Object.entries(currentFilters).filter(([, value]) => value !== undefined && value !== "")
  ) as SavedSearchFilters, [currentFilters]);

  const defaultName = useMemo(() => {
    if (filters.suburb) return `${filters.suburb} vehicles`;
    if (filters.state) return `${filters.state} vehicles`;
    if (filters.category) return `${filters.category} search`;
    return "My vehicle search";
  }, [filters]);

  const save = async () => {
    setSaving(true);
    try {
      const response = await axios.post("/api/saved-searches", {
        name: name.trim() || defaultName,
        filters,
        alertFrequency: frequency,
      });
      setSearches((current) => [response.data, ...current]);
      setShowForm(false);
      setName("");
      toast.success(frequency === "OFF" ? "Search saved" : `${frequency === "DAILY" ? "Daily" : "Weekly"} search alerts enabled`);
    } catch (error) {
      toast.error(axios.isAxiosError(error) ? error.response?.data?.error || "Could not save this search" : "Could not save this search");
    } finally {
      setSaving(false);
    }
  };

  const apply = (search: SavedSearchRecord) => {
    router.push(qs.stringifyUrl({ url: "/explore", query: { ...search.filters } }, { skipNull: true, skipEmptyString: true }));
  };

  const changeFrequency = async (search: SavedSearchRecord, alertFrequency: SavedSearchFrequency) => {
    try {
      const response = await axios.patch(`/api/saved-searches/${search.id}`, { alertFrequency });
      setSearches((current) => current.map((item) => item.id === search.id ? response.data : item));
      toast.success(alertFrequency === "OFF" ? "Alerts paused" : `${alertFrequency === "DAILY" ? "Daily" : "Weekly"} alerts enabled`);
    } catch {
      toast.error("Could not update alerts");
    }
  };

  const remove = async (search: SavedSearchRecord) => {
    try {
      await axios.delete(`/api/saved-searches/${search.id}`);
      setSearches((current) => current.filter((item) => item.id !== search.id));
      toast.success("Saved search removed");
    } catch {
      toast.error("Could not remove saved search");
    }
  };

  if (loading && !hasFilters) return null;
  if (!hasFilters && searches.length === 0) return null;

  return (
    <section className="rounded-md border border-hairline-soft bg-surface-soft/60 p-4 sm:p-5" aria-labelledby="saved-searches-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="saved-searches-heading" className="flex items-center gap-2 text-base font-semibold text-ink">
            <IconBookmark size={19} className="text-primary" aria-hidden="true" /> Saved searches
          </h2>
          <p className="mt-1 text-xs text-muted">Return on any device and choose how often Redrive should alert you.</p>
        </div>
        {hasFilters && (
          <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-ink transition hover:bg-accent-active hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <IconBookmark size={17} aria-hidden="true" /> Save this search
          </button>
        )}
      </div>

      {showForm && (
        <div className="mt-4 grid gap-3 rounded-md border border-hairline bg-white p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="text-xs font-semibold text-ink">Search name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={defaultName} maxLength={60} className="mt-1.5 h-11 w-full rounded-sm border border-hairline px-3 text-sm font-normal outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </label>
          <label className="text-xs font-semibold text-ink">Alerts
            <select value={frequency} onChange={(event) => setFrequency(event.target.value as SavedSearchFrequency)} className="mt-1.5 h-11 w-full rounded-sm border border-hairline bg-white px-3 text-sm font-normal outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="OFF">Off</option><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option>
            </select>
          </label>
          <button type="button" onClick={() => void save()} disabled={saving} className="h-11 rounded-sm bg-accent px-5 text-sm font-semibold text-ink transition hover:bg-accent disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
        </div>
      )}

      {searches.length > 0 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {searches.map((search) => (
            <article key={search.id} className="min-w-[280px] max-w-[320px] flex-1 rounded-md border border-hairline bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => apply(search)} className="min-w-0 text-left outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-primary">
                  <span className="block truncate text-sm font-semibold text-ink">{search.name}</span>
                  <span className="mt-1 block truncate text-xs text-muted">{describe(search.filters)}</span>
                </button>
                <button type="button" onClick={() => void remove(search)} aria-label={`Delete ${search.name}`} className="rounded-full p-2 text-muted transition hover:bg-error-soft hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><IconTrash size={16} /></button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={() => apply(search)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-sm bg-accent px-3 text-xs font-semibold text-ink hover:bg-accent-active hover:text-white"><IconSearch size={15} /> Search</button>
                <label className="relative flex h-9 items-center rounded-sm border border-hairline px-2 text-xs text-muted">
                  {search.alertFrequency === "OFF" ? <IconBellOff size={15} className="mr-1.5" /> : <IconBell size={15} className="mr-1.5 text-primary" />}
                  <select aria-label={`Alert frequency for ${search.name}`} value={search.alertFrequency} onChange={(event) => void changeFrequency(search, event.target.value as SavedSearchFrequency)} className="bg-transparent pr-1 text-xs font-medium text-ink outline-none"><option value="OFF">Off</option><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option></select>
                </label>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default SavedSearchManager;
