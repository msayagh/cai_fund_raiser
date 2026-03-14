export function QRCode({ color, alt }) {
    const src = `qr-code.jpeg`;

    return (
        <img
            src={src}
            alt={alt}
            width={240}
            height={240}
            style={{ borderRadius: "8px", border: `2px solid ${color}` }}
        />
    );
}
