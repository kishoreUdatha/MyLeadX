/**
 * Landing Page Types
 */

import { LucideIcon } from 'lucide-react';

export interface Stat {
  value: string;
  label: string;
  color: string;
}

export interface Differentiator {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  gradient: string;
  iconBg: string;
  checkColor: string;
}

export interface Industry {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  iconBg: string;
  hoverBg: string;
}

export interface Feature {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor: string;
  hoverBg: string;
}

export interface PricingTier {
  id: string;
  name: string;
  price: string;
  period?: string;
  description: string;
  isPopular?: boolean;
  link: string;
}

export interface Step {
  number: number;
  title: string;
  description: string;
}

export interface FooterSection {
  title: string;
  links: { label: string; href: string; isExternal?: boolean }[];
}
