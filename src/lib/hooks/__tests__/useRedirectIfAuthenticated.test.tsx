// Provide minimal ambient declarations for Jest globals so the TS checker
// in the editor doesn't error when @types/jest isn't installed yet.
declare const jest: any;
declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => Promise<void> | void): void;
declare function afterEach(fn: () => void): void;
declare function expect(value: any): any;

import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

// Mocks will be defined below; create placeholders so the jest.mock factories can close over them
const mockReplace = jest.fn();
const mockGetAuth = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('firebase/auth', () => ({
  getAuth: () => mockGetAuth(),
}));

// Import the hook after mocks are set up
import useRedirectIfAuthenticated from '../useRedirectIfAuthenticated';

function TestComponent() {
  const checking = useRedirectIfAuthenticated();
  return <div>{checking ? 'checking' : 'done'}</div>;
}

describe('useRedirectIfAuthenticated', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  test('redirects when a user is present and toggles checking', async () => {
    // Simulate logged-in user
    mockGetAuth.mockReturnValue({ currentUser: { uid: 'user-1' } });

    render(<TestComponent />);

    // Router.replace should be called with /discover
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/discover'));

    // Eventually the checking state should resolve to false and show 'done'
    await waitFor(() => expect(screen.getByText('done')).toBeInTheDocument());
  });

  test('does not redirect when no user and toggles checking', async () => {
    // Simulate logged-out
    mockGetAuth.mockReturnValue({ currentUser: null });

    render(<TestComponent />);

    // Router.replace should not be called
    await waitFor(() => expect(mockReplace).not.toHaveBeenCalled());

    // checking should eventually become false and show 'done'
    await waitFor(() => expect(screen.getByText('done')).toBeInTheDocument());
  });
});
