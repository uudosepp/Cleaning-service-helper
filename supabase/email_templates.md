# Emaili mallid — kopeeri Supabase dashboardi

Mine: **Authentication > Email Templates**

Hele teema, mõlemad keeled (eesti üleval, inglise all hallimas).

---

## Reset Password

Subject: `Parooli lähtestamine / Password Reset`

Body:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="420" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border:1px solid #e4e4e7; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:32px 32px 8px; text-align:center;">
              <div style="width:48px; height:48px; background-color:#f0f0ff; border-radius:50%; display:inline-block; line-height:48px; font-size:20px;">🔑</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 20px; text-align:center;">
              <h1 style="margin:0 0 8px; font-size:20px; font-weight:600; color:#18181b;">Parooli lähtestamine</h1>
              <p style="margin:0; font-size:14px; color:#71717a; line-height:1.6;">
                Saime parooli lähtestamise soovi. Klõpsa nupule uue parooli seadmiseks.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px; text-align:center;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block; padding:12px 32px; background-color:#18181b; color:#ffffff; font-size:14px; font-weight:500; text-decoration:none; border-radius:6px;">
                Muuda parool
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#a1a1aa; line-height:1.5;">
                Kui sa ei soovinud parooli muuta, ignoreeri seda emaili.<br>Link kehtib 24 tundi.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px; border-top:1px solid #f4f4f5; text-align:center;">
              <p style="margin:0 0 4px; font-size:11px; color:#a1a1aa; line-height:1.5;">
                We received a password reset request. Click the button above to set a new password.<br>If you didn't request this, ignore this email.
              </p>
              <p style="margin:8px 0 0; font-size:11px; color:#d4d4d8;">
                Cleaning Service Helper
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Confirm Signup

Subject: `Konto kinnitus / Account Confirmation`

Body:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="420" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border:1px solid #e4e4e7; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:32px 32px 8px; text-align:center;">
              <div style="width:48px; height:48px; background-color:#f0fdf4; border-radius:50%; display:inline-block; line-height:48px; font-size:20px;">✨</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 20px; text-align:center;">
              <h1 style="margin:0 0 8px; font-size:20px; font-weight:600; color:#18181b;">Tere tulemast!</h1>
              <p style="margin:0; font-size:14px; color:#71717a; line-height:1.6;">
                Kinnita oma konto klõpsates allolevale nupule.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px; text-align:center;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block; padding:12px 32px; background-color:#18181b; color:#ffffff; font-size:14px; font-weight:500; text-decoration:none; border-radius:6px;">
                Kinnita konto
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#a1a1aa; line-height:1.5;">
                Kui sa ei loonud kontot, ignoreeri seda emaili.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px; border-top:1px solid #f4f4f5; text-align:center;">
              <p style="margin:0 0 4px; font-size:11px; color:#a1a1aa; line-height:1.5;">
                Welcome! Click the button above to confirm your account.<br>If you didn't create an account, ignore this email.
              </p>
              <p style="margin:8px 0 0; font-size:11px; color:#d4d4d8;">
                Cleaning Service Helper
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Magic Link

Subject: `Sisselogimine / Sign In`

Body:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="420" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border:1px solid #e4e4e7; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:32px 32px 8px; text-align:center;">
              <div style="width:48px; height:48px; background-color:#eff6ff; border-radius:50%; display:inline-block; line-height:48px; font-size:20px;">🔗</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 20px; text-align:center;">
              <h1 style="margin:0 0 8px; font-size:20px; font-weight:600; color:#18181b;">Sisselogimine</h1>
              <p style="margin:0; font-size:14px; color:#71717a; line-height:1.6;">
                Klõpsa nupule sisselogimiseks.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px; text-align:center;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block; padding:12px 32px; background-color:#18181b; color:#ffffff; font-size:14px; font-weight:500; text-decoration:none; border-radius:6px;">
                Logi sisse
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px; border-top:1px solid #f4f4f5; text-align:center;">
              <p style="margin:0 0 4px; font-size:11px; color:#a1a1aa; line-height:1.5;">
                Click the button above to sign in. If you didn't request this, ignore this email.
              </p>
              <p style="margin:8px 0 0; font-size:11px; color:#d4d4d8;">
                Cleaning Service Helper
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Change Email Address

Subject: `Emaili muutmine / Email Change`

Body:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="420" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border:1px solid #e4e4e7; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:32px 32px 8px; text-align:center;">
              <div style="width:48px; height:48px; background-color:#eff6ff; border-radius:50%; display:inline-block; line-height:48px; font-size:20px;">📧</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 20px; text-align:center;">
              <h1 style="margin:0 0 8px; font-size:20px; font-weight:600; color:#18181b;">Emaili muutmine</h1>
              <p style="margin:0; font-size:14px; color:#71717a; line-height:1.6;">
                Kinnita oma uus emailiaadress klõpsates allolevale nupule.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px; text-align:center;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block; padding:12px 32px; background-color:#18181b; color:#ffffff; font-size:14px; font-weight:500; text-decoration:none; border-radius:6px;">
                Kinnita uus email
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#a1a1aa; line-height:1.5;">
                Kui sa ei soovinud emaili muuta, ignoreeri seda kirja.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px; border-top:1px solid #f4f4f5; text-align:center;">
              <p style="margin:0 0 4px; font-size:11px; color:#a1a1aa; line-height:1.5;">
                Confirm your new email address by clicking the button above.<br>If you didn't request this change, ignore this email.
              </p>
              <p style="margin:8px 0 0; font-size:11px; color:#d4d4d8;">
                Cleaning Service Helper
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```
