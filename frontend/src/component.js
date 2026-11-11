import { useCallback, useEffect, useState } from 'react';
import './component.css';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000')
  .replace(/\/+$/, '');

async function request(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json();

  if (!response.ok) {
    const detail = typeof data.detail === 'string'
      ? data.detail
      : 'The request could not be completed.';
    throw new Error(detail);
  }

  return data;
}

function Component() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [urls, setUrls] = useState([]);
  const [shortenedUrl, setShortenedUrl] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCode, setDeletingCode] = useState('');

  const loadUrls = useCallback(async () => {
    setError('');
    try {
      const savedUrls = await request('/all');
      setUrls(savedUrls);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load your saved links.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUrls();
  }, [loadUrls]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setShortenedUrl(null);
    setIsSubmitting(true);

    try {
      const result = await request('/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_url: originalUrl.trim() }),
      });
      setShortenedUrl(result);
      setOriginalUrl('');
      await loadUrls();
    } catch (requestError) {
      setError(requestError.message || 'Unable to shorten this link.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(shortCode) {
    setError('');
    setDeletingCode(shortCode);

    try {
      await request(`/delete/${encodeURIComponent(shortCode)}`, {
        method: 'DELETE',
      });
      setUrls((currentUrls) => currentUrls.filter((url) => url.short_code !== shortCode));
      if (shortenedUrl?.short_code === shortCode) {
        setShortenedUrl(null);
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to delete this link.');
    } finally {
      setDeletingCode('');
    }
  }

  async function copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      setError('Could not copy the link. You can select and copy it manually.');
    }
  }

  return (
    <main className="shortener-page">
      <section className="shortener-card" aria-labelledby="page-title">
        <div className="brand-mark" aria-hidden="true">↗</div>
        <p className="eyebrow">A simpler way to share</p>
        <h1 id="page-title">Make your links shorter.</h1>
        <p className="intro">Turn a long URL into a short link you can share anywhere.</p>

        <form className="shorten-form" onSubmit={handleSubmit}>
          <label htmlFor="original-url">Your destination URL</label>
          <div className="input-row">
            <input
              id="original-url"
              type="url"
              placeholder="https://example.com/your/long/link"
              value={originalUrl}
              onChange={(event) => setOriginalUrl(event.target.value)}
              required
            />
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Shortening…' : 'Shorten link'}
            </button>
          </div>
        </form>

        {error && <p className="notice error-notice" role="alert">{error}</p>}

        {shortenedUrl && (
          <div className="result-panel" aria-live="polite">
            <div>
              <span className="result-label">Your short link</span>
              <a href={shortenedUrl.short_url}>{shortenedUrl.short_url}</a>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => copyUrl(shortenedUrl.short_url)}
            >
              Copy
            </button>
          </div>
        )}

        <section className="links-section" aria-labelledby="links-title">
          <div className="section-heading">
            <h2 id="links-title">Your links</h2>
            <button className="refresh-button" type="button" onClick={loadUrls}>
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p className="empty-state">Loading your links…</p>
          ) : urls.length === 0 ? (
            <p className="empty-state">No links yet. Shorten your first URL above.</p>
          ) : (
            <ul className="links-list">
              {urls.map((url) => (
                <li className="link-item" key={url.short_code}>
                  <div className="link-details">
                    <a href={url.short_url} className="short-link">{url.short_url}</a>
                    <span className="original-link" title={url.original_url}>
                      {url.original_url}
                    </span>
                  </div>
                  <div className="link-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => copyUrl(url.short_url)}
                      aria-label={`Copy ${url.short_url}`}
                    >
                      Copy
                    </button>
                    <button
                      className="delete-button"
                      type="button"
                      onClick={() => handleDelete(url.short_code)}
                      disabled={deletingCode === url.short_code}
                      aria-label={`Delete ${url.short_url}`}
                    >
                      {deletingCode === url.short_code ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
      <footer className="page-footer">Fast, simple, and ready to share.</footer>
    </main>
  );
}

export default Component;
