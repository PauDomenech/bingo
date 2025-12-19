$port=3000
$root=(Get-Location).Path
$listener=New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Output "Serving http://localhost:$port from $root"
while ($true) {
  $ctx=$listener.GetContext()
  $req=$ctx.Request
  $path=$req.Url.LocalPath.TrimStart('/')
  if ($path -eq '') { $path='index.html' }
  $file=Join-Path $root $path
  if (-not (Test-Path $file)) {
    $ctx.Response.StatusCode=404
    $buf=[System.Text.Encoding]::UTF8.GetBytes('Not Found')
    $ctx.Response.OutputStream.Write($buf,0,$buf.Length)
    $ctx.Response.Close()
    continue
  }
  $bytes=[System.IO.File]::ReadAllBytes($file)
  $ext=[IO.Path]::GetExtension($file).ToLower()
  $type=switch ($ext){'.html'{'text/html'}'.css'{'text/css'}'.js'{'application/javascript'}'.png'{'image/png'}'.jpg'{'image/jpeg'}'.mp3'{'audio/mpeg'}default{'application/octet-stream'}}
  $ctx.Response.ContentType=$type
  $ctx.Response.ContentLength64=$bytes.Length
  $ctx.Response.OutputStream.Write($bytes,0,$bytes.Length)
  $ctx.Response.Close()
}
