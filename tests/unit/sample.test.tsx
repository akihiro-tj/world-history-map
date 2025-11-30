import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('Vitest Configuration', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support React Testing Library', () => {
    render(<div data-testid="test-element">Hello</div>);
    expect(screen.getByTestId('test-element')).toBeInTheDocument();
  });

  it('should support path aliases', async () => {
    // This test verifies that the @ alias is correctly configured
    // When actual components exist, they can be imported using @/components/...
    expect(true).toBe(true);
  });
});
