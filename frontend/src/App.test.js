import { render, screen } from '@testing-library/react';
import Component from './component';

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([]),
  });
});

afterEach(() => {
  global.fetch = originalFetch;
});

test('renders the URL shortener and loads saved links', async () => {
  render(<Component />);

  expect(screen.getByRole('heading', { name: /make your links shorter/i }))
    .toBeInTheDocument();
  expect(await screen.findByText(/no links yet/i)).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/all', undefined);
});
