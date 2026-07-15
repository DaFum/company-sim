import OpenAI from 'openai';

export const getAvailableModels = async () => {
  try {
    const response = await fetch('https://gen.pollinations.ai/models');
    if (!response.ok) throw new Error('Failed to fetch models');
    const models = await response.json();
    return models;
  } catch (error) {
    console.warn('Could not fetch Pollinations models:', error);
    return [
      { name: 'openai', description: 'GPT-4o Mini (Default)' },
      { name: 'mistral', description: 'Mistral Small' },
      { name: 'gemini', description: 'Gemini Flash' },
      { name: 'gemini-search', description: 'Gemini with Search' },
    ];
  }
};

export const callAI = async (
  apiKey,
  systemPrompt,
  gameState,
  suppressErrors = true,
  provider = 'openai',
  model = 'openai'
) => {
  if (!apiKey) throw new Error('Kein API Key vorhanden.');

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 15000); // 15-second timeout

  try {
    let content;

    if (provider === 'pollinations') {
      const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(gameState) },
          ],
          jsonMode: true,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) throw new Error(`Pollinations API Error: ${response.statusText}`);
      const data = await response.json();
      content = data.choices[0].message.content;
    } else {
      const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      const response = await client.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(gameState) },
          ],
          response_format: { type: 'json_object' },
        },
        { signal: abortController.signal }
      );
      content = response.choices[0].message.content;
    }

    if (!content) throw new Error('Leere Antwort von der KI.');

    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let parsed;
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    else parsed = JSON.parse(content);

    // Validation
    if (!parsed.action) throw new Error("Missing 'action' field");

    clearTimeout(timeoutId);
    return parsed;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('AI Service Error:', error);
    if (!suppressErrors) throw error;

    // Fallback Safe Decision
    return {
      action: 'NONE',
      parameters: {},
      reasoning:
        error.name === 'AbortError'
          ? 'AI Connection Timeout. Playing it safe.'
          : 'AI Connection Failed. Playing it safe.',
      risk_assessment: 'LOW',
    };
  }
};
