# Linux Magic Command

### Searching for Wifi
* sudo rfkill list (list wifi blocking situation)
* sudo rfkill unblock wifi
* lspci -nn  | grep 0280  (searching for wifi driver)
* iwconfig (wireless config)

### Getting SSL certificate, locally
openssl s_client -connect localhost:443 < /dev/null 2>/dev/null | openssl x509 -fingerprint -noout -in /dev/stdin

### Determine length of mp3 in microseconds
sox *.mp3 -n stat 

