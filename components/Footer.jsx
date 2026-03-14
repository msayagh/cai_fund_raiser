export default function Footer({ t }) {
    return (
        <footer className="footer">
            <div>
                <div className="footer-top-row">
                    <div className="footer-content">
                        <img
                            src="/logo-ccai.png"
                            alt=""
                            aria-hidden="true"
                            className="footer-logo"
                        />
                        <div className="footer-text">
                            <div className="footer-title">{t.aboutCampaign}</div>
                            <p className="footer-description">{t.aboutCampaignText}</p>
                        </div>
                    </div>

                    <div className="footer-participate">
                        <div className="footer-participate-title">{t.howToParticipate}</div>
                        <p className="footer-participate-text">{t.howToParticipateText}</p>
                    </div>
                </div>

                <div className="footer-contact">
                    <div className="footer-contact-item">
                        <i className="fa-solid fa-location-dot footer-contact-icon" aria-hidden="true"></i>
                        287 12e Avenue, Saint-Jean-sur-Richelieu, QC J2X 1E4
                    </div>
                    <div className="footer-contact-item">
                        <i className="fa-solid fa-phone footer-contact-icon" aria-hidden="true"></i>
                        <a href="tel:+14508004266" className="footer-contact-link">(450) 800-4266</a>
                    </div>
                    <div className="footer-contact-item">
                        <i className="fa-solid fa-globe footer-contact-icon" aria-hidden="true"></i>
                        <a href="https://ccai-stjean.org/" target="_blank" rel="noopener noreferrer" className="footer-contact-link">
                            https://ccai-stjean.org/
                        </a>
                    </div>
                    <div className="footer-contact-item">
                        <i className="fa-brands fa-facebook footer-contact-icon" aria-hidden="true"></i>
                        <a href="https://www.facebook.com/centre.alimane.sjsr/" target="_blank" rel="noopener noreferrer" className="footer-contact-link">
                            facebook.com/centre.alimane.sjsr
                        </a>
                    </div>

                    <div className="footer-developers">
                        <div className="footer-developers-avatars">
                            <div className="developer-avatar" title="Asim Khan">QK</div>
                            <div className="developer-avatar" title="Developer 2">MD</div>
                            <div className="developer-avatar" title="Developer 3">MH</div>
                            <div className="developer-avatar" title="Developer 4">BL</div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
