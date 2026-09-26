import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card stack">
      <h1 className="title">Not found</h1>
      <p className="muted">That page doesn&apos;t exist.</p>
      <Link href="/" className="button button--primary">
        Back to today&apos;s games
      </Link>
    </div>
  );
}
