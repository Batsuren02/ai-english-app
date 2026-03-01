export const PROMPTS = {
  addWord: (word: string) => `Give me a complete word card for "${word}" in JSON format with these exact fields:
{
  "word": "${word}",
  "definition": "clear English definition",
  "mongolian": "Mongolian translation",
  "part_of_speech": "noun/verb/adjective/etc",
  "ipa": "/phonetic transcription/",
  "examples": ["sentence 1", "sentence 2", "sentence 3"],
  "word_family": ["related forms like: affect → affection, affective"],
  "collocations": ["common pairings like: make a decision"],
  "confused_with": ["similar words that are confused"],
  "etymology_hint": "memory aid or origin hint",
  "cefr_level": "B1",
  "category": "academic"
}
Return only valid JSON, no extra text.`,

  evaluateSentence: (sentence: string, level: string = 'B1') => `Evaluate this English sentence written by a Mongolian learner (${level} level):

"${sentence}"

Please provide:
1. Score /10
2. Grammar errors explained
3. Vocabulary improvements
4. Mongolian L1 interference patterns if any
5. Improved version of the sentence`,

  analyzeErrors: (logs: string) => `Here are my recent word review logs from my English learning app. Please analyze:

${logs}

Find patterns:
- Which word categories am I weakest in?
- Any spelling error patterns?
- Mongolian L1 interference?
- Which quiz types do I struggle with?
- Personalized study plan for my weak areas`,

  weeklyReview: (stats: string) => `Here are my weekly English learning stats:

${stats}

Please give me:
1. Progress report - what improved
2. What needs more work
3. Adjusted study plan for next week
4. Encouragement based on my efforts`,

  conversationPractice: (topic: string, level: string = 'B1') => `Let's practice English conversation. 

Topic: ${topic}
My level: ${level} (Mongolian native speaker)

Please:
- Respond naturally to keep the conversation going
- Correct my grammar and vocabulary mistakes gently
- Explain corrections briefly
- Ask follow-up questions to keep me talking`,

  batchWords: (words: string[]) => `Give me complete word cards for these ${words.length} English words as a JSON array. Each object should have: word, definition, mongolian, part_of_speech, ipa, examples (3 sentences), word_family, collocations, confused_with, etymology_hint, cefr_level, category.

Words: ${words.join(', ')}

Return only a valid JSON array, no extra text.`,
}
