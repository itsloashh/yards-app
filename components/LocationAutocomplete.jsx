"use client";
import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, Check } from "lucide-react";
import { searchLocations } from "@/lib/geocode";

export default function LocationAutocomplete({ value, onChange, error, placeholder = "e.g., Windsor, Ontario" }) {
  const [query, setQuery] = useState(value?.label || "");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSelected, setIsSelected] = useState(!!value?.label);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Keep in sync if parent resets the value
  useEffect(() => {
    if (value?.label !== undefined && value.label !== query) {
      setQuery(value.label || "");
      setIsSelected(!!value.label);
    }
  }, [value?.label]);

  // Click outside closes dropdown
  useEffect(() => {
    function onClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("touchstart", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("touchstart", onClickOutside);
    };
  }, []);

  const handleInput = (e) => {
    const v = e.target.value;
    setQuery(v);
    setIsSelected(false);
    // Clear the committed value when they're typing fresh
    if (value?.label) onChange(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!v || v.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    setShowDropdown(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchLocations(v);
      setSuggestions(results);
      setLoading(false);
    }, 350);
  };

  const selectSuggestion = (s) => {
    setQuery(s.label);
    setIsSelected(true);
    setShowDropdown(false);
    setSuggestions([]);
    onChange(s);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 z-10" />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => { if (suggestions.length) setShowDropdown(true); }}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full pl-10 pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${
            error ? "border-rose-300 bg-rose-50" : "border-stone-200"
          }`}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 animate-spin" />
        )}
        {!loading && isSelected && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (suggestions.length > 0 || (!loading && query.length >= 2)) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden z-50 max-h-64 overflow-y-auto">
          {suggestions.length > 0 ? (
            suggestions.map((s, i) => (
              <button
                key={`${s.label}-${i}`}
                type="button"
                onClick={() => selectSuggestion(s)}
                className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 transition flex items-start gap-2 text-sm border-b border-stone-100 last:border-0"
              >
                <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-stone-800 font-medium truncate">{s.city}</p>
                  <p className="text-stone-500 text-xs truncate">
                    {[s.region, s.country].filter(Boolean).join(", ")}
                  </p>
                </div>
              </button>
            ))
          ) : (
            !loading && (
              <div className="px-4 py-3 text-stone-400 text-xs text-center">
                No matches — try a different spelling or include the state/province
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
