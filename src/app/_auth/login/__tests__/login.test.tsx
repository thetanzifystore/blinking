// Minimal ambient Jest declarations for editor/typecheck when @types/jest isn't installed
declare const jest: any;
declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => Promise<void> | void): void;
declare function afterEach(fn: () => void): void;
declare function expect(value: any): any;

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

// Mock the hook module; we'll adjust the mock implementation per test
const mockUseRedirect = jest.fn();
jest.mock('src/lib/hooks', () => ({
  useRedirectIfAuthenticated: () => mockUseRedirect(),
}));

// Mock Spinner to expose a test id
jest.mock('src/components/Spinner', () => (props: any) => <div data-testid="spinner" />);

// Import the page after mocks are configured
import LoginPage from '../page';

describe('LoginPage UI with useRedirectIfAuthenticated', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  test('shows spinner when checking is true', () => {
    mockUseRedirect.mockReturnValue(true);

    render(<LoginPage />);

    // spinner should be visible
    expect(screen.getByTestId('spinner')).toBeInTheDocument();

    // form should not be present while checking
    const form = screen.queryByRole('form');
    expect(form).toBeNull();
  });

  test('shows form and fade-in when checking is false', () => {
    mockUseRedirect.mockReturnValue(false);

    render(<LoginPage />);

    // spinner should not be present
    expect(screen.queryByTestId('spinner')).toBeNull();

    // form should be present
    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();

    // wrapper div (parent of form) should include opacity-100 class
    const wrapper = form.parentElement;
    expect(wrapper).toBeTruthy();
    if (wrapper) {
      expect(wrapper.className).toMatch(/opacity-100/);
    }
  });
});
