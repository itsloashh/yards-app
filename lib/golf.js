"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ─── PUBLIC: active products for the shop ───
export function useGolfProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("golf_products")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("[useGolfProducts] error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { products, loading, reload };
}

// ─── PUBLIC: active games (reference) ───
export function useGolfGames() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("golf_games")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setGames(data || []);
    } catch (err) {
      console.error("[useGolfGames] error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { games, loading, reload };
}

// ─── ADMIN: all products/games (including inactive) ───
export function useGolfAdmin(kind) {
  const table = kind === "games" ? "golf_games" : "golf_products";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error(`[useGolfAdmin ${table}] error:`, err);
    } finally {
      setLoading(false);
    }
  }, [table]);

  useEffect(() => { reload(); }, [reload]);
  return { items, loading, reload };
}

// ─── ADMIN mutations ───
export async function saveGolfProduct(product) {
  const row = {
    name: product.name,
    description: product.description || "",
    price_cents: Math.round((parseFloat(product.price) || 0) * 100),
    images: product.images || [],
    category: product.category || "",
    in_stock: product.in_stock !== false,
    stock_qty: product.stock_qty === "" || product.stock_qty == null ? null : parseInt(product.stock_qty),
    sort_order: parseInt(product.sort_order) || 0,
    active: product.active !== false,
    updated_at: new Date().toISOString(),
  };
  if (product.id) {
    return supabase.from("golf_products").update(row).eq("id", product.id);
  }
  return supabase.from("golf_products").insert(row);
}

export async function deleteGolfProduct(id) {
  return supabase.from("golf_products").delete().eq("id", id);
}

export async function saveGolfGame(game) {
  const row = {
    name: game.name,
    tagline: game.tagline || "",
    players: game.players || "",
    difficulty: game.difficulty || "",
    rules: game.rules || "",
    images: game.images || [],
    sort_order: parseInt(game.sort_order) || 0,
    active: game.active !== false,
    updated_at: new Date().toISOString(),
  };
  if (game.id) {
    return supabase.from("golf_games").update(row).eq("id", game.id);
  }
  return supabase.from("golf_games").insert(row);
}

export async function deleteGolfGame(id) {
  return supabase.from("golf_games").delete().eq("id", id);
}

// ─── Upload a golf image (product or game reference) to the golf bucket ───
export async function uploadGolfImage(base64Image, folder = "products") {
  if (!base64Image) return null;
  try {
    const [meta, b64] = base64Image.split(",");
    const mime = meta.includes("png") ? "image/png" : "image/jpeg";
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const ext = mime.includes("png") ? "png" : "jpg";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("golf").upload(path, blob, { contentType: mime, upsert: true });
    if (error) { console.warn("[uploadGolfImage] error:", error.message); return null; }
    const { data } = supabase.storage.from("golf").getPublicUrl(path);
    return data?.publicUrl || null;
  } catch (e) {
    console.warn("[uploadGolfImage] exception:", e);
    return null;
  }
}

export function money(cents) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}
