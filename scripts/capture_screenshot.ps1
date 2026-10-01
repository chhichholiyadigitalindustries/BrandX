$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$outPath = "C:\Users\Abhishek\.gemini\antigravity-ide\brain\edc1926e-cd5a-42df-b81d-a677822a6fa3\brandx_posters_mobile.png"
& $adb -s 10BF9405SZ000SP shell screencap -p /sdcard/brandx_screen.png
& $adb -s 10BF9405SZ000SP pull /sdcard/brandx_screen.png $outPath
& $adb -s 10BF9405SZ000SP shell rm /sdcard/brandx_screen.png
Write-Host "Screenshot saved: $outPath, Size: $((Get-Item $outPath).Length) bytes"
