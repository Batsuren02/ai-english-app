# Phase 4: Advanced Features - Project Plan

**Status:** Planning
**Target:** Implement advanced learning capabilities
**Estimated Timeline:** Week 7-8 (8-10 days)

---

## Phase 4 Features Overview

### 1. Reading Mode
**Purpose:** Paste any English text → highlight unknown words → quickly add to vocabulary

**Implementation:**
- New page `/reading`
- Text paste area (textarea)
- Word highlighting based on your vocabulary database
- Click to add unknown words to deck
- Progress indicator (X% of words known)

**Key Components:**
- `components/TextHighlighter.tsx` - Highlight known/unknown words
- `app/reading/page.tsx` - Main reading page
- Tokenization logic (split text into words)
- Database query to find unknown words

**Estimated Work:** 3 days

---

### 2. Pronunciation Analysis
**Purpose:** Record voice, get AI feedback on pronunciation

**Implementation:**
- New page `/pronunciation`
- Web Speech API recording
- Audio playback (user vs. reference)
- Visual waveform comparison
- Claude AI feedback (optional)

**Key Components:**
- `components/AudioRecorder.tsx` - Recording UI
- `lib/speech-utils.ts` - Web Speech API wrapper
- Waveform visualization
- Download recordings

**Estimated Work:** 3 days

---

### 3. Weak Word Drills
**Purpose:** Dedicated practice mode for hardest words (lowest ease_factor)

**Implementation:**
- New page `/drills`
- Filter reviews by ease_factor
- Intensive quiz mode (10+ questions)
- Focused feedback
- Difficulty progression

**Key Components:**
- `lib/drill-generator.ts` - Drill quiz logic
- `app/drills/page.tsx` - Drills page
- Difficulty-based selection

**Estimated Work:** 2 days

---

### 4. Enhanced Interleaving
**Purpose:** Smartly mix old & new words in every session

**Implementation:**
- Update quiz-generator.ts
- Configuration: old/new word ratio
- Category interleaving
- Spaced mixing algorithm

**Key Components:**
- Update `lib/quiz-generator.ts`
- `lib/interleaving.ts` - Mix logic
- Settings UI for interleaving preferences

**Estimated Work:** 2 days

---

### 5. Notifications
**Purpose:** Browser push reminders for due reviews

**Implementation:**
- Web Notifications API
- Background sync (PWA)
- Notification scheduler
- User consent handling

**Key Components:**
- `lib/notifications.ts` - Notification helpers
- `components/NotificationSettings.tsx` - Settings
- Service worker message handling
- Cron-like scheduled checks

**Estimated Work:** 3 days

---

### 6. Final Polish
**Purpose:** Bug fixes, performance optimization, accessibility

**Implementation:**
- A11y audit (WCAG 2.1 AA)
- Performance profiling
- Bundle size optimization
- Bug fixes & edge cases
- User feedback integration

**Estimated Work:** 2 days

---

## Build Order Recommendation

```
1. Reading Mode (Day 1-3)
   ↓ (foundation for text analysis)
2. Weak Word Drills (Day 3-5)
   ↓ (uses existing quiz system)
3. Enhanced Interleaving (Day 5-6)
   ↓ (improves learning quality)
4. Pronunciation (Day 6-8)
   ↓ (multimedia feature)
5. Notifications (Day 8-9)
   ↓ (user engagement)
6. Final Polish (Day 9-10)
   ↓ (quality & performance)
```

---

## Feature Dependencies

```
Reading Mode
├── Text tokenization
├── Word database lookup
└── Batch word add

Weak Word Drills
├── SRS algorithm
├── Quiz engine
└── Ease factor filtering

Enhanced Interleaving
├── Word category mapping
├── Spaced mixing
└── Quiz generator

Pronunciation
├── Web Speech API
├── Audio processing
└── Feedback logic

Notifications
├── Service worker
├── Notification API
└── Scheduler logic

Final Polish
├── Performance analysis
├── A11y testing
└── Bug fixes
```

---

## User Stories

### Reading Mode
- "As a learner, I want to paste an article and see which words I don't know yet"
- "I want to quickly add unknown words to my deck while reading"
- "Show me my reading comprehension % for the text"

### Pronunciation
- "I want to record myself saying a word and compare with correct pronunciation"
- "Show me where my pronunciation differs from native speakers"
- "Let me export my practice recordings"

### Weak Word Drills
- "I want intensive practice on my hardest words"
- "Show me only words below 60% accuracy"
- "Track my improvement on weak words separately"

### Interleaving
- "Mix new and old words in better ratios"
- "Don't separate words by category - mix them"
- "Adjust interleaving difficulty based on my level"

### Notifications
- "Remind me daily when I have words to review"
- "Send me notifications at my preferred study time"
- "Don't spam me - just one notification per day"

### Final Polish
- "App should be fast and responsive"
- "Works on all devices seamlessly"
- "All buttons are keyboard accessible"

---

## Technical Considerations

### Reading Mode
- Word tokenization: Use regex or library like `natural.js`
- Case-insensitive matching
- Punctuation handling
- Performance: optimize for large texts (1000+ words)

### Pronunciation
- Web Speech API browser support (Chrome best)
- Fallback for unsupported browsers
- Audio storage considerations
- Privacy: Don't store recordings without consent

### Weak Word Drills
- Filter reviews: `WHERE ease_factor < 2.8 AND last_reviewed < 7 days ago`
- Boost difficulty of weak words in regular quizzes
- Track drill-specific stats

### Enhanced Interleaving
- Configurable ratio (e.g., 70% old / 30% new)
- Category interleaving: don't group by category
- Randomization with seed for reproducibility

### Notifications
- Check service worker support
- Handle permission denied gracefully
- Schedule using setTimeout (simple) or workbox (advanced)
- Quiet hours support (don't notify late night)

### Final Polish
- Lighthouse audit
- WebPageTest for performance
- axe DevTools for a11y
- Mobile testing on iOS & Android
- Edge case testing (offline, slow network, etc.)

---

## Success Criteria

- [ ] All 6 Phase 4 features implemented
- [ ] 80%+ test coverage
- [ ] Lighthouse score >90 (Performance, Accessibility, Best Practices)
- [ ] No console errors or warnings
- [ ] Mobile-responsive on all devices
- [ ] Accessible (WCAG 2.1 AA)
- [ ] Offline functionality works
- [ ] No breaking changes from Phase 1-3

---

## Stretch Goals (Post-Phase 4)

- [ ] Anki export format
- [ ] Multi-language support
- [ ] Community word lists
- [ ] Leaderboards (friendly competition)
- [ ] Claude API integration for AI feedback
- [ ] React Native mobile app
- [ ] Voice-to-text adding words
- [ ] Spaced image mnemonics

---

## Next Steps

1. **Review this plan** with user
2. **Choose feature priority** (or build all in order)
3. **Set up tickets/issues** if using GitHub
4. **Begin Phase 4 implementation**
5. **Deploy incrementally** to production

---

**Ready to build Phase 4? Which feature should we start with?** 🚀
