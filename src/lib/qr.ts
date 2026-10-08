import QRCode from "qrcode";

export async function generateQrPng(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 600,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

export async function generateQrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

export function downloadFile(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates and triggers a print dialog with studio branded flyer for the album QR
 */
export async function printBrandedFlyer(album: {
  title: string;
  token: string;
  customer_name: string;
  event_date: string;
  pin_set?: boolean;
}) {
  const publicUrl = `${window.location.origin}/a/${album.token}`;
  const qrDataUrl = await generateQrPng(publicUrl);

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Addis Photography - Client Album Flyer</title>
        <style>
          @page { size: A5; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #000000;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .header {
            border-bottom: 2px solid #DC2626;
            padding-bottom: 12px;
            width: 100%;
            margin-bottom: 24px;
          }
          .title {
            font-size: 24px;
            font-weight: 800;
            color: #000000;
            letter-spacing: -0.5px;
          }
          .subtitle {
            font-size: 13px;
            color: #64748B;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-top: 4px;
          }
          .album-card {
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 24px;
            width: 100%;
            max-width: 380px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          }
          .qr-image {
            width: 240px;
            height: 240px;
            margin: 12px auto;
            display: block;
          }
          .album-name {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .customer {
            font-size: 14px;
            color: #475569;
          }
          .url {
            font-size: 12px;
            color: #DC2626;
            word-break: break-all;
            margin-top: 12px;
            font-family: monospace;
          }
          .footer {
            margin-top: 30px;
            font-size: 11px;
            color: #94A3B8;
            border-top: 1px dashed #CBD5E1;
            padding-top: 12px;
            width: 100%;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">ADDIS PHOTOGRAPHY</div>
          <div class="subtitle">Studio & Digital Album Delivery</div>
        </div>

        <div class="album-card">
          <div class="album-name">${album.title}</div>
          <div class="customer">Prepared for: <strong>${album.customer_name}</strong></div>
          
          <img src="${qrDataUrl}" class="qr-image" alt="Album Access QR" />
          
          <div style="font-size: 13px; font-weight: 600; color: #D97706;">
            Scan with your mobile camera to view and download photos
          </div>
          <div class="url">${publicUrl}</div>
          ${
            album.pin_set
              ? '<div style="margin-top:8px; font-size:12px; background:#FEF3C7; color:#92400E; padding:4px 8px; border-radius:6px; display:inline-block;">🔒 Protected with private PIN code</div>'
              : ""
          }
        </div>

        <div class="footer">
          Addis Photography Studio • Tsinat Building, Jimma, Ethiopia • Tel: +251 973 679 744
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}
