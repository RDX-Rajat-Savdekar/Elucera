import React from "react";
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Battery, Bell, Binary, Bot, Box, Brain, Bug, Calendar, Camera, Check,
  CircleDollarSign, Clock, Cloud, Code, Cog, Cpu, CreditCard, Database, Dna, Eye, File, FileText, Filter, Fingerprint,
  Flame, Folder, Gauge, GitBranch, Globe, Hash, HardDrive, Heart, Image, Key, Laptop, Layers, Leaf, Lightbulb, Link,
  List, Lock, Mail, Map, MapPin, MessageCircle, Mic, Monitor, Moon, Network, Package, Atom, Phone, Play, Radio, RefreshCw,
  Rocket, Router, Ruler, Satellite, Scale, Search, Send, Server, Settings, Shield, ShieldCheck, ShoppingCart, Smartphone,
  Sparkles, Star, Sun, Table, Target, Terminal, Thermometer, Timer, Trash2, TrendingDown, TrendingUp, Trophy, Truck,
  Unlock, Upload, User, Users, Wallet, Wifi, Wind, Wrench, X, Zap, Droplet, Download, Microscope, FlaskConical, Magnet,
  Waves, Mountain, Orbit, Car, Plane,
} from "lucide-react";
import { theme } from "../../theme";
import { useSpringAt } from "../anim";

/** Curated Lucide icons (ISC licence). Keep the set small: every icon here is bundled into every render. */
const ICONS = {
  Activity, AlertTriangle, ArrowRight, Atom, BarChart3, Battery, Bell, Binary, Bot, Box, Brain, Bug, Calendar, Camera,
  Car, Check, CircleDollarSign, Clock, Cloud, Code, Cog, Cpu, CreditCard, Database, Dna, Download, Droplet, Eye, File,
  FileText, Filter, Fingerprint, Flame, FlaskConical, Folder, Gauge, GitBranch, Globe, Hash, HardDrive, Heart, Image,
  Key, Laptop, Layers, Leaf, Lightbulb, Link, List, Lock, Magnet, Mail, Map, MapPin, MessageCircle, Mic, Microscope,
  Monitor, Moon, Mountain, Network, Orbit, Package, Phone, Plane, Play, Radio, RefreshCw, Rocket, Router, Ruler,
  Satellite, Scale, Search, Send, Server, Settings, Shield, ShieldCheck, ShoppingCart, Smartphone, Sparkles, Star, Sun,
  Table, Target, Terminal, Thermometer, Timer, Trash2, TrendingDown, TrendingUp, Trophy, Truck, Unlock, Upload, User,
  Users, Wallet, Waves, Wifi, Wind, Wrench, X, Zap,
} as const;
export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

/**
 * A line icon with an optional label UNDER it (never overlapping). Springs in at `at`.
 * Place it inside a Slot or a flex row; it is not absolutely positioned.
 */
export const Icon: React.FC<{ name: IconName; at?: number; size?: number; color?: string; label?: string; labelColor?: string; ring?: boolean }> = ({
  name,
  at = 0,
  size = 150,
  color = theme.accent,
  label,
  labelColor = theme.fg,
  ring = true,
}) => {
  const s = useSpringAt(at);
  const C = ICONS[name] ?? ICONS.Box;
  const pad = ring ? size * 0.28 : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: s, transform: `scale(${0.6 + 0.4 * s})` }}>
      <div
        style={{
          width: size + pad * 2,
          height: size + pad * 2,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: ring ? `${color}1F` : "transparent",
          border: ring ? `5px solid ${color}` : "none",
        }}
      >
        <C size={size} color={color} strokeWidth={2.2} />
      </div>
      {label && (
        <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: Math.max(36, size * 0.3), color: labelColor, textAlign: "center", maxWidth: 420 }}>{label}</div>
      )}
    </div>
  );
};

/** A row of icons that appear one after another (`at`, then +`stagger` frames each). */
export const IconRow: React.FC<{ items: { name: IconName; label?: string; color?: string }[]; at?: number; stagger?: number; size?: number; gap?: number }> = ({
  items,
  at = 0,
  stagger = 8,
  size = 110,
  gap = 50,
}) => (
  <div style={{ display: "flex", gap, alignItems: "flex-start", justifyContent: "center", flexWrap: "wrap", maxWidth: 960 }}>
    {items.map((it, i) => (
      <Icon key={i} name={it.name} label={it.label} color={it.color} at={at + i * stagger} size={size} />
    ))}
  </div>
);
