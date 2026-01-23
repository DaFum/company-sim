# Memory

## Zustand and Phaser Integration
- **Issue**: Standard `useGameStore.subscribe` in Zustand does not support state slicing/selectors by default.
- **Symptom**: Phaser components subscribing to specific parts of the state (e.g., `state => state.workers`) were not receiving updates or were receiving the entire state object, leading to subscription errors or lack of reactivity.
- **Solution**: You must use the `subscribeWithSelector` middleware when creating the store.
  ```javascript
  import { create } from 'zustand';
  import { subscribeWithSelector } from 'zustand/middleware';

  export const useGameStore = create(subscribeWithSelector((set, get) => ({ ... })));
  ```
- **Usage**: Then you can use `useGameStore.subscribe(selector, callback)`.

## AI Service
- **Pollinations.ai**: Used as a BYOP (Bring Your Own Platform) alternative to OpenAI.
- **Authentication**: Pollinations does not use a standard Header for keys in the way OpenAI does for its proxy, but for the "text-generation" endpoint `gen.pollinations.ai`, we are using it as an OpenAI-compatible endpoint.
- **Key Passing**: We enabled a URL-hash based mechanism (`#api_key=...`) to allow users to pass keys securely without a backend.
