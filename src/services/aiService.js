import OpenAI from 'openai';

/**
 * Ruft die OpenAI API auf, um eine Entscheidung basierend auf dem Spielstatus zu treffen.
 * @param {string} apiKey - Der API-Schlüssel des Nutzers.
 * @param {string} systemPrompt - Der System-Prompt mit Anweisungen und Kontext.
 * @param {object} gameState - Der aktuelle Spielstatus (wird als JSON im User-Prompt gesendet).
 * @param {boolean} [suppressErrors=true] - Wenn true, wird bei Fehler ein Fallback zurückgegeben. Wenn false, wird der Fehler geworfen.
 * @returns {Promise<object>} - Die Antwort der KI als JSON-Objekt.
 */
export const callAI = async (apiKey, systemPrompt, gameState, suppressErrors = true) => {
  if (!apiKey) {
    throw new Error("Kein API Key vorhanden.");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Client-side execution allowed
  });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo", // Oder gpt-4, kostengünstiger Start mit 3.5
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(gameState) }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
        throw new Error("Leere Antwort von der KI.");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("AI Service Error:", error);

    if (!suppressErrors) {
      throw error;
    }

    // Fallback-Logik bei Fehler (damit das Spiel nicht stirbt)
    return {
      decision_title: "Verbindungsfehler",
      action_type: "NONE",
      amount: 0,
      reasoning: "Die KI konnte nicht erreicht werden. Der Tag endet ohne besondere Ereignisse."
    };
  }
};
