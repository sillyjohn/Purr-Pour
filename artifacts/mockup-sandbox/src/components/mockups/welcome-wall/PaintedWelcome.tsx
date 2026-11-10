import { WelcomeFrame } from "./_shared/WelcomeFrame";
import "./_group.css";
import "./PaintedWelcome.css";

export function PaintedWelcome() {
  return (
    <WelcomeFrame
      renderDecoration={(name) => (
        <section className="painted-welcome" aria-label={`Wall greeting: Welcome ${name}. What can i do for you`}>
          <span className="painted-welcome__mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <p className="painted-welcome__hello">
            <span className="painted-welcome__welcome">Welcome</span>
            <span className="painted-welcome__name">{name}</span>
          </p>
          <p className="painted-welcome__offer">What can i do for you</p>
          <span className="painted-welcome__underline" aria-hidden="true" />
        </section>
      )}
    />
  );
}
