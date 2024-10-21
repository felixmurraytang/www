export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1>Welcome! My name is Felix Murray Tang</h1>

        <ol className="list-inside list-decimal text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <li className="mb-2">
            I am a multifaceted individual  
          </li>
          <li>Sharing ideas to the world</li>
        </ol>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://blog.felixmurraytang.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Blog
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://felixmurraytang.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Me
        </a>
      </footer>
    </div>
  );
}
