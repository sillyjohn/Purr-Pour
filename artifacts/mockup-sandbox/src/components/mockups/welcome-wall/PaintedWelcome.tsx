import { WelcomeFrame } from "./_shared/WelcomeFrame";
import "./_group.css";
import "./PaintedWelcome.css";

export function PaintedWelcome() {
  return (
    <WelcomeFrame
      greetingSpeech="What can meow do for you today?"
      renderDecoration={(name) => (
        <section className="painted-welcome" aria-label={`Wall greeting: Welcome ${name}`}>
          <span className="painted-welcome__mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <p className="painted-welcome__hello">
            <span className="painted-welcome__welcome">Welcome</span>
            <span className="painted-welcome__name">{name}</span>
          </p>
          <span className="painted-welcome__underline" aria-hidden="true" />
        </section>
      )}
    />
  );
}
