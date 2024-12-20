
interface FooterProps {
	siteName: string;
    urlPrivacyPolicy: string;
    urlTermsConditions: string;
}

export function Footer({siteName, urlPrivacyPolicy, urlTermsConditions}: FooterProps){

	return (
		<>
            <div className="dts-footer">
                <div className="mg-container">
                    <div className="dts-footer__top-bar">
                        <div>{siteName}</div>
                        <nav>
                            <ul>
                                <li><a href="">General</a></li>
                                <li><a href="">Technical specification</a></li>
                                <li><a href="">Partners</a></li>
                                <li><a href="">Methodologies</a></li>
                                <li><a href="">Support</a></li>

                            </ul>
                        </nav>
                    </div>
                    <div className="dts-footer__bottom-bar">
                        <div className="dts-footer__bottom-bar-text">Tracking the costs of disasters is a vital step toward risk-informed development, and investing in disaster risk reduction.</div>
                        <nav>
                            <ul>
                                {urlPrivacyPolicy.length > 0 && (
                                    <li><a href={urlPrivacyPolicy} target="_blank">Privacy policy</a></li>
                                )}
                                {urlTermsConditions.length > 0 && (
                                    <li><a href={urlTermsConditions} target="_blank">Terms and conditions</a></li>
                                )}
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
		</>
	)
}