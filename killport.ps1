param([int]$Port = 8000)

Get-NetTCPConnection -LocalPort $Port `
  | Select-Object -Expand OwningProcess -Unique `
  | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

Write-Host "Killed anything bound to port $Port"