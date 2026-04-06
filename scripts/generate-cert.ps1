# NextHire Desktop - Self-Signed Certificate Generator
# Run: powershell -ExecutionPolicy Bypass -File scripts/generate-cert.ps1

$cert = New-SelfSignedCertificate `
  -Subject "CN=NextHire Desktop, O=NextHire, C=US" `
  -Type CodeSigningCert `
  -CertStoreLocation Cert:\CurrentUser\My `
  -NotAfter (Get-Date).AddYears(5)

$password = ConvertTo-SecureString -String "nexthire123" -Force -AsPlainText

Export-PfxCertificate `
  -Cert "Cert:\CurrentUser\My\$($cert.Thumbprint)" `
  -FilePath "build\cert.pfx" `
  -Password $password

Write-Host "✅ Certificate generated: build\cert.pfx" -ForegroundColor Green
Write-Host "   Thumbprint: $($cert.Thumbprint)" -ForegroundColor Cyan
