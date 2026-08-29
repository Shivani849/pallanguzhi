import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmounts rendered components from jsdom after each test so components
// don't leak between test files/cases.
afterEach(() => {
  cleanup();
});
