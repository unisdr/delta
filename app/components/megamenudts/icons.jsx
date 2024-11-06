export function Icons({ src: IconComponent, alt }) {
	return IconComponent ? <IconComponent aria-label={alt} /> : null;
}

