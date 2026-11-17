# Privacy and Data Handling

## Local processing

The BoundaryLab Browser Edition is designed to process images locally in the browser. According to the current project README, images processed by this package are not uploaded to a BoundaryLab server.

## Local gallery storage

Saved gallery entries are stored in IndexedDB in the current browser/device.

- Gallery entries are not a cloud account.
- They are not automatically available on another device.
- They may be lost if browser site data is cleared, the browser profile is removed, or the device is reset.
- Export important results to your own device.

## Camera access

If the user chooses camera capture, the browser may ask for permission to access a camera. Camera access works reliably on `localhost` or HTTPS in modern browsers. Users can manage permissions through browser settings.

## Services not included

The current Browser Edition README states that this package does not include Google OAuth or other sign-in, user accounts, cloud project management, cloud image storage, payment processing, analytics integration, or an AI chat service.

## Suggested user-facing privacy statement

> Your images are processed locally in your browser by BoundaryLab Studio. This Browser Edition does not upload your working images to a BoundaryLab cloud service. Gallery items are stored in your browser on this device. Export important work to your device because browser storage is not a permanent backup.

Publish this wording only after confirming that the deployed code has not added third-party uploads, telemetry, analytics, or remote processing beyond the behavior described here.

## Privacy maintenance checklist

Before each release:
- Review image-loading and processing code for network requests.
- Review third-party scripts and analytics additions.
- Confirm where gallery data is stored.
- Confirm whether any feature sends image data off-device.
- Update this document if data handling changes.
- Keep privacy wording aligned with deployed behavior.
