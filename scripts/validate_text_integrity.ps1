$ErrorActionPreference = 'Stop'
$excluded = @('.git', 'node_modules', 'dist', '.secrets', '.supabase', '.temp')
$extensions = @('.md', '.json', '.ts', '.tsx', '.js', '.css', '.html', '.yml', '.yaml', '.toml', '.sql', '.ps1', '.txt', '.example', '.editorconfig', '.gitattributes', '.gitignore')
$failures = @()

Get-ChildItem -File -Recurse | Where-Object {
  $pathParts = $_.FullName.Substring((Get-Location).Path.Length).Split([IO.Path]::DirectorySeparatorChar)
  -not ($pathParts | Where-Object { $excluded -contains $_ }) -and ($extensions -contains $_.Extension -or $_.Name.StartsWith('.'))
} | ForEach-Object {
  $bytes = [IO.File]::ReadAllBytes($_.FullName)
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { $failures += "$($_.FullName): UTF-8 BOM" }
  try { $text = [Text.UTF8Encoding]::new($false, $true).GetString($bytes) } catch { $failures += "$($_.FullName): invalid UTF-8"; return }
  if ($text.Contains("`r")) { $failures += "$($_.FullName): CRLF/CR line endings" }
  if ($bytes.Length -gt 0 -and -not $text.EndsWith("`n")) { $failures += "$($_.FullName): missing final newline" }
  if ($text.Contains([char]0xFFFD)) { $failures += "$($_.FullName): replacement character" }
}

if ($failures.Count) { $failures | ForEach-Object { Write-Error $_ }; exit 1 }
Write-Output 'Text integrity: PASS (UTF-8 without BOM, LF, final newline)'
