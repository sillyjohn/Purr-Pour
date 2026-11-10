import { WelcomeFrame } from "./_shared/WelcomeFrame";
import "./_group.css";
import "./framed-welcome.css";

export function FramedWelcome() {
  return (
    <WelcomeFrame
      renderDecoration={(name) => (
        <div className="framed-welcome" aria-label={`Welcome ${name}. What can i do for you`}>
          <div className="framed-welcome__frame">
            <div className="framed-welcome__mat">
              <div className="framed-welcome__paper">
                <p className="framed-welcome__welcome">Welcome</p>
                <p className="framed-welcome__name">{name}</p>
                <span className="framed-welcome__rule" aria-hidden="true" />
                <p className="framed-welcome__prompt">What can i do for you</p>
              </div>
            </div>
          </div>
        </div>
      )}
    />
  );
}

export default FramedWelcome;
