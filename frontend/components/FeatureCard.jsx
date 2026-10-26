import './css/feature-card.css'

function FeatureCard({ icon, title, description, backgroundImage, ariaLabel, onClick }) {
    return (
        <section
            className="feature-card"
            style={{
                backgroundImage: `linear-gradient(rgba(3, 7, 18, 0.35), rgba(3, 7, 18, 0.6)), url("${backgroundImage}")`,
            }}
        >
            <span className="feature-card__icon" que-icon={icon} aria-hidden="true"></span>
            <strong className="feature-card__title">{title}</strong>
            <span className="feature-card__description">{description}</span>
            <button
                className="feature-card__button"
                type="button"
                que-icon="arrow_forward_ios"
                aria-label={ariaLabel}
                onClick={onClick}
            ></button>
        </section>
    )
}

export function FeatureCardGroup({ children }) {
    return <div className="feature-card-group">{children}</div>
}

export default FeatureCard
