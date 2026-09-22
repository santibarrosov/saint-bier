import QRCode from "qrcode"

/** Genera un QR como data URL PNG, listo para <img src> o para incrustar en un PDF. */
export async function generateQrDataUrl(text: string, sizePx = 320): Promise<string> {
  return QRCode.toDataURL(text, {
    width: sizePx,
    margin: 1,
    color: { dark: "#15110d", light: "#ffffff" },
  })
}
