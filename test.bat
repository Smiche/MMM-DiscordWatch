docker run  -d ^
    --publish 8089:8080 ^
    --restart always  ^
    --volume D:/magic_mirror/config:/opt/magic_mirror/config ^
    --volume D:/magic_mirror/modules:/opt/magic_mirror/modules ^
    --name magic_mirror ^
    bastilimbach/docker-magicmirror