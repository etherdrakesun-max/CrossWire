/**
 * QR Code Utility helper.
 * Generates a high-quality QR code image URL from data using a secure,
 * reliable public API endpoint.
 */
export function generateQRCodeUrl(data: string, size: number = 200): string {
  if (!data) return ''
  const encodedData = encodeURIComponent(data)
  // Use qrserver api which is reliable, fast, and does not require third party local packages
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}&color=0f172a&bgcolor=ffffff&qzone=2`
}
