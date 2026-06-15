import React from "react";
import { QRCodeSVG } from "qrcode.react";

/**
 * AssetQRCode - Reusable compliance QR code component.
 *
 * Props:
 *   deviceName    {string} - Computer/asset name
 *   farReg        {string} - FAR Registration number
 *   serialNumber  {string} - Serial number
 *   owner         {string} - Owner display name or ID
 *   organization  {string} - Organization friendly name (from sidebar)
 *   size          {number} - SVG size in px (default: 100)
 */
export default function AssetQRCode({
  deviceName,
  farReg,
  serialNumber,
  owner,
  organization,
  size = 100,
}) {
  const hasRequiredFields = Boolean(
    String(deviceName || "").trim() &&
    String(farReg || "").trim() &&
    String(serialNumber || "").trim() &&
    String(owner || "").trim() &&
    String(organization || "").trim()
  );

  if (!hasRequiredFields) {
    return null;
  }

  const qrData = [
    `Device: ${deviceName}`,
    `FAR Registration #: ${farReg}`,
    `Serial Number: ${serialNumber}`,
    `Owner: ${owner}`,
    `Organization: ${organization}`,
  ].join("\n");

  return (
    <QRCodeSVG
      value={qrData}
      size={size}
      level="M"
      style={{ display: "block", margin: "0 auto" }}
    />
  );
}
