# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm start        # Start production server
```

## Architecture Overview

**Tech Stack:**
- **Framework:** Next.js 14 with App Router
- **Styling:** Tailwind CSS with custom CSS variables for theming
- **UI Components:** shadcn/ui (built on Radix UI)
- **Backend:** Supabase (PostgreSQL + Auth)
- **Charts:** Recharts
- **Icons:** Lucide React

**Design System:**
- CSS variables in `globals.css` define colors, fonts, spacing (`--bg`, `--accent`, `--ink`, etc.)
- Dark mode via `.dark` class on `<html>` element
- Responsive breakpoints: `md` (768px) is the main breakpoint for desktop vs. mobile
- Custom font families: Playfair Display (display text), Source Serif 4 (body text)

**Directory Structure:**
- `app/` - Next.js App Router pages
  - `layout.tsx` - Root layout with responsive navigation
  - `page.tsx` - Dashboard
  - `words/`, `learn/`, `quiz/`, `stats/`, `settings/` - Feature pages
- `components/ui/` - Shadcn/ui components (Button, Dialog, Sheet, Tabs, etc.)
- `lib/` - Utilities (supabase client, type definitions, helpers)
- `public/` - Static assets

**Mobile vs Desktop Navigation:**
- **Desktop (md+):** Fixed sidebar on left (220px), content offset by `md:ml-[220px]`
- **Mobile (-md):** Fixed top header (56px), mobile menu in Sheet drawer, content offset by `pt-14`
- Control visibility with Tailwind classes: `hidden md:flex` (desktop only), `md:hidden` (mobile only)

**Key Pages:**
- Dashboard (`/`) - Stats overview, quick actions, activity chart
- Learn (`/learn`) - Review interface for due words
- Words (`/words`) - Add/manage vocabulary (modal-based UI)
- Quiz (`/quiz`) - 6 quiz types with scoring
- Stats (`/stats`) - Progress charts and analytics
- Settings (`/settings`) - User preferences, theme toggle

**Supabase Integration:**
- Client initialized in `lib/supabase.ts`
- Tables: `user_profile`, `words`, `reviews`, `review_logs`
- Review system uses spaced repetition (ease_factor, next_review date)
- Types exported from supabase module for use in components

## Development Notes

- All pages use `'use client'` (client-side rendering preferred for interactivity)
- Theme toggle stored in localStorage (`theme: 'dark'` | `'light'`)
- Styling uses mix of Tailwind classes and inline styles (CSS variables)
- Mobile top bar is hidden on desktop with `md:hidden` class (viewport meta tag required)
- Responsive grids use `grid-cols-repeat(auto-fit, minmax(160px, 1fr))`
