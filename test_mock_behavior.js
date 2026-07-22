import { vi } from 'vitest';

const MockClass = vi.fn().mockImplementation(function() {
  this.value = 'hello';
});

const instance = new MockClass();

console.log('results:', MockClass.mock.results);
console.log('instances:', MockClass.mock.instances);
