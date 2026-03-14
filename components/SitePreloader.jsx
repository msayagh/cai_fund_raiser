export default function SitePreloader({ title = "Centre Zad Al-Imane", subtitle = "Loading..." }) {
    return (
        <div className="site-preloader" role="status" aria-live="polite" aria-label={subtitle}>
            <div className="site-preloader-orbit" aria-hidden="true"></div>
            <div className="site-preloader-core">
                <img
                    src="/logo-ccai.png"
                    alt=""
                    aria-hidden="true"
                    className="site-preloader-logo"
                />
            </div>
            <div className="site-preloader-text">
                <div className="site-preloader-title">{title}</div>
                <div className="site-preloader-subtitle">{subtitle}</div>
            </div>
        </div>
    );
}
