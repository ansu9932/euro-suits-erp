$ErrorActionPreference = 'Stop'
$nativeFormat = '{00000000-0000-0000-0000-000000000000}'
$jpeg = '{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}'
$phase = 'discovery'

function Find-Property($properties, [int]$id) {
    $properties | Where-Object PropertyID -eq $id | Select-Object -First 1
}

try {
    $manager = New-Object -ComObject WIA.DeviceManager
    $canon = $manager.DeviceInfos | Where-Object {
        $_.Type -eq 1 -and $_.Properties.Item('Name').Value -match 'GM(?:4000|4070)'
    } | Select-Object -First 1
    if (!$canon) { 'MISSING'; exit 0 }

    $phase = 'connect'
    $device = $canon.Connect()
    $phase = 'configure'
    $source = Find-Property $device.Properties 3088
    if (!$source) { 'UNSUPPORTED'; exit 0 }
    $source.Value = if ($env:ERP_SCAN_SOURCE -eq 'feeder') { 1 } else { 2 }
    $pages = Find-Property $device.Properties 3096
    if ($pages -and !$pages.IsReadOnly) { $pages.Value = 1 }

    $item = $device.Items.Item(1)
    for ($page = 1; $page -le [int]$env:ERP_SCAN_COUNT; $page++) {
        $phase = 'transfer'
        # Receive the driver's preferred format, then convert on the PC.
        $image = $item.Transfer($nativeFormat)
        $phase = 'save'
        if ($image.FormatID -ne $jpeg) {
            $process = New-Object -ComObject WIA.ImageProcess
            $process.Filters.Add($process.FilterInfos.Item('Convert').FilterID)
            $process.Filters.Item(1).Properties.Item('FormatID').Value = $jpeg
            $image = $process.Apply($image)
        }
        $path = Join-Path $env:ERP_SCAN_OUTPUT ('page-{0:D2}.jpg' -f $page)
        $temporaryPath = [System.IO.Path]::ChangeExtension($path, '.part.jpg')
        $image.SaveFile($temporaryPath)
        [System.IO.File]::Move($temporaryPath, $path)
    }
    'OK'
} catch {
    $failure = $_.Exception
    while ($failure.InnerException) { $failure = $failure.InnerException }
    $driverCode = '{0:X8}' -f $failure.HResult
    $kind = switch ($driverCode) {
        '80210003' { 'EMPTY' }
        { $_ -in '80210006', '80210007', '8021000D' } { 'BUSY' }
        { $_ -in '80210002', '80210004', '80210020' } { 'JAM' }
        { $_ -in '80210005', '80210008', '8021000A' } { 'OFFLINE' }
        '80210016' { 'COVER' }
        default { 'FAILED' }
    }
    '{0}:{1}:{2}' -f $kind, $phase, $driverCode
}
