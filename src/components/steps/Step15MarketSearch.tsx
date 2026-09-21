// src/components/steps/Step15MarketSearch.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ShoppingCart,
  Zap,
  Battery,
  Sun,
  Shield,
  Cable,
  Star,
  MapPin,
  X,
  Check,
  ExternalLink,
  Truck,
  Clock,
  Info,
  Plug,
  Filter,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useSolarStore } from "@/store/solarStore";

// ============================================================
// TYPES
// ============================================================

type CableCircuitType = "ac" | "battery" | "pv";

interface EquipmentItem {
  id: string;
  brand: string;
  model: string;
  price: number;
  supplier: string;
  location: string;
  rating: number;
  inStock: boolean;
  delivery: string;
  warranty: string;
  type?: string;
  unit?: string;
  currentA?: number;
  voltageV?: number;
  poles?: number;
  ampacity?: number;
  cableType?: CableCircuitType;
  voltage?: number;
  capacityKWh?: number;
}

interface CartItem {
  id: string;
  cableCount?: number;
  quantity?: number;
}

interface MarketDatabase {
  inverters: EquipmentItem[];
  mppt: EquipmentItem[];
  breakers_dc: EquipmentItem[];
  breakers_ac: EquipmentItem[];
  batteries: EquipmentItem[];
  panels: EquipmentItem[];
  spd: EquipmentItem[];
  cables: EquipmentItem[];
}

// ============================================================
// MARKET DATABASE
// ============================================================

