const COLORS = ["var(--primary)", "#f54e00", "var(--good)", "var(--blue)", "var(--violet)", "var(--rose)"];

/** A one-shot burst of falling confetti. Positions are deterministic so render stays pure. */
export function Confetti({ pieces = 60 }: { pieces?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: pieces }, (_, i) => {
        const r = (n: number) => ((i * 9301 + n * 49297) % 233280) / 233280;
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${r(1) * 100}vw`,
              background: COLORS[i % COLORS.length],
              animationDelay: `${r(2) * 0.6}s`,
              animationDuration: `${2 + r(3) * 1.5}s`,
              transform: `rotate(${r(4) * 360}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}
