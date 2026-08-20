# ===========================================================
# WDSX Build Tool
# Inline all css/js source files into index.html (single file).
# The single-file index.html can be run by double-click (file://).
# Usage: powershell -File build.ps1
# ===========================================================
Add-Type -AssemblyName System.IO

$root = $PSScriptRoot
$tplPath = [System.IO.Path]::Combine($root, '_template.html')

if (-not [System.IO.File]::Exists($tplPath)) {
  Write-Output 'ERROR: _template.html not found'
  exit 1
}

$html = [System.IO.File]::ReadAllText($tplPath, [System.Text.Encoding]::UTF8)

# Inline CSS
$cssPath = [System.IO.Path]::Combine($root, 'css', 'style.css')
if (-not [System.IO.File]::Exists($cssPath)) { Write-Output 'ERROR: css/style.css not found'; exit 1 }
$css = [System.IO.File]::ReadAllText($cssPath, [System.Text.Encoding]::UTF8)
$html = $html.Replace('<link rel="stylesheet" href="css/style.css">', '<style>' + $css + '</style>')

# Inline JS
$jsFiles = @(
  'js/core/rng.js', 'js/core/state.js', 'js/core/save.js',
  'js/data/professions.js', 'js/data/pools.js',
  'js/data/keywords.js', 'js/data/pets.js',
  'js/data/achievements.js',
  'js/data/materials.js',
  'js/data/meta.js', 'js/data/characters.js', 'js/data/skins.js', 'js/data/challenges.js', 'js/data/explore.js',
  'js/data/nations/qingqiu.js', 'js/data/nations/yumin.js', 'js/data/nations/yanhuo.js',
  'js/data/nations/xuanyuan.js', 'js/data/nations/xuangu.js', 'js/data/nations/huantou.js', 'js/data/nations/sanshou.js', 'js/data/nations/nieer.js', 'js/data/nations/daren.js', 'js/data/nations/baimin.js', 'js/data/nations/changgu.js', 'js/data/nations/zhurao.js', 'js/data/nations/jiaojing.js', 'js/data/nations/rouli.js', 'js/data/nations/shenmu.js', 'js/data/nations/wuchang.js', 'js/data/nations/yimu.js', 'js/data/nations/jiexiong.js', 'js/data/nations/qizhong.js', 'js/data/nations/guixu.js', 'js/data/nations/index.js',
  'js/core/engine.js', 'js/core/battle.js', 'js/app.js'
)
$inline = ''
foreach ($rel in $jsFiles) {
  $abs = [System.IO.Path]::Combine($root, $rel.Replace('/', '\'))
  if ([System.IO.File]::Exists($abs)) {
    $code = [System.IO.File]::ReadAllText($abs, [System.Text.Encoding]::UTF8)
    $inline += "/* ===== $rel ===== */`n" + $code + "`n"
  } else {
    Write-Output ('WARN: missing ' + $rel)
  }
}
$html = [System.Text.RegularExpressions.Regex]::Replace($html, '<script src="[^"]*"></script>', '')
$html = $html.Replace('</body>', '<script>' + $inline + '</script></body>')

$outPath = [System.IO.Path]::Combine($root, 'index.html')
[System.IO.File]::WriteAllText($outPath, $html, [System.Text.Encoding]::UTF8)
Write-Output ('BUILD OK: index.html = ' + [System.IO.FileInfo]::new($outPath).Length + ' bytes')
