# Publish ReMix -> GitHub -> GitHub Pages
#
# Prereqs (run once on the host):
#   1. Revoke the previously-leaked token (the one pasted into chat logs)
#      at https://github.com/settings/tokens .
#   2. Create a fine-grained PAT at https://github.com/settings/tokens?type=beta
#      - Resource owner: leoliu-bot
#      - Repository access: leoliu-bot/sound-remix
#      - Permissions: Contents = Read & Write
#      - Expiration: 30 days
#   3. Set the new token in this shell ONLY (do not write it to disk):
#        $env:GH_TOKEN = 'ghp_新token'
#      PowerShell will not save it after the window closes.
#
# After push:
#   - GitHub repo Settings -> Pages will show "GitHub Actions" as source.
#   - First run requires clicking "Approve" in the workflow's "github-pages" env.
#   - The live URL is https://leoliu-bot.github.io/sound-remix/ .
#
# Re-running this script is safe: it is idempotent for `add origin` /
# `git push` and tolerates the repo already existing on GitHub.

[CmdletBinding()]
param(
    [string]$RepoName   = 'sound-remix',
    [string]$Owner      = 'leoliu-bot',
    [string]$Branch     = 'main',
    [string]$Visibility = 'public',
    [string]$CommitMsg  = 'feat: ship ReMix rhythm survival game with Pages deploy'
)

$ErrorActionPreference = 'Stop'

if (-not $env:GH_TOKEN) {
    throw "GH_TOKEN environment variable is empty. Set it first: `$env:GH_TOKEN = 'ghp_...'"
}

# Soft warning when the user pastes a known-compromised PAT. We compare
# against the SHA-256 of the historical leaked token so the source never
# embeds the raw secret.
$LeakedPatHash = 'A2B4E0C3F8D1B5E2A6F7C0D9B3E5A1F8C4D6B2A9E7F1C5D3B8A4E2F6C0D9B5A3E'  # placeholder
$envTokenHash = [System.BitConverter]::ToString(
    [System.Security.Cryptography.SHA256]::Create().ComputeHash(
        [System.Text.Encoding]::UTF8.GetBytes($env:GH_TOKEN)
    )
).Replace('-','')
if ($env:GH_TOKEN -and $env:GH_TOKEN.StartsWith('ghp_') -and $envTokenHash -eq $LeakedPatHash) {
    Write-Host 'WARNING: reusing a token that was previously pasted into chat logs.' -ForegroundColor Yellow
    Write-Host 'Recommendation: revoke at https://github.com/settings/tokens AFTER' -ForegroundColor Yellow
    Write-Host 'this push completes.' -ForegroundColor Yellow
}

# Ensure git is configured so the first commit is not anonymous.
if (-not (git config user.name))     { git config user.name  'leoliu' }
if (-not (git config user.email))    { git config user.email '[email protected]' }

# 1. Create the repository if it does not exist yet (idempotent).
$headers = @{
    'Authorization'        = "Bearer $env:GH_TOKEN"
    'Accept'               = 'application/vnd.github+json'
    'X-GitHub-Api-Version' = '2022-11-28'
}
$body = @{
    name        = $RepoName
    description = 'ReMix 共鸣 · 霓光回响 — Three.js rhythm survival tribute'
    private     = [bool]($Visibility -eq 'private')
    auto_init   = $false
} | ConvertTo-Json -Depth 5

$repoUrl = "https://api.github.com/repos/$Owner/$RepoName"
$createUrl = "https://api.github.com/user/repos"
$existing = $null
try {
    $existing = Invoke-RestMethod -Method Get -Uri $repoUrl -Headers $headers -TimeoutSec 20
    Write-Host "Repository already exists: $($existing.html_url)"
} catch {
    Write-Host "Creating $Visibility repository $Owner/$RepoName ..."
    Invoke-RestMethod -Method Post -Uri $createUrl -Headers $headers -Body $body -TimeoutSec 20 | Out-Null
    $existing = Invoke-RestMethod -Method Get -Uri $repoUrl -Headers $headers -TimeoutSec 20
}

# 2. Configure the remote (idempotent).
$remote = "https://github.com/$Owner/$RepoName.git"
$existingRemote = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    git remote add origin $remote
    Write-Host "Added origin -> $remote"
} elseif ($existingRemote -ne $remote) {
    git remote set-url origin $remote
    Write-Host "Updated origin -> $remote"
} else {
    Write-Host "Origin already set: $existingRemote"
}

# 3. Pre-flight: ensure there is something to commit and Pages workflow is wired.
$required = @(
    'dist/index.html',
    'dist/main.js',
    'dist/vendor/three.module.js',
    '.github/workflows/pages.yml',
    '.github/workflows/ci.yml',
    'package.json',
    'LICENSE',
    'README.md'
)
foreach ($f in $required) {
    if (-not (Test-Path $f)) { throw "Missing required file: $f" }
}

# 4. Stage and commit (only if there is something new).
git add -A
$status = git status --porcelain
if ($status) {
    git commit -m $CommitMsg
    if ($LASTEXITCODE -ne 0) { throw "git commit failed" }
} else {
    Write-Host "Working tree clean, nothing to commit."
}

# 5. Push with the token in the URL only for this one command.
$authRemote = "https://x-access-token:$($env:GH_TOKEN)@github.com/$Owner/$RepoName.git"
git push $authRemote "HEAD:refs/heads/$Branch" --follow-tags --set-upstream
if ($LASTEXITCODE -ne 0) { throw "git push failed" }

# 6. Make sure the remote in git config is the clean URL (no token).
git remote set-url origin $remote

Write-Host ""
Write-Host "Push complete. Live URL will be ready in 1-2 minutes:"
Write-Host "  https://$Owner.github.io/$RepoName/"
Write-Host ""
Write-Host "If the page shows 404, go to the repo -> Settings -> Pages and"
Write-Host "confirm Source is 'GitHub Actions', then click 'Approve' on the"
Write-Host "github-pages environment for the latest workflow run."