const MARKET_EQUIPMENT: MarketDatabase = {
  inverters: [
    { id: "inv-12v-500", brand: "Epever", model: "UPower 500W 12V", price: 220000, supplier: "Epever Nigeria", location: "Abuja", rating: 4.7, inStock: true, delivery: "2-4 days", warranty: "3 years", type: "hybrid" },
    { id: "inv-12v-1000", brand: "Growatt", model: "SPF 1000TL 12V", price: 420000, supplier: "Growatt Nigeria", location: "Abuja", rating: 4.6, inStock: true, delivery: "2-4 days", warranty: "3 years", type: "hybrid" },
    { id: "inv-12v-victron", brand: "Victron", model: "MultiPlus 12/500/20", price: 450000, supplier: "Victron Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "3-5 days", warranty: "5 years", type: "standalone" },
    { id: "inv-24v-1000", brand: "Epever", model: "UPower 1000W 24V", price: 340000, supplier: "Epever Nigeria", location: "Abuja", rating: 4.7, inStock: true, delivery: "2-4 days", warranty: "3 years", type: "hybrid" },
    { id: "inv-24v-3000", brand: "Growatt", model: "SPF 3000TL HVM", price: 750000, supplier: "Growatt Nigeria", location: "Abuja", rating: 4.6, inStock: true, delivery: "2-4 days", warranty: "3 years", type: "hybrid" },
    { id: "inv-24v-victron", brand: "Victron", model: "MultiPlus 24/1200/25", price: 680000, supplier: "Victron Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "3-5 days", warranty: "5 years", type: "standalone" },
    { id: "inv-1", brand: "Deye", model: "SUN-3K-SG03LP1", price: 850000, supplier: "Solar Nigeria Ltd", location: "Lagos", rating: 4.8, inStock: true, delivery: "3-5 days", warranty: "5 years", type: "hybrid" },
    { id: "inv-2", brand: "Deye", model: "SUN-5K-SG03LP1", price: 1200000, supplier: "Solar Nigeria Ltd", location: "Lagos", rating: 4.9, inStock: true, delivery: "3-5 days", warranty: "5 years", type: "hybrid" },
    { id: "inv-3", brand: "Growatt", model: "SPF 5000TL HVM", price: 1100000, supplier: "Growatt Nigeria", location: "Abuja", rating: 4.6, inStock: true, delivery: "2-4 days", warranty: "3 years", type: "hybrid" },
    { id: "inv-sma-100", brand: "SMA", model: "Sunny Tripower 60", price: 12000000, supplier: "SMA Nigeria", location: "Lagos", rating: 4.9, inStock: false, delivery: "30-45 days", warranty: "10 years", type: "hybrid" },
    { id: "inv-sma-200", brand: "SMA", model: "Sunny Central 100 HV", price: 35000000, supplier: "SMA Nigeria", location: "Lagos", rating: 4.9, inStock: false, delivery: "45-60 days", warranty: "10 years", type: "hybrid" },
  ],
  mppt: [
    { id: "mppt-12v-30", brand: "Epever", model: "Tracer 3210AN 12V/24V", price: 180000, supplier: "Epever Nigeria", location: "Abuja", rating: 4.7, inStock: true, delivery: "2-4 days", warranty: "3 years", currentA: 30, voltageV: 100 },
    { id: "mppt-1", brand: "Victron", model: "SmartSolar 100/20", price: 350000, supplier: "Victron Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "3-5 days", warranty: "5 years", currentA: 20, voltageV: 100 },
    { id: "mppt-2", brand: "Victron", model: "SmartSolar 150/35", price: 550000, supplier: "Victron Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "3-5 days", warranty: "5 years", currentA: 35, voltageV: 150 },
    { id: "mppt-4", brand: "Epever", model: "Tracer 4210AN", price: 250000, supplier: "Epever Nigeria", location: "Abuja", rating: 4.7, inStock: true, delivery: "2-4 days", warranty: "3 years", currentA: 40, voltageV: 150 },
  ],
  breakers_dc: [
    { id: "brk-dc-6", brand: "Schneider", model: "DC MCB 6A", price: 4500, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "2-3 days", warranty: "5 years", currentA: 6, poles: 2, voltageV: 250 },
    { id: "brk-dc-10", brand: "Schneider", model: "DC MCB 10A", price: 5500, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "2-3 days", warranty: "5 years", currentA: 10, poles: 2, voltageV: 250 },
    { id: "brk-dc-16", brand: "Schneider", model: "DC MCB 16A", price: 6500, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "2-3 days", warranty: "5 years", currentA: 16, poles: 2, voltageV: 250 },
    { id: "brk-dc-20", brand: "Schneider", model: "DC MCB 20A", price: 7000, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "2-3 days", warranty: "5 years", currentA: 20, poles: 2, voltageV: 250 },
    { id: "brk-dc-25", brand: "Schneider", model: "DC MCB 25A", price: 8000, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "2-3 days", warranty: "5 years", currentA: 25, poles: 2, voltageV: 250 },
    { id: "brk-dc-32", brand: "Schneider", model: "DC MCB 32A", price: 10000, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "2-3 days", warranty: "5 years", currentA: 32, poles: 2, voltageV: 250 },
    { id: "brk-dc-40", brand: "Schneider", model: "DC MCB 40A", price: 12000, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "2-3 days", warranty: "5 years", currentA: 40, poles: 2, voltageV: 250 },
    { id: "brk-dc-1", brand: "Schneider", model: "DC MCB 50A", price: 15000, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "2-3 days", warranty: "5 years", currentA: 50, poles: 2, voltageV: 250 },
    { id: "brk-dc-2", brand: "Schneider", model: "DC MCB 63A", price: 18000, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "2-3 days", warranty: "5 years", currentA: 63, poles: 2, voltageV: 250 },
    { id: "brk-dc-3", brand: "Schneider", model: "MCCB 200A DC", price: 85000, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "2-3 days", warranty: "5 years", currentA: 200, poles: 2, voltageV: 250 },
    { id: "brk-dc-ind-630", brand: "Schneider", model: "DC MCCB 630A", price: 650000, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.8, inStock: false, delivery: "14-21 days", warranty: "5 years", currentA: 630, poles: 2, voltageV: 500 },
    { id: "brk-dc-ind-800", brand: "Schneider", model: "DC MCCB 800A", price: 850000, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.9, inStock: false, delivery: "14-21 days", warranty: "5 years", currentA: 800, poles: 2, voltageV: 500 },
  ],
  breakers_ac: [
    { id: "brk-ac-1", brand: "Schneider", model: "AC MCB 6A", price: 2500, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "2-3 days", warranty: "5 years", currentA: 6, poles: 1, voltageV: 230 },
    { id: "brk-ac-2", brand: "Schneider", model: "AC MCB 20A", price: 3500, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "2-3 days", warranty: "5 years", currentA: 20, poles: 1, voltageV: 230 },
    { id: "brk-ac-3", brand: "Schneider", model: "AC MCB 32A", price: 4000, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "2-3 days", warranty: "5 years", currentA: 32, poles: 1, voltageV: 230 },
    { id: "brk-ac-ind-160", brand: "Schneider", model: "EasyPact CVS160N 160A MCCB", price: 180000, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.8, inStock: true, delivery: "7-14 days", warranty: "5 years", currentA: 160, poles: 3, voltageV: 415 },
    { id: "brk-ac-ind-400", brand: "Schneider", model: "EasyPact CVS400N 400A MCCB", price: 380000, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "7-14 days", warranty: "5 years", currentA: 400, poles: 3, voltageV: 415 },
    { id: "brk-ac-ind-630", brand: "Schneider", model: "EasyPact CVS630N 630A MCCB", price: 550000, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.9, inStock: false, delivery: "14-21 days", warranty: "5 years", currentA: 630, poles: 3, voltageV: 415 },
  ],
  batteries: [
    { id: "bat-12v-li", brand: "Renogy", model: "Smart Lithium 12V 100Ah", price: 350000, supplier: "Renogy Nigeria", location: "Lagos", rating: 4.7, inStock: true, delivery: "3-5 days", warranty: "5 years", voltage: 12, capacityKWh: 1.28 },
    { id: "bat-12v-li2", brand: "LiTime", model: "12V 100Ah LiFePO4", price: 320000, supplier: "LiTime Nigeria", location: "Lagos", rating: 4.6, inStock: true, delivery: "3-5 days", warranty: "5 years", voltage: 12, capacityKWh: 1.28 },
    { id: "bat-12v-tub", brand: "Luminous", model: "RC 18000 (12V 150Ah)", price: 280000, supplier: "Luminous Nigeria", location: "Lagos", rating: 4.7, inStock: true, delivery: "3-5 days", warranty: "3 years", voltage: 12, capacityKWh: 1.8 },
    { id: "bat-24v-li", brand: "LiTime", model: "24V 100Ah LiFePO4", price: 720000, supplier: "LiTime Nigeria", location: "Lagos", rating: 4.6, inStock: true, delivery: "3-5 days", warranty: "5 years", voltage: 24, capacityKWh: 2.56 },
    { id: "bat-2", brand: "Pylontech", model: "US3000C", price: 950000, supplier: "Pylontech Nigeria", location: "Abuja", rating: 4.8, inStock: true, delivery: "2-4 days", warranty: "10 years", voltage: 48, capacityKWh: 3.5 },
    { id: "bat-3", brand: "Pylontech", model: "US2000C", price: 650000, supplier: "Pylontech Nigeria", location: "Abuja", rating: 4.6, inStock: true, delivery: "2-4 days", warranty: "10 years", voltage: 48, capacityKWh: 2.4 },
    { id: "bat-byd-hv-138", brand: "BYD", model: "B-Box Pro 13.8 HV", price: 4500000, supplier: "BYD Nigeria", location: "Lagos", rating: 4.8, inStock: false, delivery: "14-21 days", warranty: "10 years", voltage: 384, capacityKWh: 13.8 },
    { id: "bat-byd-hv-20", brand: "BYD", model: "B-Box Pro 20.0 HV", price: 6200000, supplier: "BYD Nigeria", location: "Lagos", rating: 4.9, inStock: false, delivery: "14-21 days", warranty: "10 years", voltage: 384, capacityKWh: 20 },
  ],
  panels: [
    { id: "pan-100", brand: "Renogy", model: "RNG-100D", price: 85000, supplier: "Renogy Nigeria", location: "Lagos", rating: 4.7, inStock: true, delivery: "3-5 days", warranty: "25 years" },
    { id: "pan-150", brand: "Renogy", model: "RNG-150D", price: 125000, supplier: "Renogy Nigeria", location: "Lagos", rating: 4.7, inStock: true, delivery: "3-5 days", warranty: "25 years" },
    { id: "pan-200", brand: "Renogy", model: "RNG-200D", price: 165000, supplier: "Renogy Nigeria", location: "Lagos", rating: 4.7, inStock: true, delivery: "3-5 days", warranty: "25 years" },
    { id: "pan-250", brand: "Jinko", model: "JKM250M-60", price: 145000, supplier: "Solar Nigeria Ltd", location: "Lagos", rating: 4.8, inStock: true, delivery: "3-5 days", warranty: "25 years" },
    { id: "pan-1", brand: "Jinko", model: "JKM500N-72HL4", price: 260000, supplier: "Solar Nigeria Ltd", location: "Lagos", rating: 4.9, inStock: true, delivery: "3-5 days", warranty: "25 years" },
    { id: "pan-2", brand: "Longi", model: "LR5-72HTH-545M", price: 275000, supplier: "Longi Nigeria", location: "Abuja", rating: 4.7, inStock: true, delivery: "2-4 days", warranty: "25 years" },
    { id: "pan-4", brand: "JA Solar", model: "JAM72S30-545MR", price: 268000, supplier: "JA Solar Nigeria", location: "Abuja", rating: 4.5, inStock: true, delivery: "3-5 days", warranty: "25 years" },
  ],
  spd: [
    { id: "spd-1", brand: "Schneider", model: "SPD Type 2 40kA", price: 65000, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "2-3 days", warranty: "5 years", type: "AC" },
    { id: "spd-3", brand: "Eaton", model: "SPD Type 2 40kA", price: 55000, supplier: "Eaton Nigeria", location: "Lagos", rating: 4.6, inStock: true, delivery: "3-5 days", warranty: "3 years", type: "AC" },
    { id: "spd-4", brand: "Schneider", model: "SPD Type 1/2 DC 20kA", price: 85000, supplier: "Schneider Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "2-3 days", warranty: "5 years", type: "DC" },
    { id: "spd-6", brand: "IMO", model: "SPD DC 20kA", price: 60000, supplier: "IMO Nigeria", location: "Lagos", rating: 4.5, inStock: true, delivery: "2-4 days", warranty: "3 years", type: "DC" },
  ],
  cables: [
    // AC cables
    { id: "cab-ac-1.5", brand: "Nexans", model: "AC Cable 1.5mm²", price: 550, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.8, inStock: true, delivery: "2-3 days", warranty: "10 years", unit: "per meter", ampacity: 15, cableType: "ac" },
    { id: "cab-ac-2.5", brand: "Nexans", model: "AC Cable 2.5mm²", price: 750, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.8, inStock: true, delivery: "2-3 days", warranty: "10 years", unit: "per meter", ampacity: 20, cableType: "ac" },
    { id: "cab-ac-4", brand: "Nexans", model: "AC Cable 4mm²", price: 950, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.8, inStock: true, delivery: "2-3 days", warranty: "10 years", unit: "per meter", ampacity: 27, cableType: "ac" },
    { id: "cab-ac-6", brand: "Nexans", model: "AC Cable 6mm²", price: 1250, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.8, inStock: true, delivery: "2-3 days", warranty: "10 years", unit: "per meter", ampacity: 34, cableType: "ac" },
    { id: "cab-ac-10", brand: "Nexans", model: "AC Cable 10mm²", price: 1400, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.8, inStock: true, delivery: "2-3 days", warranty: "10 years", unit: "per meter", ampacity: 46, cableType: "ac" },
    { id: "cab-ac-35", brand: "Nexans", model: "AC Cable 35mm²", price: 4200, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.8, inStock: true, delivery: "3-5 days", warranty: "10 years", unit: "per meter", ampacity: 99, cableType: "ac" },
    { id: "cab-ac-120", brand: "Nexans", model: "AC Cable 120mm²", price: 12000, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "7-14 days", warranty: "10 years", unit: "per meter", ampacity: 210, cableType: "ac" },
    { id: "cab-ind-ac-400", brand: "Nexans", model: "LV Cable 400mm²", price: 95000, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "7-14 days", warranty: "10 years", unit: "per meter", ampacity: 415, cableType: "ac" },
    // Battery cables
    { id: "cab-bat-16", brand: "Nexans", model: "Battery Cable 16mm²", price: 6500, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "2-3 days", warranty: "10 years", unit: "per meter", ampacity: 61, cableType: "battery" },
    { id: "cab-bat-25", brand: "Nexans", model: "Battery Cable 25mm²", price: 9500, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "2-3 days", warranty: "10 years", unit: "per meter", ampacity: 80, cableType: "battery" },
    { id: "cab-bat-50", brand: "Nexans", model: "Battery Cable 50mm²", price: 2500, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "2-3 days", warranty: "10 years", unit: "per meter", ampacity: 119, cableType: "battery" },
    { id: "cab-bat-120", brand: "Nexans", model: "Battery Cable 120mm²", price: 11000, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "7-14 days", warranty: "10 years", unit: "per meter", ampacity: 210, cableType: "battery" },
    { id: "cab-bat-240", brand: "Nexans", model: "Battery Cable 240mm²", price: 22000, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.9, inStock: true, delivery: "7-14 days", warranty: "10 years", unit: "per meter", ampacity: 320, cableType: "battery" },
    { id: "cab-ind-dc-630", brand: "Nexans", model: "DC Cable 630mm²", price: 145000, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.9, inStock: false, delivery: "14-21 days", warranty: "10 years", unit: "per meter", ampacity: 530, cableType: "battery" },
    // PV cables
    { id: "cab-pv-4", brand: "Nexans", model: "PV Cable 4mm²", price: 650, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.8, inStock: true, delivery: "2-3 days", warranty: "10 years", unit: "per meter", ampacity: 27, cableType: "pv" },
    { id: "cab-1", brand: "Nexans", model: "PV Cable 6mm²", price: 850, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.8, inStock: true, delivery: "2-3 days", warranty: "10 years", unit: "per meter", ampacity: 40, cableType: "pv" },
    { id: "cab-2", brand: "Prysmian", model: "PV Cable 10mm²", price: 1200, supplier: "Prysmian Nigeria", location: "Abuja", rating: 4.7, inStock: true, delivery: "2-4 days", warranty: "10 years", unit: "per meter", ampacity: 46, cableType: "pv" },
    { id: "cab-pv-16", brand: "Nexans", model: "PV Cable 16mm²", price: 5200, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.8, inStock: true, delivery: "3-5 days", warranty: "10 years", unit: "per meter", ampacity: 61, cableType: "pv" },
    { id: "cab-pv-50", brand: "Nexans", model: "PV Cable 50mm²", price: 3800, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.8, inStock: true, delivery: "3-5 days", warranty: "10 years", unit: "per meter", ampacity: 119, cableType: "pv" },
    { id: "cab-pv-120", brand: "Nexans", model: "PV Cable 120mm²", price: 11500, supplier: "Nexans Nigeria", location: "Lagos", rating: 4.8, inStock: true, delivery: "7-14 days", warranty: "10 years", unit: "per meter", ampacity: 210, cableType: "pv" },
  ],
};

// ============================================================
// CATEGORY METADATA
// ============================================================

type EquipmentCategory =
  | "inverters"
  | "batteries"
  | "panels"
  | "breakers_dc"
  | "breakers_ac"
  | "spd"
  | "cables";

const categoryIcons = {
  inverters: Zap,
  batteries: Battery,
  panels: Sun,
  breakers_dc: Shield,
  breakers_ac: Plug,
  spd: Shield,
  cables: Cable,
};

const categoryLabels = {
  inverters: "Inverters",
  batteries: "Batteries",
  panels: "Solar Panels",
  breakers_dc: "DC Breakers",
  breakers_ac: "AC Breakers",
  spd: "Surge Protection (SPD)",
  cables: "Cables",
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function findBestMatchingBreaker(
  requiredCurrentA: number,
  marketBreakers: EquipmentItem[],
): EquipmentItem | null {
  if (requiredCurrentA <= 0) return null;

  const sorted = [...marketBreakers]
    .filter((b) => (b.currentA || 0) >= requiredCurrentA)
    .sort((a, b) => (a.currentA || 0) - (b.currentA || 0));

  return sorted.length > 0 ? sorted[0] : null;
}

// ✅ Two-pass: prefer single cable, fall back to parallel only when needed
function findBestMatchingCable(
  requiredAmpacity: number,
  marketCables: EquipmentItem[],
  circuitType: CableCircuitType,
): (EquipmentItem & { cableCount: number }) | null {
  if (requiredAmpacity <= 0) return null;

  const filtered = marketCables.filter((c) => c.cableType === circuitType);
  if (filtered.length === 0) return null;

  const sorted = [...filtered].sort(
    (a, b) => (a.ampacity || 0) - (b.ampacity || 0),
  );

  // PASS 1: single cable preference
  for (const cable of sorted) {
    const amp = cable.ampacity || 0;
    if (amp >= requiredAmpacity) {
      return { ...cable, cableCount: 1 };
    }
  }

  // PASS 2: parallel fallback
  for (const cable of sorted) {
    const amp = cable.ampacity || 0;
    if (amp <= 0) continue;

    const count = Math.ceil(requiredAmpacity / amp);
    if (count <= 6) {
      return { ...cable, cableCount: count };
    }
  }

  return null;
}

function fuzzyMatchComponent<T extends { brand: string; model: string }>(
  designBrand: string | undefined,
  designModel: string | undefined,
  marketItems: T[],
): T | null {
  if (!designBrand || !designModel) return null;

  const normalizedDesignBrand = designBrand.toLowerCase().trim();
  const normalizedDesignModel = designModel.toLowerCase().trim();

  return (
    marketItems.find((item) => {
      const normalizedMarketBrand = item.brand.toLowerCase().trim();
      const normalizedMarketModel = item.model.toLowerCase().trim();

      return (
        (normalizedMarketBrand.includes(normalizedDesignBrand) ||
          normalizedDesignBrand.includes(normalizedMarketBrand)) &&
        (normalizedMarketModel.includes(normalizedDesignModel) ||
          normalizedDesignModel.includes(normalizedMarketModel))
      );
    }) || null
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Step15MarketSearch() {
  const {
    completeStep,
    setCurrentStep,
    design,
    // ✅ NEW: cart total setter
    setCartTotal,
  } = useSolarStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<EquipmentCategory>("inverters");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");

  const categories: EquipmentCategory[] = [
    "inverters",
    "batteries",
    "panels",
    "breakers_dc",
    "breakers_ac",
    "spd",
    "cables",
  ];

  useEffect(() => {
    setCart([]);
  }, [design.selectedInverter?.model, design.selectedBattery?.model]);

  const inverter = design.selectedInverter;
  const isIndustrial = (inverter?.ratedKVA || 0) > 10;
  const acPhase = isIndustrial ? "three" : "single";
  const acVoltage = isIndustrial ? 415 : 230;

  // --- DYNAMIC CALCULATIONS ---

  const acBreakerRecommendation = useMemo(() => {
    if (!inverter) return null;
    const current =
      acPhase === "three"
        ? inverter.ratedWatts / (acVoltage * Math.sqrt(3))
        : inverter.ratedWatts / acVoltage;
    const protectedCurrent = current * 1.25;
    return findBestMatchingBreaker(
      protectedCurrent,
      MARKET_EQUIPMENT.breakers_ac,
    );
  }, [inverter, acPhase, acVoltage]);

  const batteryBreakerRecommendation = useMemo(() => {
    if (!inverter) return null;
    const current = inverter.ratedWatts / (inverter.systemVoltage * 0.85);
    const protectedCurrent = current * 1.25;
    return findBestMatchingBreaker(
      protectedCurrent,
      MARKET_EQUIPMENT.breakers_dc,
    );
  }, [inverter]);

  const pvBreakerRecommendation = useMemo(() => {
    const arr = design.panelArrangement?.selectedArrangement;
    const panel = design.selectedPanel;
    if (!arr || !panel) return null;
    const current = panel.isc * arr.parallelStrings;
    const protectedCurrent = current * 1.25;
    return findBestMatchingBreaker(
      protectedCurrent,
      MARKET_EQUIPMENT.breakers_dc,
    );
  }, [design.panelArrangement, design.selectedPanel]);

  const acCableRecommendation = useMemo(() => {
    if (!inverter || !acBreakerRecommendation) return null;
    const current =
      acPhase === "three"
        ? inverter.ratedWatts / (acVoltage * Math.sqrt(3))
        : inverter.ratedWatts / acVoltage;
    const requiredAmpacity = Math.max(
      current,
      acBreakerRecommendation.currentA || 0,
    );
    return findBestMatchingCable(
      requiredAmpacity,
      MARKET_EQUIPMENT.cables,
      "ac",
    );
  }, [inverter, acBreakerRecommendation, acPhase, acVoltage]);

  const batteryCableRecommendation = useMemo(() => {
    if (!inverter || !batteryBreakerRecommendation) return null;
    const current = inverter.ratedWatts / (inverter.systemVoltage * 0.85);
    const requiredAmpacity = Math.max(
      current,
      batteryBreakerRecommendation.currentA || 0,
    );
    return findBestMatchingCable(
      requiredAmpacity,
      MARKET_EQUIPMENT.cables,
      "battery",
    );
  }, [inverter, batteryBreakerRecommendation]);

  const pvCableRecommendation = useMemo(() => {
    const arr = design.panelArrangement?.selectedArrangement;
    const panel = design.selectedPanel;
    if (!arr || !panel || !pvBreakerRecommendation) return null;
    const current = panel.isc * arr.parallelStrings;
    const requiredAmpacity = Math.max(
      current,
      pvBreakerRecommendation.currentA || 0,
    );
    return findBestMatchingCable(
      requiredAmpacity,
      MARKET_EQUIPMENT.cables,
      "pv",
    );
  }, [design.panelArrangement, design.selectedPanel, pvBreakerRecommendation]);

  // --- END DYNAMIC CALCULATIONS ---

  const equipment: EquipmentItem[] = MARKET_EQUIPMENT[selectedCategory] || [];

  const suppliers: string[] = Array.from(
    new Set(equipment.map((item: EquipmentItem) => item.supplier)),
  );

  const filteredEquipment: EquipmentItem[] = equipment.filter(
    (item: EquipmentItem) => {
      const matchesSearch =
        item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSupplier =
        selectedSupplier === "all" || item.supplier === selectedSupplier;

      return matchesSearch && matchesSupplier;
    },
  );

  const handleAddToCart = (id: string) => {
    if (!cart.some((item) => item.id === id)) {
      setCart([...cart, { id, quantity: 1 }]);
    }
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const getItemById = (id: string): EquipmentItem | null => {
    for (const category of categories) {
      const items: EquipmentItem[] = MARKET_EQUIPMENT[category] || [];
      const item = items.find((e: EquipmentItem) => e.id === id);
      if (item) return item;
    }
    return null;
  };

  const handleAutoPopulateCart = () => {
    const autoItems: CartItem[] = [];

    const addItem = (
      item: EquipmentItem | null,
      options?: { cableCount?: number; quantity?: number },
    ) => {
      if (item && !autoItems.some((i) => i.id === item.id)) {
        autoItems.push({
          id: item.id,
          cableCount: options?.cableCount,
          quantity: options?.quantity ?? 1,
        });
      }
    };

    addItem(
      fuzzyMatchComponent(
        design.selectedInverter?.brand,
        design.selectedInverter?.model,
        MARKET_EQUIPMENT.inverters,
      ),
      { quantity: 1 },
    );

    const batteryQty = design.batterySizing?.totalBatteryCount || 1;
    addItem(
      fuzzyMatchComponent(
        design.selectedBattery?.brand,
        design.selectedBattery?.model,
        MARKET_EQUIPMENT.batteries,
      ),
      { quantity: batteryQty },
    );

    const panelQty =
      design.panelArrangement?.selectedArrangement?.panelCount || 1;
    addItem(
      fuzzyMatchComponent(
        design.selectedPanel?.brand,
        design.selectedPanel?.model,
        MARKET_EQUIPMENT.panels,
      ),
      { quantity: panelQty },
    );

    addItem(MARKET_EQUIPMENT.spd.find((s) => s.id === "spd-1") || null, {
      quantity: 1,
    });
    addItem(MARKET_EQUIPMENT.spd.find((s) => s.id === "spd-4") || null, {
      quantity: 1,
    });

    addItem(acBreakerRecommendation, { quantity: 1 });
    addItem(batteryBreakerRecommendation, { quantity: 1 });
    addItem(pvBreakerRecommendation, { quantity: 1 });

    if (acCableRecommendation) {
      addItem(acCableRecommendation, {
        cableCount: acCableRecommendation.cableCount,
        quantity: 1,
      });
    }
    if (batteryCableRecommendation) {
      addItem(batteryCableRecommendation, {
        cableCount: batteryCableRecommendation.cableCount,
        quantity: 1,
      });
    }
    if (pvCableRecommendation) {
      addItem(pvCableRecommendation, {
        cableCount: pvCableRecommendation.cableCount,
        quantity: 1,
      });
    }

    setCart(autoItems);
    setShowCart(true);
  };

  const handleSupplierChange = (value: string | null) => {
    setSelectedSupplier(value || "all");
  };

  const handleContinue = () => {
    completeStep(15);
    setCurrentStep(16);
  };

  const handleBack = () => {
    setCurrentStep(14);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const computeLineTotal = (cartItem: CartItem): number => {
    const item = getItemById(cartItem.id);
    if (!item) return 0;
    const qty = cartItem.quantity ?? 1;
    const cableCount = cartItem.cableCount ?? 1;
    return item.price * qty * cableCount;
  };

  const totalCartValue = cart.reduce(
    (total, cartItem) => total + computeLineTotal(cartItem),
    0,
  );

  // ✅ NEW: Push cart total to store for Step 16 cost estimate
  useEffect(() => {
    setCartTotal(totalCartValue);
  }, [totalCartValue, setCartTotal]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Step 15: Market Search</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCart(!showCart)}
            className="relative gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Cart
            {cart.length > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-primary text-white">
                {cart.length}
              </Badge>
            )}
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Find available equipment in the Nigerian market. Compare prices,
          suppliers, and availability.
        </p>
      </div>

      {/* System Requirements Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your System Requirements</span>
            <Badge variant="outline">Auto-Matched</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Inverter</p>
              <p className="font-semibold text-sm">
                {design.selectedInverter?.brand || "Not selected"}
              </p>
              <p className="text-xs text-muted-foreground">
                {design.selectedInverter?.model || ""}
              </p>
              {design.selectedInverter && (
                <Badge className="mt-1 bg-green-500">
                  {design.selectedInverter.ratedKVA}kVA
                </Badge>
              )}
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Battery</p>
              <p className="font-semibold text-sm">
                {design.selectedBattery?.brand || "Not selected"}
              </p>
              <p className="text-xs text-muted-foreground">
                {design.selectedBattery?.model || ""}
              </p>
              {design.selectedBattery && (
                <Badge className="mt-1 bg-green-500">
                  {design.selectedBattery.voltage}V
                </Badge>
              )}
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Panels</p>
              <p className="font-semibold text-sm">
                {design.selectedPanel?.brand || "Not selected"}
              </p>
              <p className="text-xs text-muted-foreground">
                {design.selectedPanel?.model || ""}
              </p>
              {design.panelArrangement?.selectedArrangement && (
                <Badge className="mt-1 bg-green-500">
                  {design.panelArrangement.selectedArrangement.panelCount} units
                </Badge>
              )}
            </div>
            <div className="rounded-lg border p-3 text-center border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
              <p className="text-xs text-muted-foreground">SPD</p>
              <p className="font-semibold text-sm text-blue-600">⚠️ Required</p>
              <p className="text-xs text-muted-foreground">
                Type 2 AC + Type 1/2 DC
              </p>
            </div>
          </div>

          {/* Dynamic Breaker & Cable Recommendations */}
          {inverter && (
            <div
              className={`mt-4 rounded-lg border p-4 ${
                isIndustrial
                  ? "border-blue-500/50 bg-blue-500/10"
                  : "border-green-500/50 bg-green-500/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <Plug
                  className={`h-5 w-5 mt-0.5 ${
                    isIndustrial ? "text-blue-500" : "text-green-500"
                  }`}
                />
                <div>
                  <p
                    className={`font-medium ${
                      isIndustrial ? "text-blue-700" : "text-green-700"
                    }`}
                  >
                    {isIndustrial ? "⚡ Industrial" : "🏠 Residential"} Breaker
                    & Cable Recommendations
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    For your{" "}
                    <strong>
                      {inverter.brand} {inverter.model}
                    </strong>{" "}
                    ({inverter.ratedKVA}kVA{isIndustrial ? ", 3-phase" : ""}):
                  </p>

                  <ul
                    className={`mt-2 space-y-1 text-sm list-disc list-inside ${
                      isIndustrial ? "text-blue-600" : "text-green-600"
                    }`}
                  >
                    <li>
                      <strong>AC Breaker:</strong>{" "}
                      {acBreakerRecommendation
                        ? `${acBreakerRecommendation.currentA}A ${acBreakerRecommendation.model}`
                        : "No suitable match found"}
                    </li>
                    <li>
                      <strong>Battery Breaker:</strong>{" "}
                      {batteryBreakerRecommendation
                        ? `${batteryBreakerRecommendation.currentA}A ${batteryBreakerRecommendation.model}`
                        : "No suitable match found"}
                    </li>
                    <li>
                      <strong>PV Breaker:</strong>{" "}
                      {pvBreakerRecommendation
                        ? `${pvBreakerRecommendation.currentA}A ${pvBreakerRecommendation.model}`
                        : "No suitable match found"}
                    </li>
                    <li>
                      <strong>AC Cable:</strong>{" "}
                      {acCableRecommendation
                        ? `${acCableRecommendation.cableCount > 1 ? `${acCableRecommendation.cableCount}× ` : ""}${acCableRecommendation.model}`
                        : "No suitable match found"}
                    </li>
                    <li>
                      <strong>Battery Cable:</strong>{" "}
                      {batteryCableRecommendation
                        ? `${batteryCableRecommendation.cableCount > 1 ? `${batteryCableRecommendation.cableCount}× ` : ""}${batteryCableRecommendation.model}`
                        : "No suitable match found"}
                    </li>
                    <li>
                      <strong>PV Cable:</strong>{" "}
                      {pvCableRecommendation
                        ? `${pvCableRecommendation.cableCount > 1 ? `${pvCableRecommendation.cableCount}× ` : ""}${pvCableRecommendation.model}`
                        : "No suitable match found"}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Auto-populate button */}
          <div className="mt-4">
            <Button
              onClick={handleAutoPopulateCart}
              className="w-full md:w-auto gap-2"
              variant="secondary"
            >
              <Sparkles className="h-4 w-4" />
              Auto-populate Cart from Design
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              Fills cart with the exact components from your design
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cart Panel */}
      {showCart && cart.length > 0 && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>🛒 Equipment Cart</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCart(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cart.map((cartItem) => {
                const item = getItemById(cartItem.id);
                if (!item) return null;
                const cableCount = cartItem.cableCount ?? 1;
                const quantity = cartItem.quantity ?? 1;
                const lineTotal = computeLineTotal(cartItem);

                return (
                  <div
                    key={cartItem.id}
                    className="flex justify-between items-center border-b pb-2"
                  >
                    <div>
                      <p className="font-medium flex items-center gap-2 flex-wrap">
                        {item.brand} {item.model}
                        {quantity > 1 && (
                          <Badge className="bg-green-500">
                            {quantity}× units
                          </Badge>
                        )}
                        {cableCount > 1 && (
                          <Badge className="bg-blue-500">
                            {cableCount}× parallel
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.supplier}
                      </p>
                      {item.currentA && (
                        <p className="text-xs text-muted-foreground">
                          {item.currentA}A / {item.voltageV}V
                        </p>
                      )}
                      {item.unit && (
                        <p className="text-xs text-muted-foreground">
                          {item.unit}
                        </p>
                      )}
                      {quantity > 1 && (
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(item.price)} × {quantity} ={" "}
                          {formatPrice(item.price * quantity)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-primary font-bold">
                        {formatPrice(lineTotal)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromCart(cartItem.id)}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between items-center border-t pt-2 font-bold">
                <span>Total Estimated Cost</span>
                <span className="text-primary text-lg">
                  {formatPrice(totalCartValue)}
                </span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                * Prices are estimates. Contact suppliers for current prices
                and availability.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Equipment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const CatIcon = categoryIcons[category];
                const count = MARKET_EQUIPMENT[category]?.length || 0;
                return (
                  <Button
                    key={category}
                    variant={
                      selectedCategory === category ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="gap-2"
                  >
                    <CatIcon className="h-4 w-4" />
                    {categoryLabels[category]}
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search by brand, model, or supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select
                value={selectedSupplier}
                onValueChange={handleSupplierChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((supplier: string) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Results</span>
            <Badge variant="outline">
              {filteredEquipment.length} items found
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredEquipment.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No equipment found. Try adjusting your search or filters.
              </div>
            ) : (
              filteredEquipment.map((item: EquipmentItem) => {
                const inCart = cart.some((c) => c.id === item.id);
                const isSPD = selectedCategory === "spd";
                const isDCBreaker = selectedCategory === "breakers_dc";
                const isACBreaker = selectedCategory === "breakers_ac";

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col md:flex-row md:items-center justify-between rounded-lg border p-4 transition ${
                      inCart
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">
                          {item.brand} {item.model}
                        </h4>
                        {isSPD && (
                          <Badge className="bg-blue-500">
                            Surge Protection
                          </Badge>
                        )}
                        {isDCBreaker && (
                          <Badge className="bg-orange-500">DC Breaker</Badge>
                        )}
                        {isACBreaker && (
                          <Badge className="bg-cyan-500">AC Breaker</Badge>
                        )}
                        {item.type && (
                          <Badge variant="outline">{item.type}</Badge>
                        )}
                        {item.currentA && (
                          <Badge variant="outline">{item.currentA}A</Badge>
                        )}
                        {inCart && <Badge className="bg-green-500">Added</Badge>}
                        {!item.inStock && (
                          <Badge className="bg-red-500">Out of Stock</Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.location}
                        </span>
                        <span>{item.supplier}</span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {item.rating}
                        </span>
                        {item.inStock && (
                          <span className="flex items-center gap-1 text-green-600">
                            <Check className="h-3 w-3" />
                            In Stock
                          </span>
                        )}
                        {item.delivery && (
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {item.delivery}
                          </span>
                        )}
                        {item.warranty && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.warranty}
                          </span>
                        )}
                        {item.unit && (
                          <span className="text-xs">({item.unit})</span>
                        )}
                        {isSPD && (
                          <span className="text-blue-600 font-medium text-xs">
                            ⚡ Required for Nigeria
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-lg font-bold text-primary">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                    <div className="mt-3 md:mt-0 flex gap-2">
                      <Button
                        variant={inCart ? "destructive" : "default"}
                        size="sm"
                        onClick={() =>
                          inCart
                            ? handleRemoveFromCart(item.id)
                            : handleAddToCart(item.id)
                        }
                        className="gap-1"
                        disabled={!item.inStock}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        {inCart
                          ? "Remove"
                          : item.inStock
                            ? "Add to Cart"
                            : "Out of Stock"}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cart Summary */}
      {cart.length > 0 && !showCart && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <span className="font-medium">{cart.length} items in cart</span>
                <span className="text-sm text-muted-foreground">
                  Total: {formatPrice(totalCartValue)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCart(true)}
              >
                View Cart
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nigeria-Specific Note */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">Nigerian Market Tips</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  • <strong>SPDs are strongly recommended</strong> for
                  Nigerian grid conditions
                </li>
                <li>
                  • <strong>Industrial items</strong> may require import
                  (30-60 day lead time)
                </li>
                <li>
                  • Verify stock availability before purchasing — market
                  changes rapidly
                </li>
                <li>
                  • Compare prices across multiple suppliers for best value
                </li>
                <li>
                  • Consider import duties and shipping costs for
                  international brands
                </li>
                <li>
                  • Check warranty terms — some brands offer extended
                  warranties in Nigeria
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-6">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to System Validation
        </Button>
        <Button onClick={handleContinue}>
          Continue to Final Design
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}