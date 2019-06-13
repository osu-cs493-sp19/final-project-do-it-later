# final-project-do-it-later

## Team members

- Phi Luu ([philectron](https://github.com/philectron))
- Khuong Luu ([khashf](https://github.com/khashf))
- Aidan Grimshaw ([thegrims](https://github.com/thegrims))

## Docker Commands HOWTOs

### Reccomended way

Use `compose.sh` script file in the root directory of this project

    ./compose.sh

Use `sudo chmod +x ./compose.sh` if permission to execute the script is denied

### Troubleshooting

Stops all the containers that were brought up by earlier up command. This is usually helpful when you forgot to stop containers that somehow ended up causing the problem.

    docker-compose stop

Like above, but also remove those containers

    docker-compose down

Kill all docker containers. This is helpful for cleaning up remnants of previous assignments

    docker kill $(docker ps -q)

Rebuilds all images, including MySQL

    docker-compose build

Creates containers that aren't created yet, starts them if they have been created `-d` detaches terminal so you can use it again

    docker-compose up -d

**Ultimate fix:** Stops and removes everything (including volumes), then builds from scratch, and then starts (`sudo` every command if needed)

    docker-compose down -v && docker-compose build && docker-compose up

**Desperate fix:** (don't do this if you have other Docker projects running) Quits all Docker processes, deletes all containers and images, and starts from a clean slate

    docker kill $(docker ps -q); docker system prune -af; docker-compose up
