param(
  [Parameter(Mandatory = $true)][string]$Text,
  [Parameter(Mandatory = $true)][string]$OutFile
)

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$ja = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'ja-JP' } | Select-Object -First 1
if ($ja) { $synth.SelectVoice($ja.VoiceInfo.Name) }
$synth.Rate = 0
$synth.SetOutputToWaveFile($OutFile)
$synth.Speak($Text)
$synth.Dispose()
