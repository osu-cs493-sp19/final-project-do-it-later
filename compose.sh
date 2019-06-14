#!/bin/bash
# One line to compose them all.
# Run as a super user if permission is denied.

# Echoes the command in bold font before executing it. Just a nice way to see
# what commands are being executed.
exe() {
  echo -e "\n\033[1m$@\033[0m"
  "$@"
}

# take down current compose, including volumes
exe docker-compose down -v

# compose MySQL in detached mode
exe docker-compose up -d mysql

# compose MongoDB in detached mode
exe docker-compose up -d mongodb

# # put stuff that needs to be composed before running the API server here
# # for example, compose RabbitMQ in detached mode
# echo
# exe docker-compose up -d rabbitmq

# when all dependencies are ready, build and compose up everything
exe docker-compose build
exe docker-compose up
