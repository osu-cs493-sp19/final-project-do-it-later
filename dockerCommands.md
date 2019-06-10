# Docker Commands

Creates containers that aren't created yet, starts them if they have been created -d detaches terminal so you can use it again

    docker-compose up -d

Stops all the containers that were brought up by earlier up command

    docker-compose stop

Stops all the containers and removes them

    docker-compose down

Rebuilds all images, including MySQL

    docker-compose build

Kill all docker containers

    docker kill $(docker ps -q)

**Ultimate fix:** Stops and removes everything (including volumes), then builds from scratch, and then starts (`sudo` every command if needed)

    docker-compose down -v && docker-compose build && docker-compose up

**Desperate fix:** (don't do this if you have other Docker projects running): Quits all Docker processes, deletes all containers and images, and starts from a clean slate

    docker kill $(docker ps -q); docker system prune -af; docker-compose up
