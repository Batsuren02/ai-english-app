# Phase 3: Analytics & Polish - Complete Plan

**Status:** In Progress
**Target:** Complete all Phase 3 features
**Priority Order:** 1. CSV Import → 2. PWA & Offline → 3. Daily Challenges → 4. Mobile Polish

---

## 1. CSV/Excel Import Feature

### Purpose
Allow bulk upload of word lists (Excel/CSV format) instead of just JSON paste. Supports adding multiple lessons at once (e.g., all phrasal verbs from a lesson PDF).

### Implementation

#### 1.1 New Route: `/import` Page
- **File:** `app/import/page.tsx`
- **Features:**
  - File upload input (accept `.csv`, `.xlsx`)
  - Preview table of parsed words (first 5 rows)
  - Validation: check required columns (word, definition, mongolian)
  - Bulk add button with progress indicator
  - Success confirmation with count

#### 1.2 CSV/XLSX Parser
- **File:** `lib/csv-parser.ts`
- **Functions:**
  - `parseCSV(file)` - Parse CSV to word objects
  - `parseXLSX(file)` - Parse Excel to word objects
  - `validateWordRow(row)` - Check required fields
  - `mapRowToWord(row)` - Convert CSV columns to Word type
- **Dependencies:** `papaparse` (CSV), `xlsx` (Excel)
- **CSV Format Expected:**
  ```
  word,definition,mongolian,part_of_speech,ipa,cefr_level,examples,word_family,collocations,confused_with,etymology_hint,category,goal_tag
  ```

#### 1.3 UI Components
- **Component:** `components/ImportForm.tsx`
  - Drag-and-drop zone
  - File input button
  - Progress bar during upload
  - Error messages for validation failures
  - Summary stats after import (X words added, Y skipped)

#### 1.4 Database
- **Constraint:** Check for duplicates (word already exists)
- **Option:** Skip or ask user for conflict resolution

### Files to Create
- `app/import/page.tsx` (200 lines)
- `lib/csv-parser.ts` (150 lines)
- `components/ImportForm.tsx` (200 lines)

### Timeline
- **Day 1-2:** CSV/XLSX parser + validation
- **Day 2-3:** UI component + file upload
- **Day 3:** Integration + testing

---

## 2. PWA & Offline Support

### Purpose
Convert app to Progressive Web App: installable on home screen, offline access for reviews, service worker caching.

### Implementation

#### 2.1 Service Worker
- **File:** `public/sw.js`
- **Features:**
  - Cache static assets (JS, CSS, fonts)
  - Cache API responses (words, reviews)
  - Network-first strategy for API calls (fall back to cache)
  - Background sync for offline reviews (save locally, sync when online)
  - Update strategy: check for new version on load

#### 2.2 Web App Manifest
- **File:** `public/manifest.json`
- **Updates:**
  - `name`: "AI English Learner"
  - `short_name`: "English Learn"
  - `description`: "Spaced repetition vocabulary app"
  - `start_url`: "/"
  - `theme_color`: "#0f3460"
  - `background_color`: "#ffffff"
  - `display`: "standalone"
  - `icons`: 192px, 512px (create new icons)

#### 2.3 Install Prompt
- **Component:** `components/PWAInstallPrompt.tsx`
  - Detects `beforeinstallprompt` event
  - Shows banner: "Install app on home screen"
  - Button to trigger native install dialog
  - Dismiss option
  - Only show once per session

#### 2.4 Offline Storage
- **Library:** IndexedDB via `idb` package
- **Store:** Cache recent words/reviews for offline review
- **Sync on reconnect:** Auto-submit any offline reviews to Supabase

#### 2.5 Next.js Configuration
- **File:** `next.config.js`
- **Add:** `withPWA()` wrapper (from `next-pwa` package)
- **Enable:** service worker registration
- **Metadata:** viewport, theme-color tags in layout

### Dependencies to Add
```bash
npm install next-pwa idb
```

