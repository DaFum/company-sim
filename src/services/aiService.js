import OpenAI from 'openai';

/**
 * Ruft die OpenAI API auf, um eine Entscheidung basierend auf dem Spielstatus zu treffen.
 * @param {string} apiKey - Der API-Schlüssel des Nutzers.
 * @param {string} systemPrompt - Der System-Prompt mit Anweisungen und Kontext.
 * @param {object} gameState - Der aktuelle Spielstatus (wird als JSON im User-Prompt gesendet).
 * @param {boolean} [suppressErrors=true] - Wenn true, wird bei Fehler ein Fallback zurückgegeben. Wenn false, wird der Fehler geworfen.
 * @param {string} [provider='openai'] - Der AI Provider ('openai' oder 'pollinations').
 * @returns {Promise<object>} - Die Antwort der KI als JSON-Objekt.
 */
export const callAI = async (apiKey, systemPrompt, gameState, suppressErrors = true, provider = 'openai') => {
  if (!apiKey) {
    throw new Error("Kein API Key vorhanden.");
  }

  try {
    let content;

    if (provider === 'pollinations') {
      const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai', // Pollinations erwartet 'openai' als Model-String für Text-Gen
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: JSON.stringify(gameState) }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        throw new Error(`Pollinations API Error: ${response.statusText}`);
      }

      const data = await response.json();
      content = data.choices[0].message.content;

    } else {
      // Standard OpenAI Client
      const client = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });

      const response = await client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(gameState) }
        ],
        response_format: { type: "json_object" }
      });

      content = response.choices[0].message.content;
    }

    if (!content) {
        throw new Error("Leere Antwort von der KI.");
    }

    // Versuche JSON zu parsen. Manchmal kommt Text drumherum.
    // Einfacher Fix: Suche nach dem ersten { und letzten }
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);

  } catch (error) {
    console.error("AI Service Error:", error);

    if (!suppressErrors) {
      throw error;
    }

    // Fallback-Logik bei Fehler
    return {
      decision_title: "Verbindungsfehler",
      action_type: "NONE",
      amount: 0,
      reasoning: "Die KI konnte nicht erreicht werden. Der Tag endet ohne besondere Ereignisse."
    };
  }
};
