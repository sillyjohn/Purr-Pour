import "./painted-welcome.css";

export function PaintedWelcome({ name }: { name: string }) {
  return (
    <section className="painted-welcome" aria-label={`Wall greeting: Welcome ${name}`} data-testid="welcome-greeting">
      <span className="painted-welcome__mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <p className="painted-welcome__hello">
        <span className="painted-welcome__welcome">Welcome</span>
        <span className="painted-welcome__name" data-testid="welcome-name">{name}</span>
      </p>
      <span className="painted-welcome__underline" aria-hidden="true" />
    </section>
  );
}
