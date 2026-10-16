# Wrapper script shipped inside the Palimpsest Windows install
# (<INSTDIR>\resources\cli\bin\ps.ps1). PowerShell sibling of ps.cmd for
# hosts that resolve .ps1 ahead of .cmd (or where cmd.exe is unavailable).
# Re-uses the bundled Electron runtime as a Node host via
# ELECTRON_RUN_AS_NODE=1 - no separate Node install required.

$installDir = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
$electron = @('Palimpsest.exe', 'Palimpsest Beta.exe') |
  ForEach-Object { Join-Path $installDir $_ } |
  Where-Object { Test-Path $_ } |
  Select-Object -First 1
$cli = Join-Path $PSScriptRoot '..\dist\cli.mjs'

if (-not $electron -or -not (Test-Path $cli)) {
  # Mirrors ps.sh / ps.cmd's ps-bundle-missing contract: two-line stderr
  # (human-readable + machine-readable JSON), exit 69 (EX_UNAVAILABLE).
  [Console]::Error.WriteLine('Palimpsest has been removed. Reinstall from the Palimpsest installer.')
  $psInitCommand = 'ps init'
  if ($env:PS_CHANNEL -ieq 'beta' -or [IO.Path]::GetFileNameWithoutExtension($PSCommandPath) -like '*-beta') {
    $psInitCommand = 'ps-beta init'
  }
  [Console]::Error.WriteLine('{"error":"ps-bundle-missing","hint":"Palimpsest app appears to have been removed. Reinstall it, or remove Palimpsest entries from your MCP config and rerun ' + $psInitCommand + '."}')
  exit 69
}

# Sanitize NODE_OPTIONS (VS Code pattern; mirrors ps.sh) - re-export under a
# scoped name so the CLI can opt to honor them explicitly.
$env:PS_NODE_OPTIONS = $env:NODE_OPTIONS
Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue

$env:ELECTRON_RUN_AS_NODE = '1'
& $electron $cli @args
exit $LASTEXITCODE