### Files to Create/Update
- `public/sw.js` (250 lines)
- `public/manifest.json` (30 lines)
- `components/PWAInstallPrompt.tsx` (100 lines)
- `lib/offline-storage.ts` (200 lines - IndexedDB helpers)
- `next.config.js` (add PWA config)
- `app/layout.tsx` (register service worker, show install prompt)

### Timeline
- **Day 1:** Service worker + manifest
- **Day 2:** PWA install prompt component
- **Day 3-4:** Offline storage (IndexedDB) + sync logic
- **Day 5:** Testing on mobile

---

## 3. Daily Challenges Feature

### Purpose
Gamification: Random daily challenge to maintain habit, special rewards, streak bonus.

### Implementation

#### 3.1 Database Table
- **New Table:** `daily_challenges`
- **Columns:**
  ```sql
  id uuid PRIMARY KEY
  user_id uuid (FK)
  date date (unique per user+date)
  challenge_type text ('flashcard_sprint' | 'perfect_streak' | 'category_blitz')
  target_count int (number of words/reviews needed)
  completed boolean
  completion_date timestamp
  reward_xp int (bonus XP if completed)
  created_at timestamp
  ```

#### 3.2 Challenge Types
1. **Flashcard Sprint** - Review X words in Y minutes
2. **Perfect Streak** - Get 5 in a row correct on any quiz type
3. **Category Blitz** - Review all due words in a specific category
4. **New Words** - Learn 5 new words today

#### 3.3 Backend Logic
- **File:** `lib/challenge-generator.ts`
- **Function:** `generateDailyChallenge(userId, userStats)`
  - Random challenge type (weighted by user preferences)
  - Adjust target based on user's historical performance
  - Set reward XP (10-20 base)
- **Function:** `checkChallengeCompletion(userId, quizResult)`
  - Track progress toward daily goal
  - Mark complete when target reached
  - Award bonus XP

#### 3.4 UI Components
- **Component:** `components/DailyChallengeCard.tsx`
  - Shows today's challenge (icon, description, target)
  - Progress bar (X of Y completed)
  - Reward preview ("+15 XP if completed")
  - Action button to start challenge
  - Show previous days' completions (mini calendar)

- **Update:** `app/page.tsx` (Dashboard)
  - Add DailyChallengeCard at top
  - Show streak bonus message if challenge complete
  - Flash animation on completion

#### 3.5 Streak System Enhancement
- **Update:** `lib/srs.ts`
  - Add `daily_streak` tracking in user_profile
  - Increment on challenge completion
  - Reset if missed a day
  - Bonus XP multiplier (2x XP on challenge complete days)

### Files to Create/Update
- `lib/challenge-generator.ts` (150 lines)
- `components/DailyChallengeCard.tsx` (200 lines)
- `app/page.tsx` (add challenge card to dashboard)
- Database: Create `daily_challenges` table

### Timeline
- **Day 1:** Challenge generator + table schema
- **Day 2:** Challenge completion logic
- **Day 3:** UI component + dashboard integration
- **Day 4:** Testing + streak animations

---

## 4. Mobile Polish & Animations

### Purpose
Smooth, delightful UX: transitions, hover effects, optimized touch targets, better loading states.

### Implementation

#### 4.1 Animations
- **Library:** `framer-motion` (if not already installed)
- **Add animations to:**
  - Page transitions (fade-in on new pages)
  - Quiz card flip animation
  - Correct/incorrect answer feedback (green/red pulse)
  - XP pop-ups floating up
  - Streak flame icon bounce on new streak
  - Word modal slide-in from right (desktop) or bottom (mobile)

#### 4.2 Loading States
- **Update:** All pages to show skeleton screens while data loads
- **Components:**
  - `components/SkeletonCard.tsx` - Word card placeholder
  - `components/SkeletonChart.tsx` - Stats chart placeholder
  - `components/SkeletonList.tsx` - Word list placeholder
