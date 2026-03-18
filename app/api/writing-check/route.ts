import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { word, partOfSpeech, definition, userSentence } = await request.json()

  if (!word || !userSentence) {
    return NextResponse.json({ error: 'Missing word or sentence' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const systemPrompt = `You are a friendly English language teacher. Your student is learning English and has just written a sentence using a target vocabulary word. Evaluate whether they used it correctly and naturally. Be encouraging but honest. Always reply with valid JSON only — no markdown, no explanation outside the JSON.`

  const userPrompt = `Target word: "${word}"${partOfSpeech ? ` (${partOfSpeech})` : ''}${definition ? `\nDefinition: ${definition}` : ''}
Student's sentence: "${userSentence}"

Evaluate the sentence and reply with this exact JSON structure:
{
  "correct": true or false,
  "score": a number from 1 to 5 (1=very wrong, 3=acceptable, 5=excellent),
  "improved": "a better version of their sentence (keep it close to what they wrote)",
  "explanation": "one sentence explaining what was good or what to fix"
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({ error: `API error: ${text}` }, { status: 500 })
    }

    const data = await response.json()
    const content = data.content?.[0]?.text ?? ''

    // Extract JSON from the response (strip any accidental markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 })
    }

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
