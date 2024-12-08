
interface FooterProps {
	siteName: string;
}

export function Footer({siteName}: FooterProps){

	return (
		<>
            <div className="dts-footer">
                <div className="mg-container">
                    <div className="dts-footer__top-bar">
                        <div>{siteName}</div>
                        <nav>
                            <ul>
                                <li>
                                <a href="">How do I use this data?</a>
                                </li>
                                <li>
                                <a href="">Help</a>
                                </li>
                                <li>
                                <a href="">General</a>
                                </li>
                                <li>
                                <a href="">Technical specification</a>
                                </li>
                                <li>
                                <a href="">Partners</a>
                                </li>
                            </ul>
                        </nav>
                    </div>
                    <div className="dts-footer__bottom-bar">
                        <div className="dts-footer__bottom-bar-text">Tracking the costs of disasters is a vital step toward risk-informed development, and investing in disaster risk reduction.</div>
                        <nav>
                            <ul>
                                <li>
                                <a href="">Privacy policy</a>
                                </li>
                                <li>
                                <a href="">Terms and conditions</a>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
		</>
	)
}