import { WelcomeFrame } from "./_shared/WelcomeFrame";
import "./_group.css";
import "./wooden-welcome.css";

export function WoodenWelcome() {
  return (
    <WelcomeFrame
      renderDecoration={(name) => (
        <section className="wooden-welcome-sign" aria-label={`Welcome ${name}. What can i do for you`}>
          <span className="wooden-welcome-cord wooden-welcome-cord-left" aria-hidden="true" />
          <span className="wooden-welcome-cord wooden-welcome-cord-right" aria-hidden="true" />
          <span className="wooden-welcome-nail wooden-welcome-nail-left" aria-hidden="true" />
          <span className="wooden-welcome-nail wooden-welcome-nail-right" aria-hidden="true" />
          <div className="wooden-welcome-plank">
            <p className="wooden-welcome-greeting">
              <span>Welcome</span>
              <span className="wooden-welcome-name">{name}</span>
            </p>
            <span className="wooden-welcome-inlay" aria-hidden="true" />
            <p className="wooden-welcome-helper">What can i do for you</p>
          </div>
        </section>
      )}
    />
  );
}
