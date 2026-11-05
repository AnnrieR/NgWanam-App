# Google Sign-In UI assets

The existing `GoogleAuthForm` still posts to `startGoogle` via `useActionState`.
No OAuth routes, provider settings, callbacks, sessions or consent/password linking
checks are changed. Linking retains its descriptive password-verification submit
button; the branded sign-in button uses Google's approved "Continue with Google"
text. Pending state disables submission; the Google logo is never animated.

Brand guidance checked at https://developers.google.com/identity/branding-guidelines.
The button uses the documented light/dark fills, borders and foreground colors,
a square multicolor mark on a white backing, and Google Sans Medium typography.
Ng Wanam's existing primary red button, typography and auth shell remain intact.

- `public/google-g.png`: unmodified official asset downloaded from
  https://developers.google.com/static/identity/images/g-logo.png.
  SHA-256: `d1ce9c2af0b10a7333abc99bc706f9a6a199e5b65bf3e3009624f076b8638e6a`.
  Displayed square at 20×20 with no recoloring, filtering or distortion.
- `public/google-sans-medium.ttf`: official Google Fonts medium-weight subset
  for "Continue with Google Connecting…", fetched using
  https://fonts.googleapis.com/css2?family=Google+Sans:wght@500&display=swap&text=Continue%20with%20Google%20Connecting%E2%80%A6.
  The scoped font is served locally, without a browser request to Google Fonts.
- `public/google-sans-OFL.txt`: font license from
  https://github.com/google/fonts/blob/main/ofl/googlesans/OFL.txt.

Local UI/SSR tests are not actual-phone or live OAuth verification. Re-test both
themes, responsive widths, keyboard focus, provider errors and actual sign-in
after deploying the web update. No Supabase configuration changes are required.