- **Pattern:** Show 3-5 skeleton loaders while fetching

#### 4.3 Touch Optimization
- **Audit all buttons/clickables:**
  - Min 44px height (WCAG standard)
  - Min 44px width
  - Adequate padding around targets
  - No hover-only buttons (add label on mobile)
- **Update:** `components/ui/Button.tsx` size classes
- **Responsive:** Increase padding on mobile breakpoints

#### 4.4 Mobile-Specific
- **Update:** `app/layout.tsx` navigation
  - Smooth sheet drawer open/close
  - Bottom sheet for modals on mobile
  - Fixed footer action buttons
- **Quiz page optimizations:**
  - Larger touch targets for answer selection
  - Full-width answer buttons
  - Reduced motion for accessibility
- **Stats page:**
  - Swipeable charts on mobile (left/right navigation)
  - Simplified calendar view on small screens

#### 4.5 Performance Optimization
- **Add:** `next/image` for all image assets
- **Add:** Lazy loading for charts (recharts has built-in support)
- **Add:** `next/dynamic` for heavy components (PDF import, charts)
- **Check:** Bundle size with `next/bundle-analyzer`

#### 4.6 Dark Mode Enhancements
- **Add:** Smooth color transitions
- **Update:** CSS variables with transition values
- **Test:** Color contrast in both themes (use WebAIM checker)

### Files to Create/Update
- `components/SkeletonCard.tsx` (100 lines)
- `components/SkeletonChart.tsx` (80 lines)
- `components/SkeletonList.tsx` (80 lines)
- `app/layout.tsx` (add animations, skeleton imports)
- `app/quiz/page.tsx` (quiz animations, feedback effects)
- `app/page.tsx` (XP pop-up animations)
- `components/ui/Button.tsx` (size/responsive updates)
- `globals.css` (add animation keyframes, smooth transitions)
- `next.config.js` (add bundle analyzer)

### Timeline
- **Day 1:** Setup animations library, add page transitions
- **Day 2:** Quiz feedback animations + XP pop-ups
- **Day 3:** Loading skeletons + accessibility audit
- **Day 4:** Mobile touch optimization + responsive tweaks
- **Day 5:** Dark mode smooth transitions + testing
- **Day 6:** Performance optimization + bundle size check

---

## Overall Timeline

| Phase | Task | Days | Status |
|-------|------|------|--------|
| **3.1** | CSV/Excel Import | 3 | 📋 Not Started |
| **3.2** | PWA & Offline | 5 | 📋 Not Started |
| **3.3** | Daily Challenges | 4 | 📋 Not Started |
| **3.4** | Mobile Polish | 6 | 📋 Not Started |
| **Total** | Phase 3 Complete | **18 days** | 📋 Ready to Start |

---

## Build Order Rationale

1. **CSV Import FIRST** - Foundational for adding your phrasal verb lessons + other datasets
2. **PWA SECOND** - Offline support + installability (high user value)
3. **Daily Challenges THIRD** - Gamification maintains engagement
4. **Mobile Polish LAST** - Improves UX across all features (should be done last so animations/polish apply to everything)

---

## Success Criteria

- ✅ All Phase 3 tasks completed without breaking Phase 1-2 features
- ✅ CSV import handles 100+ words per file
- ✅ PWA installs and works offline
- ✅ Daily challenges generate correctly and track completion
- ✅ All animations run at 60fps
- ✅ Touch targets ≥44px on mobile
- ✅ Bundle size <500KB (JS)
- ✅ No console errors or warnings

---

## Dependencies to Add

```bash
npm install \
  papaparse \
  xlsx \
  next-pwa \
  idb \
  framer-motion
```

---

## Next Steps

1. Approve this plan
2. Start with CSV Import (Day 1-3)
3. Follow with PWA setup
4. Daily Challenges gamification
5. Final mobile polish + testing

Ready to begin? 🚀
