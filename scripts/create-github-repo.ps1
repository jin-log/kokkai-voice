param(
  [string]$Org = 'jin-log',
  [string]$Name = 'kokkai-voice'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = 'git'
$psi.Arguments = 'credential fill'
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$proc = [System.Diagnostics.Process]::Start($psi)
$proc.StandardInput.Write("protocol=https`nhost=github.com`n`n")
$proc.StandardInput.Close()
$out = $proc.StandardOutput.ReadToEnd()
$proc.WaitForExit()
if ($proc.ExitCode -ne 0) { throw 'git credential fill failed' }

$user = ($out -split "`n" | Where-Object { $_ -like 'username=*' } | Select-Object -First 1) -replace '^username=', ''
$token = ($out -split "`n" | Where-Object { $_ -like 'password=*' } | Select-Object -First 1) -replace '^password=', ''
if (-not $user -or -not $token) { throw 'GitHub credentials not found' }

$headers = @{
  Authorization = "Bearer $token"
  Accept        = 'application/vnd.github+json'
  'User-Agent'  = 'jin-log-ceo'
}
$me = Invoke-RestMethod -Uri 'https://api.github.com/user' -Headers $headers
$login = $me.login
$body = @{ name = $Name; private = $true } | ConvertTo-Json
$owner = $null
foreach ($uri in @("https://api.github.com/orgs/$Org/repos", 'https://api.github.com/user/repos')) {
  try {
    Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body -ContentType 'application/json' | Out-Null
    $owner = if ($uri -like '*/orgs/*') { $Org } else { $login }
    Write-Output "created: https://github.com/$owner/$Name"
    break
  } catch {
    if ($_.ErrorDetails.Message -match '422|already exists|name already') {
      $owner = if ($uri -like '*/orgs/*') { $Org } else { $login }
      Write-Output "exists: https://github.com/$owner/$Name"
      break
    }
  }
}
if (-not $owner) { throw 'Could not create repository' }

Set-Location $repoRoot
cmd /c "git remote remove origin 2>nul"
git remote add origin "https://github.com/$owner/$Name.git"
git branch -M main
git push -u origin main
Write-Output 'pushed: main'
